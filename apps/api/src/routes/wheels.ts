import type { Express } from 'express';
import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { mapRingRow, mapActivityRow } from './mappers';

export function registerWheelRoutes(app: Express, db: Database.Database) {
  app.post('/wheels', (req, res) => {
    const { title, year } = req.body;
    const id = randomUUID();
    db.prepare('INSERT INTO wheels (id, title, year) VALUES (?, ?, ?)').run(id, title, year);
    res.status(201).json({ id, title, year, rings: [], activities: [] });
  });

  app.get('/wheels/:id', (req, res) => {
    const wheel = db.prepare('SELECT * FROM wheels WHERE id = ?').get(req.params.id) as any;
    if (!wheel) return res.status(404).json({ error: 'not found' });

    const ringRows = db.prepare('SELECT * FROM rings WHERE wheel_id = ? ORDER BY order_index').all(wheel.id);
    const ringIds = ringRows.map((r: any) => r.id);
    const activityRows =
      ringIds.length === 0
        ? []
        : db
            .prepare(`SELECT * FROM activities WHERE ring_id IN (${ringIds.map(() => '?').join(',')})`)
            .all(...ringIds);

    res.json({
      id: wheel.id,
      title: wheel.title,
      year: wheel.year,
      rings: ringRows.map(mapRingRow),
      activities: activityRows.map(mapActivityRow),
    });
  });
}
