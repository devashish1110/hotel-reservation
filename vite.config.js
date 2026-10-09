import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves a project site from /<repo>/, so the built asset URLs
// need that prefix. The dev server stays at / so local work is unaffected.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/hotel-reservation/' : '/',
}))
