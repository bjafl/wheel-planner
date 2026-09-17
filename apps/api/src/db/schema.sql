CREATE TABLE IF NOT EXISTS wheels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rings (
  id TEXT PRIMARY KEY,
  wheel_id TEXT NOT NULL REFERENCES wheels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  ring_id TEXT NOT NULL REFERENCES rings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('range', 'milestone')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  recurrence_rule TEXT,
  lane INTEGER NOT NULL DEFAULT 0,
  color TEXT
);
