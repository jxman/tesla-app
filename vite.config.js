import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // ESBuild configuration to handle .js files as JSX
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },

  // Optimize dependencies handling
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },

  // Development server configuration
  server: {
    port: 3000,
    open: false, // Don't auto-open browser (Tesla browser compatibility)
    host: true, // Listen on all addresses
  },

  // Build configuration
  build: {
    outDir: 'build', // Keep same output directory as CRA for Netlify
    sourcemap: false,
    // Target modern browsers (Tesla uses Chromium)
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'icons': ['react-icons'],
        }
      }
    }
  },

  // CSS configuration
  css: {
    postcss: './postcss.config.js'
  },

  // Define environment variable prefix
  envPrefix: 'VITE_',

  // Ensure public directory is correctly referenced
  publicDir: 'public',
})
