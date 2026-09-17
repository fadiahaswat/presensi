// Declare injected constants from vite.config.ts
declare const __APP_VERSION__: string | undefined;
declare const __BUILD_TIMESTAMP__: number | undefined;

export const CURRENT_CLIENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0';
export const CURRENT_BUILD_TIMESTAMP = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : Date.now();

export interface VersionInfo {
  version: string;
  buildTime: number;
  releaseDate?: string;
}

export interface UpdateState {
  hasUpdate: boolean;
  checking: boolean;
  currentVersion: string;
  latestVersion: string | null;
  lastCheckedAt: number | null;
  error?: string | null;
}

type UpdateListener = (state: UpdateState) => void;

class UpdateManager {
  private listeners: Set<UpdateListener> = new Set();
  private state: UpdateState = {
    hasUpdate: false,
    checking: false,
    currentVersion: CURRENT_CLIENT_VERSION,
    latestVersion: null,
    lastCheckedAt: null,
    error: null,
  };
  private checkIntervalTimer: any = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isRefreshing: boolean = false;

  constructor() {
    this.initServiceWorkerListener();
  }

  private initServiceWorkerListener() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Listen for controlling service worker change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (this.isRefreshing) return;
      // When a new SW takes over and we marked update, trigger reload
      console.log('[UpdateManager] Service Worker controller changed');
    });

    // Check existing registration
    navigator.serviceWorker.ready.then((reg) => {
      this.swRegistration = reg;
      if (reg.waiting) {
        this.notifyHasUpdate(null);
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version installed in background!
            this.notifyHasUpdate(null);
          }
        });
      });
    }).catch((err) => {
      console.log('[UpdateManager] SW ready warning:', err);
    });
  }

  public getState(): UpdateState {
    return this.state;
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<UpdateState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[UpdateManager] Listener error:', err);
      }
    });
  }

  private notifyHasUpdate(latestVersion: string | null) {
    this.updateState({
      hasUpdate: true,
      latestVersion: latestVersion || this.state.latestVersion || 'Terbaru',
      error: null,
    });
  }

  /**
   * Check for remote updates by querying version.json and triggering SW update check.
   */
  public async checkForUpdate(manual: boolean = false): Promise<boolean> {
    if (this.state.checking) return this.state.hasUpdate;

    this.updateState({ checking: true, error: null });

    try {
      // 1. Tell ServiceWorker to check for updates if available
      if (this.swRegistration) {
        try {
          await this.swRegistration.update();
          if (this.swRegistration.waiting) {
            this.notifyHasUpdate(null);
            this.updateState({ checking: false, lastCheckedAt: Date.now() });
            return true;
          }
        } catch (swErr) {
          console.warn('[UpdateManager] SW update check warning:', swErr);
        }
      }

      // 2. Fetch remote version.json with aggressive cache-busting
      const timestamp = Date.now();
      // Use Vite's BASE_URL (defaults to '/') or compute from location
      const base = import.meta.env?.BASE_URL || '/';
      const cleanBase = base.endsWith('/') ? base : `${base}/`;
      const versionUrl = `${cleanBase}version.json?_t=${timestamp}`;

      const response = await fetch(versionUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      
      // If server returned HTML (like 404 falling back to index.html with <!DOCTYPE html>), ignore it safely
      if (!contentType.includes('application/json') && text.trim().startsWith('<')) {
        // Not a JSON response, likely SPA fallback during dev or missing version.json
        this.updateState({ checking: false, lastCheckedAt: Date.now() });
        return false;
      }

      const data: VersionInfo = JSON.parse(text);
      const isRemoteNewer = (data.buildTime && data.buildTime > CURRENT_BUILD_TIMESTAMP) ||
        (data.version && data.version !== CURRENT_CLIENT_VERSION);

      if (isRemoteNewer) {
        this.updateState({
          hasUpdate: true,
          latestVersion: data.version,
          checking: false,
          lastCheckedAt: Date.now(),
        });
        return true;
      } else {
        this.updateState({
          checking: false,
          lastCheckedAt: Date.now(),
        });
        return false;
      }
    } catch (err: any) {
      // If error is due to network or aborted, don't spam console
      if (manual) {
        console.warn('[UpdateManager] Check update warning:', err);
      }
      this.updateState({
        checking: false,
        error: manual ? 'Gagal memeriksa pembaruan (offline atau gangguan jaringan)' : null,
      });
      return false;
    }
  }

  /**
   * Start periodic background checking (e.g. Every 10 minutes, and on window focus/visibility)
   */
  public startPeriodicCheck(intervalMs = 10 * 60 * 1000) {
    if (this.checkIntervalTimer) return;

    // Initial check after 3 seconds so it doesn't block initial render
    setTimeout(() => {
      this.checkForUpdate(false);
    }, 3000);

    this.checkIntervalTimer = setInterval(() => {
      this.checkForUpdate(false);
    }, intervalMs);

    // Also check when app comes to foreground / user refocuses tab (throttled to at most once every 60 seconds)
    if (typeof document !== 'undefined') {
      let lastForegroundCheck = 0;
      const throttledCheck = () => {
        const now = Date.now();
        if (now - lastForegroundCheck > 60000) {
          lastForegroundCheck = now;
          this.checkForUpdate(false);
        }
      };

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          throttledCheck();
        }
      });
      window.addEventListener('focus', throttledCheck);
    }
  }

  /**
   * Perform HARD REFRESH:
   * 1. Clear Service Worker caches
   * 2. Tell Service Worker to skipWaiting
   * 3. Unregister or reload with cache-busting timestamp
   */
  public async performHardRefresh(): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      // 1. Tell active or waiting SW to skip waiting
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          if (registration.active) {
            registration.active.postMessage({ type: 'CLEAR_CACHES' });
          }
        }
      }

      // 2. Clear browser CacheStorage directly
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (e) {
          console.warn('[UpdateManager] Failed to clear window caches:', e);
        }
      }

      // 3. Small grace period for caches to clear, then hard reload
      setTimeout(() => {
        // Append a cache-buster query or hash to bypass HTTP cache
        const url = new URL(window.location.href);
        url.searchParams.set('_v', Date.now().toString());
        window.location.replace(url.toString());
      }, 250);
    } catch (e) {
      console.error('[UpdateManager] Hard refresh failed, falling back to location.reload(true):', e);
      window.location.reload();
    }
  }
}

export const updateManager = new UpdateManager();
