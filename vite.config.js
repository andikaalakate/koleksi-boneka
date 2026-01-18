import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from "url";
import autoprefixer from 'autoprefixer';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      manifestFilename: 'site.webmanifest',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {},
      workbox: {
        runtimeCaching: []
      }
    }),    
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => ['box-icon'].includes(tag)
        }
      }
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
      "@components": fileURLToPath(
        new URL("./src/components", import.meta.url),
      ),
      "@views": fileURLToPath(new URL("./src/views", import.meta.url)),
      "@libs": fileURLToPath(new URL("./src/libs", import.meta.url)),
    },
  },
  build: {
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: false,
  },
})
