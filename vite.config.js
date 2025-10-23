import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { visualizer } from 'rollup-plugin-visualizer';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    sveltekit(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Build optimization
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split large vendor libraries (Tauri APIs are external, skip them)
          if (id.includes('node_modules')) {
            if (id.includes('@mdi/js')) {
              return 'mdi-icons';
            }
            if (id.includes('zod')) {
              return 'validation';
            }
            if (id.includes('@jamescoyle/svelte-icon')) {
              return 'svelte-icon';
            }
            // Group all other node_modules into vendor
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase to 600KB (still reasonable after splitting)
  },
}));
