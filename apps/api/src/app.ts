import express from 'express';
import { getDb } from './db/client';
import { registerWheelRoutes } from './routes/wheels';
import { registerRingRoutes } from './routes/rings';
import { registerActivityRoutes } from './routes/activities';

export function buildApp(dbPath?: string) {
  const app = express();
  app.use(express.json());
  const db = getDb(dbPath);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  registerWheelRoutes(app, db);
  registerRingRoutes(app, db);
  registerActivityRoutes(app, db);

  return app;
}
