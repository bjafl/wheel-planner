import type { Express } from 'express';
import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { mapActivityRow } from './mappers';

export function registerActivityRoutes(app: Express, db: Database.Database) {
  app.post('/wheels/:wheelId/activities', (req, res) => {
    const { ringId, title, notes, kind, startDate, endDate, recurrenceRule, lane, color } = req.body;
    const id = randomUUID();
    db.prepare(
      `INSERT INTO activities (id, ring_id, title, notes, kind, start_date, end_date, recurrence_rule, lane, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, ringId, title, notes, kind, startDate, endDate, recurrenceRule ? JSON.stringify(recurrenceRule) : null, lane, color);
    res.status(201).json(mapActivityRow({
      id, ring_id: ringId, title, notes, kind, start_date: startDate, end_date: endDate,
      recurrence_rule: recurrenceRule ? JSON.stringify(recurrenceRule) : null, lane, color,
    }));
  });

  app.put('/activities/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: 'not found' });
    const merged = { ...mapActivityRow(existing), ...req.body };
    db.prepare(
      `UPDATE activities SET title = ?, notes = ?, kind = ?, start_date = ?, end_date = ?, recurrence_rule = ?, lane = ?, color = ?
       WHERE id = ?`
    ).run(
      merged.title, merged.notes, merged.kind, merged.startDate, merged.endDate,
      merged.recurrenceRule ? JSON.stringify(merged.recurrenceRule) : null, merged.lane, merged.color,
      req.params.id
    );
    res.json(merged);
  });

  app.delete('/activities/:id', (req, res) => {
    db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });
}
