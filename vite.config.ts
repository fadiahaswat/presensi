import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Generate a build timestamp version for cache busting and update notifications
const buildTimestamp = Date.now();
const appVersion = "2.0." + Math.floor(buildTimestamp / 1000);

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function versionGeneratorPlugin() {
  const versionData = {
    version: appVersion,
    buildTime: buildTimestamp,
    releaseDate: new Date().toISOString()
  };

  return {
    name: 'generate-version-json',
    buildStart() {
      // Create version.json in public folder during dev / build
      try {
        fs.writeFileSync(
          path.resolve(__dirname, 'public/version.json'),
          JSON.stringify(versionData, null, 2)
        );
      } catch (err) {
        console.warn('Failed to write public/version.json', err);
      }
    },
    configureServer(server) {
      // Explicitly serve /version.json in dev server
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url === '/version.json' || req.url.startsWith('/version.json?'))) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.end(JSON.stringify(versionData));
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  server: {
    host: true,
    port: 5175,
  },
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
  },
  plugins: [
    figmaAssetResolver(),
    versionGeneratorPlugin(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('motion')) {
              return 'vendor-motion';
            }
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            return 'vendor-core';
          }
          if (id.includes('src/app/data/santriData')) {
            return 'data-santri';
          }
          if (id.includes('src/app/data/kalenderPendidikanData')) {
            return 'data-kalender';
          }
        },
      },
    },
  },
})
