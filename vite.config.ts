import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { sites } from './build/sites-vite-plugin.ts'

export default defineConfig({
  plugins: [react(), sites(), cloudflare()],
})
