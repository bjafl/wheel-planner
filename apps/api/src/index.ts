import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  // Shared monorepo-root .env (see .env.example) — optional, so a fresh
  // checkout without one still runs on the defaults below.
  process.loadEnvFile(path.resolve(__dirname, '../../../.env'));
} catch {
  // No .env present; fall through to the defaults.
}

const HOST = process.env.API_HOST || 'localhost';
const PORT = Number(process.env.API_PORT) || 3001;

const app = buildApp();
app.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`);
});
