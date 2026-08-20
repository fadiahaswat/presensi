// Rate Limiting Utilities
import { RATE_LIMITS } from "../config/envConfig";

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.lockedUntil && entry.lockedUntil < now) {
      rateLimitStore.delete(key);
    } else if (entry.firstAttempt < now - RATE_LIMITS.LOGIN_LOCKOUT_DURATION * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export function checkRateLimit(action: string, identifier: string): { allowed: boolean; remainingAttempts: number; lockedUntil?: number } {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  // Initialize or reset if lockout expired
  if (!entry || (entry.lockedUntil && entry.lockedUntil < now)) {
    entry = { count: 0, firstAttempt: now };
    rateLimitStore.set(key, entry);
  }

  // Check if currently locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: entry.lockedUntil,
    };
  }

  const maxAttempts = action === "login" ? RATE_LIMITS.MAX_LOGIN_ATTEMPTS : RATE_LIMITS.PRESENSI_RATE_LIMIT;
  const remaining = Math.max(0, maxAttempts - entry.count);

  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    lockedUntil: entry.lockedUntil,
  };
}

export function recordAttempt(action: string, identifier: string): { locked: boolean; lockedUntil?: number } {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry) {
    entry = { count: 0, firstAttempt: now };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  const maxAttempts = action === "login" ? RATE_LIMITS.MAX_LOGIN_ATTEMPTS : RATE_LIMITS.PRESENSI_RATE_LIMIT;

  if (entry.count >= maxAttempts) {
    entry.lockedUntil = now + RATE_LIMITS.LOGIN_LOCKOUT_DURATION;
    return { locked: true, lockedUntil: entry.lockedUntil };
  }

  return { locked: false };
}

export function resetRateLimit(action: string, identifier: string): void {
  const key = `${action}:${identifier}`;
  rateLimitStore.delete(key);
}

export function getRateLimitStatus(action: string, identifier: string): { attempts: number; locked: boolean; lockedUntil?: number } {
  const key = `${action}:${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return { attempts: 0, locked: false };
  }

  const now = Date.now();
  const isLocked = entry.lockedUntil && entry.lockedUntil > now;

  return {
    attempts: entry.count,
    locked: !!isLocked,
    lockedUntil: isLocked ? entry.lockedUntil : undefined,
  };
}
