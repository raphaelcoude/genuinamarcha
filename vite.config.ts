import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function sitesWorker(): Plugin {
  return {
    name: 'genuina-sites-worker',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'server/index.js',
        source: `export default {\n  async fetch(request, env) {\n    return env.ASSETS.fetch(request)\n  }\n}\n`,
      })
    },
  }
}

export default defineConfig({ plugins: [react(), sitesWorker()] })
