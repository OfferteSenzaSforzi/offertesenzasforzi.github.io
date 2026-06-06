import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        privacyPolicy: new URL('./privacy-policy.html', import.meta.url).pathname,
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
