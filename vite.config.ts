import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import replace from '@rollup/plugin-replace'
import postcss from 'rollup-plugin-postcss'
import { viteSingleFile } from 'vite-plugin-singlefile'
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'biaopan_sni',
      fileName: 'biaopan_sni',
      formats: ['iife'],
    },
    cssCodeSplit: false,
    rollupOptions: {
      plugins: [
        replace({
          'process.env.NODE_ENV': JSON.stringify('production'),
          preventAssignment: true,
        }),
      ],
    },
  },
})
