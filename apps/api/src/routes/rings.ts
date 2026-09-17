import type { Express } from 'express';
import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { mapRingRow } from './mappers';

export function registerRingRoutes(app: Express, db: Database.Database) {
  app.post('/wheels/:wheelId/rings', (req, res) => {
    const { name, color, orderIndex } = req.body;
    const id = randomUUID();
    db.prepare('INSERT INTO rings (id, wheel_id, name, order_index, color) VALUES (?, ?, ?, ?, ?)').run(
      id,
      req.params.wheelId,
      name,
      orderIndex,
      color
    );
    res.status(201).json(mapRingRow({ id, wheel_id: req.params.wheelId, name, order_index: orderIndex, color }));
  });

  app.put('/wheels/:wheelId/rings/:ringId', (req, res) => {
    const existing = db.prepare('SELECT * FROM rings WHERE id = ?').get(req.params.ringId) as any;
    if (!existing) return res.status(404).json({ error: 'not found' });
    const merged = { ...existing, ...req.body };
    db.prepare('UPDATE rings SET name = ?, order_index = ?, color = ? WHERE id = ?').run(
      merged.name,
      merged.orderIndex ?? merged.order_index,
      merged.color,
      req.params.ringId
    );
    res.json(mapRingRow({ ...merged, order_index: merged.orderIndex ?? merged.order_index }));
  });

  app.delete('/wheels/:wheelId/rings/:ringId', (req, res) => {
    db.prepare('DELETE FROM rings WHERE id = ?').run(req.params.ringId);
    res.status(204).send();
  });
}
