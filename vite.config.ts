import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // Polyfill: `bip39` references Node's `global` object. Map it to
    // `globalThis` so the browser doesn't throw ReferenceError.
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy HuggingFace CDN para evitar que Vite intercepte requests de modelos ONNX
      proxy: {
        '/Xenova': {
          target: 'https://huggingface.co',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/Xenova/, '/Xenova'),
        },
        '/onnx-community': {
          target: 'https://huggingface.co',
          changeOrigin: true,
        },
        '/huggingworld': {
          target: 'https://huggingface.co',
          changeOrigin: true,
        },
        // AI provider proxies (CORS bypass for browser-based API calls)
        '/api/nvidia': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/nvidia/, ''),
        },
        '/api/openrouter': {
          target: 'https://openrouter.ai',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/openrouter/, ''),
        },
        '/api/groq': {
          target: 'https://api.groq.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/groq/, ''),
        },
        '/api/google': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/google/, ''),
        },
      },
    },
  };
});
