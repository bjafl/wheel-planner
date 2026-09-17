import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import { getDb } from './client';

const TEST_DB = './test-client.sqlite';

afterEach(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('getDb', () => {
  it('creates the wheels, rings, and activities tables', () => {
    const db = getDb(TEST_DB);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((row: any) => row.name);
    expect(tables).toEqual(expect.arrayContaining(['wheels', 'rings', 'activities']));
    db.close();
  });

  it('is idempotent when called twice against the same file', () => {
    const first = getDb(TEST_DB);
    first.close();
    expect(() => getDb(TEST_DB).close()).not.toThrow();
  });
});
