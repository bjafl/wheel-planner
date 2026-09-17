import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Shared monorepo-root .env (see ../../.env.example), not just apps/web's
  // own directory, so HOST/PORT/API_HOST/API_PORT are configured in one place.
  const rootDir = path.resolve(import.meta.dirname, '../..')
  const env = loadEnv(mode, rootDir, '')

  const host = env.HOST || 'localhost'
  const port = Number(env.PORT) || 5173
  const apiHost = env.API_HOST || 'localhost'
  const apiPort = Number(env.API_PORT) || 3001

  return {
    plugins: [react()],
    envDir: rootDir,
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      host,
      port,
      proxy: {
        '/wheels': `http://${apiHost}:${apiPort}`,
        '/activities': `http://${apiHost}:${apiPort}`,
      },
    },
  }
})
