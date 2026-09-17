# Årshjul-planlegger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal, single-user year-wheel planning tool: a radial SVG timeline for one calendar year where activities/milestones/recurring events live on category rings, editable both via a form panel and via direct drag interaction on the wheel itself.

**Architecture:** pnpm monorepo with two apps — `apps/web` (Vite + React + TypeScript + Tailwind + shadcn/ui, SVG rendering via `d3-shape`/`d3-scale`, state in Zustand) and `apps/api` (Express + `better-sqlite3`, plain REST/JSON, no ORM). A dependency-free `geometry/` module in the web app holds all date↔angle math, overlap/lane-packing, and recurrence expansion as pure functions operating on `Date` objects — no React, no ISO-string parsing inside geometry code; string↔Date conversion happens only at the API-client/store boundary.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, d3-shape, d3-scale, date-fns, @use-gesture/react, @floating-ui/react, @dnd-kit (sortable), Express, better-sqlite3, Vitest, @testing-library/react, supertest.

**Spec:** `docs/superpowers/specs/2026-09-17-arshjul-planlegger-design.md`

## Global Constraints

- Package manager is **pnpm** (workspaces), not npm/yarn.
- No ORM — raw SQL via `better-sqlite3`, schema applied idempotently at server boot (`CREATE TABLE IF NOT EXISTS`), not a migration framework.
- `geometry/` functions take and return `Date` objects only. ISO date strings (`'YYYY-MM-DD'`) are the wire/DB format; conversion happens at the store (frontend) and route handlers (backend), never inside `geometry/`.
- Lane values are computed client-side (in `geometry/lanePacking.ts`) and sent to the backend as part of the activity payload; the backend never recomputes lanes.
- IDs are generated with `crypto.randomUUID()` on the backend only (`node:crypto`); the frontend never invents IDs.
- One year per wheel, no multi-year view, no auth, no websockets, no undo/redo — all explicitly out of scope per the spec.
- Every task must leave `pnpm -w test` (or the relevant per-app test command) green before moving to the next task.

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)
- Create: `apps/web/` (via `pnpm create vite`)
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/index.ts`
- Create: `.gitignore`

**Interfaces:**
- Produces: a running `pnpm --filter web dev` (Vite dev server) and `pnpm --filter api dev` (Express server on port 3001) that later tasks build on.

- [ ] **Step 1: Create root workspace files**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
```

`package.json`:
```json
{
  "name": "wheel-planner",
  "private": true,
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",
    "test": "pnpm --filter web test:run && pnpm --filter api test"
  }
}
```

`.gitignore`:
```
node_modules
dist
*.sqlite
.env
```

- [ ] **Step 2: Scaffold the web app**

Run: `pnpm create vite apps/web -- --template react-ts`
Then `cd apps/web && pnpm add zustand d3-shape d3-scale date-fns @use-gesture/react @floating-ui/react @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
And: `pnpm add -D @types/d3-shape @types/d3-scale vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event`

Add to `apps/web/package.json` scripts: `"test": "vitest"`, `"test:run": "vitest run"`.

Create `apps/web/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 3: Scaffold the API app**

Create `apps/api/package.json`:
```json
{
  "name": "api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run"
  }
}
```

Run inside `apps/api`: `pnpm add express better-sqlite3` and `pnpm add -D typescript tsx @types/express @types/better-sqlite3 @types/node vitest supertest @types/supertest`

Create `apps/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

Create `apps/api/src/index.ts`:
```ts
import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
```

- [ ] **Step 4: Install workspace and verify both apps run**

Run: `pnpm install` (from repo root)
Run: `pnpm dev:web` — expect Vite dev server to start on a local port with the default template page reachable.
Stop it, then run: `pnpm dev:api` — expect `API listening on http://localhost:3001` and `curl http://localhost:3001/health` to return `{"status":"ok"}`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Scaffold pnpm monorepo with Vite/React web app and Express api skeleton"
```

---

## Task 2: Tailwind CSS + shadcn/ui in the web app

**Files:**
- Modify: `apps/web/tailwind.config.js`, `apps/web/postcss.config.js`, `apps/web/src/index.css`
- Create: `apps/web/components.json` (shadcn config)
- Create: `apps/web/src/lib/utils.ts` (shadcn's `cn` helper)
- Modify: `apps/web/src/App.tsx` (smoke-test render)

**Interfaces:**
- Produces: `cn()` helper at `apps/web/src/lib/utils.ts`, and shadcn components importable from `apps/web/src/components/ui/*` for later tasks (panel, tooltips).

- [ ] **Step 1: Install and initialize Tailwind**

In `apps/web`: `pnpm add -D tailwindcss postcss autoprefixer` then `npx tailwindcss init -p`

`apps/web/tailwind.config.js` — set `content: ["./index.html", "./src/**/*.{ts,tsx}"]`.

Replace contents of `apps/web/src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Initialize shadcn/ui**

Run: `npx shadcn@latest init` inside `apps/web`, accepting defaults (TypeScript, Tailwind, `src/components`, `src/lib/utils`).
Run: `npx shadcn@latest add button` as the first component to validate the pipeline.

- [ ] **Step 3: Smoke-test in App.tsx**

Replace `apps/web/src/App.tsx` with:
```tsx
import { Button } from '@/components/ui/button';

export default function App() {
  return (
    <div className="p-8">
      <Button>Årshjul</Button>
    </div>
  );
}
```

- [ ] **Step 4: Verify visually**

Run: `pnpm dev:web`, open the app in a browser, confirm the button renders with shadcn's default styling (rounded, padded, correct font) — not unstyled HTML.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add Tailwind CSS and shadcn/ui to the web app"
```

---

## Task 3: Shared domain types

**Files:**
- Create: `apps/web/src/types.ts`

**Interfaces:**
- Produces: `RecurrenceType`, `RecurrenceRule`, `ActivityKind`, `Activity`, `Ring`, `Wheel` — used by every later web-app task.

- [ ] **Step 1: Write the types file**

```ts
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number;
  until: string | null; // ISO date 'YYYY-MM-DD', inclusive
}

export type ActivityKind = 'range' | 'milestone';

export interface Activity {
  id: string;
  ringId: string;
  title: string;
  notes: string | null;
  kind: ActivityKind;
  startDate: string; // ISO date 'YYYY-MM-DD'
  endDate: string | null; // null when kind === 'milestone'
  recurrenceRule: RecurrenceRule | null;
  lane: number;
  color: string | null; // overrides the ring's color when set
}

export interface Ring {
  id: string;
  wheelId: string;
  name: string;
  orderIndex: number;
  color: string;
}

export interface Wheel {
  id: string;
  title: string;
  year: number;
  rings: Ring[];
  activities: Activity[];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/types.ts
git commit -m "Add shared domain types for wheel, ring, activity"
```

---

## Task 4: Geometry — date↔angle mapping

**Files:**
- Create: `apps/web/src/geometry/dateAngle.ts`
- Test: `apps/web/src/geometry/dateAngle.test.ts`

**Interfaces:**
- Produces: `dateToAngle(date: Date, year: number): number` and `angleToDate(angle: number, year: number, snapToDay?: boolean): Date`. Angle is in radians, `0` at Jan 1 00:00 of `year`, increasing clockwise through `2π` at the following Jan 1 — matches d3-shape's `arc()` angle convention directly (Task 9 depends on this).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { dateToAngle, angleToDate } from './dateAngle';

describe('dateToAngle', () => {
  it('maps Jan 1 to angle 0', () => {
    expect(dateToAngle(new Date(2026, 0, 1), 2026)).toBeCloseTo(0, 10);
  });

  it('maps July 2 (day 182, non-leap year) to half the circle', () => {
    // 2026 is not a leap year (365 days); day index 182 of 365
    const angle = dateToAngle(new Date(2026, 6, 2), 2026);
    expect(angle).toBeCloseTo((182 / 365) * 2 * Math.PI, 10);
  });

  it('accounts for leap years', () => {
    // 2028 is a leap year (366 days); Dec 31 is day index 365
    const angle = dateToAngle(new Date(2028, 11, 31), 2028);
    expect(angle).toBeCloseTo((365 / 366) * 2 * Math.PI, 10);
  });
});

describe('angleToDate', () => {
  it('is the inverse of dateToAngle for day-aligned dates', () => {
    const original = new Date(2026, 4, 17);
    const angle = dateToAngle(original, 2026);
    const roundTripped = angleToDate(angle, 2026);
    expect(roundTripped.getFullYear()).toBe(2026);
    expect(roundTripped.getMonth()).toBe(4);
    expect(roundTripped.getDate()).toBe(17);
  });

  it('normalizes angles outside [0, 2π)', () => {
    const angle = dateToAngle(new Date(2026, 0, 10), 2026);
    const roundTripped = angleToDate(angle + 2 * Math.PI, 2026);
    expect(roundTripped.getDate()).toBe(10);
  });

  it('rounds to the nearest day when snapToDay is true (default)', () => {
    const halfDayAngle = ((0.5) / 365) * 2 * Math.PI;
    const result = angleToDate(halfDayAngle, 2026, true);
    expect(result.getDate()).toBe(1); // rounds down to Jan 1
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm test:run dateAngle`
Expected: FAIL — `dateAngle.ts` does not exist yet.

- [ ] **Step 3: Implement**

```ts
import { differenceInCalendarDays, startOfYear, addDays, isLeapYear } from 'date-fns';

function yearLengthInDays(year: number): number {
  return isLeapYear(new Date(year, 0, 1)) ? 366 : 365;
}

export function dateToAngle(date: Date, year: number): number {
  const start = startOfYear(new Date(year, 0, 1));
  const totalDays = yearLengthInDays(year);
  const dayIndex = differenceInCalendarDays(date, start);
  return (dayIndex / totalDays) * 2 * Math.PI;
}

export function angleToDate(angle: number, year: number, snapToDay = true): Date {
  const start = startOfYear(new Date(year, 0, 1));
  const totalDays = yearLengthInDays(year);
  const twoPi = 2 * Math.PI;
  const normalized = ((angle % twoPi) + twoPi) % twoPi;
  const rawDayIndex = (normalized / twoPi) * totalDays;
  const dayIndex = snapToDay ? Math.round(rawDayIndex) : rawDayIndex;
  return addDays(start, dayIndex);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm test:run dateAngle`
Expected: PASS (all 6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/geometry/dateAngle.ts apps/web/src/geometry/dateAngle.test.ts
git commit -m "Add pure date-to-angle mapping for the wheel"
```

---

## Task 5: Geometry — lane packing

**Files:**
- Create: `apps/web/src/geometry/lanePacking.ts`
- Test: `apps/web/src/geometry/lanePacking.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure `Date`-based, standalone).
- Produces: `Laneable` interface and `assignLanes<T extends Laneable>(items: T[]): Array<T & { lane: number }>`. Task 8 (store) calls this before persisting activities; Task 10 (rendering) reads the `lane` field it produces.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { assignLanes, type Laneable } from './lanePacking';

function item(id: string, start: string, end: string): Laneable {
  return { id, startDate: new Date(start), endDate: new Date(end) };
}

describe('assignLanes', () => {
  it('puts non-overlapping items in lane 0', () => {
    const result = assignLanes([
      item('a', '2026-01-01', '2026-01-10'),
      item('b', '2026-01-11', '2026-01-20'),
    ]);
    expect(result.find((r) => r.id === 'a')?.lane).toBe(0);
    expect(result.find((r) => r.id === 'b')?.lane).toBe(0);
  });

  it('pushes an overlapping item to the next lane', () => {
    const result = assignLanes([
      item('a', '2026-01-01', '2026-01-20'),
      item('b', '2026-01-10', '2026-01-15'),
    ]);
    expect(result.find((r) => r.id === 'a')?.lane).toBe(0);
    expect(result.find((r) => r.id === 'b')?.lane).toBe(1);
  });

  it('reuses a freed lane once its occupant has ended', () => {
    const result = assignLanes([
      item('a', '2026-01-01', '2026-01-05'),
      item('b', '2026-01-01', '2026-01-31'),
      item('c', '2026-01-06', '2026-01-10'),
    ]);
    // b overlaps both a and c, so it must occupy its own lane throughout;
    // c starts after a ends, so c reuses a's lane (0).
    expect(result.find((r) => r.id === 'a')?.lane).toBe(0);
    expect(result.find((r) => r.id === 'b')?.lane).toBe(1);
    expect(result.find((r) => r.id === 'c')?.lane).toBe(0);
  });

  it('treats a milestone (startDate === endDate) as a zero-length interval', () => {
    const result = assignLanes([
      item('a', '2026-03-01', '2026-03-01'),
      item('b', '2026-03-01', '2026-03-01'),
    ]);
    expect(result.find((r) => r.id === 'a')?.lane).toBe(0);
    expect(result.find((r) => r.id === 'b')?.lane).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm test:run lanePacking`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
export interface Laneable {
  id: string;
  startDate: Date;
  endDate: Date;
}

export function assignLanes<T extends Laneable>(items: T[]): Array<T & { lane: number }> {
  const sorted = [...items].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const laneEndTimes: number[] = []; // laneEndTimes[i] = end time of the last item placed in lane i

  return sorted.map((item) => {
    const startTime = item.startDate.getTime();
    const endTime = item.endDate.getTime();

    let lane = laneEndTimes.findIndex((laneEnd) => laneEnd <= startTime);
    if (lane === -1) {
      lane = laneEndTimes.length;
    }
    laneEndTimes[lane] = endTime;

    return { ...item, lane };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm test:run lanePacking`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/geometry/lanePacking.ts apps/web/src/geometry/lanePacking.test.ts
git commit -m "Add greedy lane-packing for overlapping activities"
```

---

## Task 6: Geometry — recurrence expansion

**Files:**
- Create: `apps/web/src/geometry/recurrence.ts`
- Test: `apps/web/src/geometry/recurrence.test.ts`

**Interfaces:**
- Produces: `RecurrenceRuleInput` interface (`{ type: RecurrenceType; interval: number; until: Date | null }`) and `expandRecurrence(anchorDate: Date, rule: RecurrenceRuleInput, year: number): Date[]`. Task 10 (rendering) and Task 13 (drag-move of recurring activities) both call this.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { expandRecurrence } from './recurrence';

describe('expandRecurrence', () => {
  it('expands a monthly rule anchored in the target year', () => {
    const dates = expandRecurrence(
      new Date(2026, 0, 15),
      { type: 'monthly', interval: 1, until: null },
      2026
    );
    expect(dates).toHaveLength(12);
    expect(dates[0]).toEqual(new Date(2026, 0, 15));
    expect(dates[1]).toEqual(new Date(2026, 1, 15));
    expect(dates[11]).toEqual(new Date(2026, 11, 15));
  });

  it('expands a weekly rule with interval 2, anchored before the target year', () => {
    const dates = expandRecurrence(
      new Date(2025, 11, 25), // Dec 25, 2025, a Thursday
      { type: 'weekly', interval: 2, until: null },
      2026
    );
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) {
      expect(d.getFullYear()).toBe(2026);
    }
  });

  it('stops at the until date even mid-year', () => {
    const dates = expandRecurrence(
      new Date(2026, 0, 1),
      { type: 'monthly', interval: 1, until: new Date(2026, 2, 1) },
      2026
    );
    expect(dates).toEqual([new Date(2026, 0, 1), new Date(2026, 1, 1), new Date(2026, 2, 1)]);
  });

  it('returns an empty array when the rule never reaches the target year', () => {
    const dates = expandRecurrence(
      new Date(2020, 0, 1),
      { type: 'yearly', interval: 1, until: new Date(2021, 0, 1) },
      2026
    );
    expect(dates).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm test:run recurrence`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
import { addDays, addWeeks, addMonths, addYears, startOfYear, endOfYear } from 'date-fns';
import type { RecurrenceType } from '../types';

export interface RecurrenceRuleInput {
  type: RecurrenceType;
  interval: number;
  until: Date | null;
}

function step(date: Date, type: RecurrenceType, interval: number): Date {
  switch (type) {
    case 'daily':
      return addDays(date, interval);
    case 'weekly':
      return addWeeks(date, interval);
    case 'monthly':
      return addMonths(date, interval);
    case 'yearly':
      return addYears(date, interval);
  }
}

export function expandRecurrence(anchorDate: Date, rule: RecurrenceRuleInput, year: number): Date[] {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const hardStop = rule.until ?? yearEnd;
  const effectiveEnd = hardStop < yearEnd ? hardStop : yearEnd;

  const occurrences: Date[] = [];
  let current = anchorDate;

  // Fast-forward to the first occurrence that could fall within the year.
  while (current < yearStart) {
    current = step(current, rule.type, rule.interval);
  }

  while (current <= effectiveEnd) {
    if (current >= yearStart) {
      occurrences.push(current);
    }
    current = step(current, rule.type, rule.interval);
  }

  return occurrences;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm test:run recurrence`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/geometry/recurrence.ts apps/web/src/geometry/recurrence.test.ts
git commit -m "Add recurrence-rule expansion to concrete yearly occurrences"
```

---

## Task 7: SQLite schema and DB client

**Files:**
- Create: `apps/api/src/db/schema.sql`
- Create: `apps/api/src/db/client.ts`
- Test: `apps/api/src/db/client.test.ts`

**Interfaces:**
- Produces: `getDb(filePath?: string): Database.Database` — opens (creating if needed) a SQLite file and applies `schema.sql` idempotently. Task 8 (routes) calls this to get a shared connection.

- [ ] **Step 1: Write the schema**

```sql
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
```

- [ ] **Step 2: Write the failing test**

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api && pnpm test client`
Expected: FAIL — `client.ts` does not exist.

- [ ] **Step 4: Implement**

```ts
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getDb(filePath = './wheel-planner.sqlite'): Database.Database {
  const db = new Database(filePath);
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  return db;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/api && pnpm test client`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/db/schema.sql apps/api/src/db/client.ts apps/api/src/db/client.test.ts
git commit -m "Add SQLite schema and idempotent DB client"
```

---

## Task 8: REST API — wheels, rings, activities

**Files:**
- Create: `apps/api/src/routes/wheels.ts`
- Create: `apps/api/src/routes/rings.ts`
- Create: `apps/api/src/routes/activities.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/src/routes/wheels.test.ts`

**Interfaces:**
- Consumes: `getDb` from Task 7.
- Produces: the HTTP contract Task 9 (frontend API client) codes against:
  - `POST /wheels` `{title, year}` → `201 {id, title, year, rings: [], activities: []}`
  - `GET /wheels/:id` → `200 {id, title, year, rings: Ring[], activities: Activity[]}` (camelCase, matching `apps/web/src/types.ts`)
  - `POST /wheels/:id/rings` `{name, color, orderIndex}` → `201 Ring`
  - `PUT /wheels/:id/rings/:ringId` `Partial<Ring>` → `200 Ring`
  - `DELETE /wheels/:id/rings/:ringId` → `204`
  - `POST /wheels/:id/activities` `Omit<Activity, 'id'>` → `201 Activity`
  - `PUT /activities/:id` `Partial<Activity>` → `200 Activity`
  - `DELETE /activities/:id` → `204`

- [ ] **Step 1: Write the failing integration test**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import request from 'supertest';
import { buildApp } from '../app';

const TEST_DB = './test-wheels.sqlite';
let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  app = buildApp(TEST_DB);
});

afterEach(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('wheel/ring/activity API', () => {
  it('creates a wheel, adds a ring and an activity, then reads them back', async () => {
    const createWheel = await request(app).post('/wheels').send({ title: 'Marketing 2026', year: 2026 });
    expect(createWheel.status).toBe(201);
    const wheelId = createWheel.body.id;

    const createRing = await request(app)
      .post(`/wheels/${wheelId}/rings`)
      .send({ name: 'Kampanjer', color: '#ff0000', orderIndex: 0 });
    expect(createRing.status).toBe(201);
    const ringId = createRing.body.id;

    const createActivity = await request(app)
      .post(`/wheels/${wheelId}/activities`)
      .send({
        ringId,
        title: 'Vårkampanje',
        notes: null,
        kind: 'range',
        startDate: '2026-03-01',
        endDate: '2026-05-01',
        recurrenceRule: null,
        lane: 0,
        color: null,
      });
    expect(createActivity.status).toBe(201);

    const getWheel = await request(app).get(`/wheels/${wheelId}`);
    expect(getWheel.status).toBe(200);
    expect(getWheel.body.rings).toHaveLength(1);
    expect(getWheel.body.activities).toHaveLength(1);
    expect(getWheel.body.activities[0].title).toBe('Vårkampanje');
  });

  it('updates and deletes an activity', async () => {
    const { body: wheel } = await request(app).post('/wheels').send({ title: 'W', year: 2026 });
    const { body: ring } = await request(app)
      .post(`/wheels/${wheel.id}/rings`)
      .send({ name: 'R', color: '#000', orderIndex: 0 });
    const { body: activity } = await request(app)
      .post(`/wheels/${wheel.id}/activities`)
      .send({ ringId: ring.id, title: 'A', notes: null, kind: 'milestone', startDate: '2026-06-01', endDate: null, recurrenceRule: null, lane: 0, color: null });

    const update = await request(app).put(`/activities/${activity.id}`).send({ title: 'A2' });
    expect(update.status).toBe(200);
    expect(update.body.title).toBe('A2');

    const del = await request(app).delete(`/activities/${activity.id}`);
    expect(del.status).toBe(204);

    const getWheel = await request(app).get(`/wheels/${wheel.id}`);
    expect(getWheel.body.activities).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test wheels`
Expected: FAIL — `../app` does not exist.

- [ ] **Step 3: Implement `buildApp` and the routes**

Refactor `apps/api/src/index.ts` to extract an `apps/api/src/app.ts`:

```ts
// apps/api/src/app.ts
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
```

```ts
// apps/api/src/index.ts
import { buildApp } from './app';

const app = buildApp();
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
```

```ts
// apps/api/src/routes/wheels.ts
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
```

```ts
// apps/api/src/routes/mappers.ts
export function mapRingRow(row: any) {
  return {
    id: row.id,
    wheelId: row.wheel_id,
    name: row.name,
    orderIndex: row.order_index,
    color: row.color,
  };
}

export function mapActivityRow(row: any) {
  return {
    id: row.id,
    ringId: row.ring_id,
    title: row.title,
    notes: row.notes,
    kind: row.kind,
    startDate: row.start_date,
    endDate: row.end_date,
    recurrenceRule: row.recurrence_rule ? JSON.parse(row.recurrence_rule) : null,
    lane: row.lane,
    color: row.color,
  };
}
```

```ts
// apps/api/src/routes/rings.ts
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
```

```ts
// apps/api/src/routes/activities.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && pnpm test wheels`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src
git commit -m "Add REST API for wheels, rings, and activities"
```

---

## Task 9: Frontend API client and Zustand store

**Files:**
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/store/wheelStore.ts`
- Test: `apps/web/src/store/wheelStore.test.ts`

**Interfaces:**
- Consumes: `Wheel`, `Ring`, `Activity` from Task 3; the HTTP contract from Task 8.
- Produces: `useWheelStore` Zustand hook with state `{ wheel: Wheel | null }` and actions `loadWheel(id)`, `addRing(input)`, `updateRing(ringId, patch)`, `removeRing(ringId)`, `addActivity(input)`, `updateActivity(activityId, patch)`, `removeActivity(activityId)`. Tasks 11–16 (panel and drag) call these actions exclusively — they never call `fetch` directly.

- [ ] **Step 1: Write the API client**

```ts
// apps/web/src/api/client.ts
import type { Activity, Ring, Wheel } from '../types';

const BASE_URL = 'http://localhost:3001';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getWheel: (id: string) => fetch(`${BASE_URL}/wheels/${id}`).then((r) => json<Wheel>(r)),
  createWheel: (input: { title: string; year: number }) =>
    fetch(`${BASE_URL}/wheels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }).then((r) => json<Wheel>(r)),
  createRing: (wheelId: string, input: Omit<Ring, 'id' | 'wheelId'>) =>
    fetch(`${BASE_URL}/wheels/${wheelId}/rings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }).then((r) => json<Ring>(r)),
  updateRing: (wheelId: string, ringId: string, patch: Partial<Ring>) =>
    fetch(`${BASE_URL}/wheels/${wheelId}/rings/${ringId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).then((r) => json<Ring>(r)),
  deleteRing: (wheelId: string, ringId: string) =>
    fetch(`${BASE_URL}/wheels/${wheelId}/rings/${ringId}`, { method: 'DELETE' }).then((r) => json<void>(r)),
  createActivity: (wheelId: string, input: Omit<Activity, 'id'>) =>
    fetch(`${BASE_URL}/wheels/${wheelId}/activities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }).then((r) => json<Activity>(r)),
  updateActivity: (activityId: string, patch: Partial<Activity>) =>
    fetch(`${BASE_URL}/activities/${activityId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).then((r) => json<Activity>(r)),
  deleteActivity: (activityId: string) =>
    fetch(`${BASE_URL}/activities/${activityId}`, { method: 'DELETE' }).then((r) => json<void>(r)),
};
```

- [ ] **Step 2: Write the failing store test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWheelStore } from './wheelStore';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    getWheel: vi.fn(),
    createRing: vi.fn(),
    updateRing: vi.fn(),
    deleteRing: vi.fn(),
    createActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
  },
}));

beforeEach(() => {
  useWheelStore.setState({ wheel: null });
  vi.clearAllMocks();
});

describe('wheelStore', () => {
  it('loadWheel populates state from the API', async () => {
    const wheel = { id: 'w1', title: 'T', year: 2026, rings: [], activities: [] };
    (api.getWheel as any).mockResolvedValue(wheel);

    await useWheelStore.getState().loadWheel('w1');

    expect(useWheelStore.getState().wheel).toEqual(wheel);
  });

  it('addActivity appends the created activity to state', async () => {
    useWheelStore.setState({ wheel: { id: 'w1', title: 'T', year: 2026, rings: [], activities: [] } });
    const created = { id: 'a1', ringId: 'r1', title: 'New', notes: null, kind: 'milestone', startDate: '2026-01-01', endDate: null, recurrenceRule: null, lane: 0, color: null };
    (api.createActivity as any).mockResolvedValue(created);

    await useWheelStore.getState().addActivity({
      ringId: 'r1', title: 'New', notes: null, kind: 'milestone', startDate: '2026-01-01', endDate: null, recurrenceRule: null, lane: 0, color: null,
    });

    expect(useWheelStore.getState().wheel?.activities).toEqual([created]);
  });

  it('removeActivity removes it from state', async () => {
    const activity = { id: 'a1', ringId: 'r1', title: 'New', notes: null, kind: 'milestone', startDate: '2026-01-01', endDate: null, recurrenceRule: null, lane: 0, color: null };
    useWheelStore.setState({ wheel: { id: 'w1', title: 'T', year: 2026, rings: [], activities: [activity] } });

    await useWheelStore.getState().removeActivity('a1');

    expect(useWheelStore.getState().wheel?.activities).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/web && pnpm test:run wheelStore`
Expected: FAIL — `wheelStore.ts` does not exist.

- [ ] **Step 4: Implement the store**

```ts
// apps/web/src/store/wheelStore.ts
import { create } from 'zustand';
import type { Activity, Ring, Wheel } from '../types';
import { api } from '../api/client';

interface WheelStore {
  wheel: Wheel | null;
  loadWheel: (id: string) => Promise<void>;
  addRing: (input: Omit<Ring, 'id' | 'wheelId'>) => Promise<void>;
  updateRing: (ringId: string, patch: Partial<Ring>) => Promise<void>;
  removeRing: (ringId: string) => Promise<void>;
  addActivity: (input: Omit<Activity, 'id'>) => Promise<void>;
  updateActivity: (activityId: string, patch: Partial<Activity>) => Promise<void>;
  removeActivity: (activityId: string) => Promise<void>;
}

export const useWheelStore = create<WheelStore>((set, get) => ({
  wheel: null,

  loadWheel: async (id) => {
    const wheel = await api.getWheel(id);
    set({ wheel });
  },

  addRing: async (input) => {
    const wheel = get().wheel;
    if (!wheel) return;
    const ring = await api.createRing(wheel.id, input);
    set({ wheel: { ...wheel, rings: [...wheel.rings, ring] } });
  },

  updateRing: async (ringId, patch) => {
    const wheel = get().wheel;
    if (!wheel) return;
    const updated = await api.updateRing(wheel.id, ringId, patch);
    set({ wheel: { ...wheel, rings: wheel.rings.map((r) => (r.id === ringId ? updated : r)) } });
  },

  removeRing: async (ringId) => {
    const wheel = get().wheel;
    if (!wheel) return;
    await api.deleteRing(wheel.id, ringId);
    set({ wheel: { ...wheel, rings: wheel.rings.filter((r) => r.id !== ringId) } });
  },

  addActivity: async (input) => {
    const wheel = get().wheel;
    if (!wheel) return;
    const activity = await api.createActivity(wheel.id, input);
    set({ wheel: { ...wheel, activities: [...wheel.activities, activity] } });
  },

  updateActivity: async (activityId, patch) => {
    const wheel = get().wheel;
    if (!wheel) return;
    const updated = await api.updateActivity(activityId, patch);
    set({ wheel: { ...wheel, activities: wheel.activities.map((a) => (a.id === activityId ? updated : a)) } });
  },

  removeActivity: async (activityId) => {
    const wheel = get().wheel;
    if (!wheel) return;
    await api.deleteActivity(activityId);
    set({ wheel: { ...wheel, activities: wheel.activities.filter((a) => a.id !== activityId) } });
  },
}));
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/web && pnpm test:run wheelStore`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/api/client.ts apps/web/src/store/wheelStore.ts apps/web/src/store/wheelStore.test.ts
git commit -m "Add API client and Zustand store for the wheel"
```

---

## Task 10: Wheel geometry constants + static month ring

**Files:**
- Create: `apps/web/src/wheel/constants.ts`
- Create: `apps/web/src/wheel/WheelCanvas.tsx`
- Create: `apps/web/src/wheel/MonthRing.tsx`
- Create: `apps/web/src/wheel/TodayMarker.tsx`
- Test: `apps/web/src/wheel/MonthRing.test.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `dateToAngle` from Task 4.
- Produces: `WheelCanvas` (a `<svg>` wrapper taking `year: number` and `children`), and the radius constants Task 11 (category rings) builds on: `WHEEL_SIZE`, `CENTER`, `MONTH_RING_INNER_RADIUS`, `MONTH_RING_OUTER_RADIUS`, `CATEGORY_RING_START_RADIUS`, `CATEGORY_RING_WIDTH`, `LANE_WIDTH`.

- [ ] **Step 1: Define constants**

```ts
// apps/web/src/wheel/constants.ts
export const WHEEL_SIZE = 640;
export const CENTER = WHEEL_SIZE / 2;
export const MONTH_RING_INNER_RADIUS = 260;
export const MONTH_RING_OUTER_RADIUS = 300;
export const CATEGORY_RING_START_RADIUS = 60;
export const CATEGORY_RING_WIDTH = 40;
export const LANE_WIDTH = 18;
```

- [ ] **Step 2: Write the failing test for MonthRing**

```tsx
// apps/web/src/wheel/MonthRing.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MonthRing } from './MonthRing';

describe('MonthRing', () => {
  it('renders 12 month arcs', () => {
    const { container } = render(
      <svg>
        <MonthRing year={2026} />
      </svg>
    );
    expect(container.querySelectorAll('path[data-month]')).toHaveLength(12);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && pnpm test:run MonthRing`
Expected: FAIL — `MonthRing.tsx` does not exist.

- [ ] **Step 4: Implement WheelCanvas, MonthRing, TodayMarker**

```tsx
// apps/web/src/wheel/WheelCanvas.tsx
import type { ReactNode } from 'react';
import { WHEEL_SIZE, CENTER } from './constants';

export function WheelCanvas({ children }: { children: ReactNode }) {
  return (
    <svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
      <g transform={`translate(${CENTER}, ${CENTER})`}>{children}</g>
    </svg>
  );
}
```

```tsx
// apps/web/src/wheel/MonthRing.tsx
import { arc } from 'd3-shape';
import { dateToAngle } from '../geometry/dateAngle';
import { MONTH_RING_INNER_RADIUS, MONTH_RING_OUTER_RADIUS } from './constants';

const arcGenerator = arc();

export function MonthRing({ year }: { year: number }) {
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <g>
      {months.map((month) => {
        const start = dateToAngle(new Date(year, month, 1), year);
        const end = dateToAngle(new Date(year, month + 1, 1), year);
        const path = arcGenerator({
          innerRadius: MONTH_RING_INNER_RADIUS,
          outerRadius: MONTH_RING_OUTER_RADIUS,
          startAngle: start,
          endAngle: month === 11 ? 2 * Math.PI : end,
        } as any);
        return (
          <path
            key={month}
            data-month={month}
            d={path ?? undefined}
            fill={month % 2 === 0 ? '#e5e7eb' : '#f3f4f6'}
            stroke="#9ca3af"
          />
        );
      })}
    </g>
  );
}
```

```tsx
// apps/web/src/wheel/TodayMarker.tsx
import { dateToAngle } from '../geometry/dateAngle';
import { CENTER, MONTH_RING_OUTER_RADIUS, CATEGORY_RING_START_RADIUS } from './constants';

export function TodayMarker({ year }: { year: number }) {
  const today = new Date();
  if (today.getFullYear() !== year) return null;

  const angle = dateToAngle(today, year) - Math.PI / 2; // shift so 0 rad = 12 o'clock in x/y math
  const x1 = CATEGORY_RING_START_RADIUS * Math.cos(angle);
  const y1 = CATEGORY_RING_START_RADIUS * Math.sin(angle);
  const x2 = MONTH_RING_OUTER_RADIUS * Math.cos(angle);
  const y2 = MONTH_RING_OUTER_RADIUS * Math.sin(angle);

  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ef4444" strokeWidth={2} />;
}
```

- [ ] **Step 5: Wire into App.tsx**

```tsx
// apps/web/src/App.tsx
import { WheelCanvas } from './wheel/WheelCanvas';
import { MonthRing } from './wheel/MonthRing';
import { TodayMarker } from './wheel/TodayMarker';

export default function App() {
  const year = 2026;
  return (
    <div className="p-8 flex justify-center">
      <WheelCanvas>
        <MonthRing year={year} />
        <TodayMarker year={year} />
      </WheelCanvas>
    </div>
  );
}
```

- [ ] **Step 6: Run test to verify it passes, then verify visually**

Run: `cd apps/web && pnpm test:run MonthRing` — expect PASS.
Run: `pnpm dev:web`, open the app — expect a circle divided into 12 alternating-shade month wedges, with a red radial line if today falls in 2026.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/wheel apps/web/src/App.tsx
git commit -m "Add static month ring and today marker to the wheel"
```

---

## Task 11: Category rings and activity/milestone rendering

**Files:**
- Create: `apps/web/src/wheel/CategoryRing.tsx`
- Create: `apps/web/src/wheel/ActivitySegment.tsx`
- Create: `apps/web/src/wheel/MilestoneMarker.tsx`
- Test: `apps/web/src/wheel/CategoryRing.test.tsx`
- Modify: `apps/web/src/App.tsx` (render against a fixture wheel)

**Interfaces:**
- Consumes: `dateToAngle` (Task 4), `Ring`/`Activity` types (Task 3), radius constants (Task 10).
- Produces: `CategoryRing({ ring: Ring, ringIndex: number, activities: Activity[], year: number })`. Tasks 13–15 (drag) wrap `ActivitySegment`/`MilestoneMarker` with drag handlers — this task renders them statically first.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/wheel/CategoryRing.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CategoryRing } from './CategoryRing';
import type { Activity, Ring } from '../types';

const ring: Ring = { id: 'r1', wheelId: 'w1', name: 'Kampanjer', orderIndex: 0, color: '#3b82f6' };
const activities: Activity[] = [
  { id: 'a1', ringId: 'r1', title: 'Vår', notes: null, kind: 'range', startDate: '2026-03-01', endDate: '2026-05-01', recurrenceRule: null, lane: 0, color: null },
  { id: 'a2', ringId: 'r1', title: 'Lansering', notes: null, kind: 'milestone', startDate: '2026-06-15', endDate: null, recurrenceRule: null, lane: 0, color: null },
];

describe('CategoryRing', () => {
  it('renders one arc per range activity and one marker per milestone', () => {
    const { container } = render(
      <svg>
        <CategoryRing ring={ring} ringIndex={0} activities={activities} year={2026} />
      </svg>
    );
    expect(container.querySelectorAll('path[data-activity-id="a1"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-milestone-id="a2"]')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test:run CategoryRing`
Expected: FAIL — `CategoryRing.tsx` does not exist.

- [ ] **Step 3: Implement**

```tsx
// apps/web/src/wheel/ActivitySegment.tsx
import { arc } from 'd3-shape';
import { dateToAngle } from '../geometry/dateAngle';
import type { Activity } from '../types';

const arcGenerator = arc();

export function ActivitySegment({
  activity,
  innerRadius,
  outerRadius,
  year,
  color,
}: {
  activity: Activity;
  innerRadius: number;
  outerRadius: number;
  year: number;
  color: string;
}) {
  const startAngle = dateToAngle(new Date(activity.startDate), year);
  const endAngle = dateToAngle(new Date(activity.endDate!), year);
  const path = arcGenerator({ innerRadius, outerRadius, startAngle, endAngle } as any);

  return <path data-activity-id={activity.id} d={path ?? undefined} fill={activity.color ?? color} />;
}
```

```tsx
// apps/web/src/wheel/MilestoneMarker.tsx
import { dateToAngle } from '../geometry/dateAngle';
import type { Activity } from '../types';

export function MilestoneMarker({
  activity,
  radius,
  year,
  color,
}: {
  activity: Activity;
  radius: number;
  year: number;
  color: string;
}) {
  const angle = dateToAngle(new Date(activity.startDate), year) - Math.PI / 2;
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);

  return <circle data-milestone-id={activity.id} cx={x} cy={y} r={6} fill={activity.color ?? color} />;
}
```

```tsx
// apps/web/src/wheel/CategoryRing.tsx
import type { Activity, Ring } from '../types';
import { ActivitySegment } from './ActivitySegment';
import { MilestoneMarker } from './MilestoneMarker';
import { CATEGORY_RING_START_RADIUS, CATEGORY_RING_WIDTH, LANE_WIDTH } from './constants';

export function CategoryRing({
  ring,
  ringIndex,
  activities,
  year,
}: {
  ring: Ring;
  ringIndex: number;
  activities: Activity[];
  year: number;
}) {
  const ringInner = CATEGORY_RING_START_RADIUS + ringIndex * CATEGORY_RING_WIDTH;

  return (
    <g>
      {activities.map((activity) => {
        const laneInner = ringInner + activity.lane * LANE_WIDTH;
        const laneOuter = laneInner + LANE_WIDTH;
        return activity.kind === 'range' ? (
          <ActivitySegment
            key={activity.id}
            activity={activity}
            innerRadius={laneInner}
            outerRadius={laneOuter}
            year={year}
            color={ring.color}
          />
        ) : (
          <MilestoneMarker key={activity.id} activity={activity} radius={(laneInner + laneOuter) / 2} year={year} color={ring.color} />
        );
      })}
    </g>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test:run CategoryRing`
Expected: PASS.

- [ ] **Step 5: Render against a fixture in App.tsx and verify visually**

```tsx
// apps/web/src/App.tsx
import { WheelCanvas } from './wheel/WheelCanvas';
import { MonthRing } from './wheel/MonthRing';
import { TodayMarker } from './wheel/TodayMarker';
import { CategoryRing } from './wheel/CategoryRing';
import type { Ring, Activity } from './types';

const fixtureRing: Ring = { id: 'r1', wheelId: 'w1', name: 'Kampanjer', orderIndex: 0, color: '#3b82f6' };
const fixtureActivities: Activity[] = [
  { id: 'a1', ringId: 'r1', title: 'Vårkampanje', notes: null, kind: 'range', startDate: '2026-03-01', endDate: '2026-05-01', recurrenceRule: null, lane: 0, color: null },
  { id: 'a2', ringId: 'r1', title: 'Lansering', notes: null, kind: 'milestone', startDate: '2026-06-15', endDate: null, recurrenceRule: null, lane: 0, color: null },
];

export default function App() {
  const year = 2026;
  return (
    <div className="p-8 flex justify-center">
      <WheelCanvas>
        <MonthRing year={year} />
        <TodayMarker year={year} />
        <CategoryRing ring={fixtureRing} ringIndex={0} activities={fixtureActivities} year={year} />
      </WheelCanvas>
    </div>
  );
}
```

Run: `pnpm dev:web` — expect a blue arc between March and May and a blue dot in mid-June, inside the month ring.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/wheel apps/web/src/App.tsx
git commit -m "Render category rings with activity arcs and milestone markers"
```

---

## Task 12: Sidepanel — activity form (create/edit/delete)

**Files:**
- Create: `apps/web/src/panel/ActivityForm.tsx`
- Create: `apps/web/src/panel/ActivityList.tsx`
- Test: `apps/web/src/panel/ActivityForm.test.tsx`
- Modify: `apps/web/src/App.tsx` (load a real wheel from the store, show the panel)

**Interfaces:**
- Consumes: `useWheelStore` (Task 9), shadcn `Sheet`/`Input`/`Select`/`Button` (Task 2).
- Produces: `ActivityForm({ ring: Ring, activity?: Activity, onDone: () => void })` and `ActivityList({ activities: Activity[], ringName: (ringId: string) => string, onEdit, onDelete })`, used by `App.tsx` from here on as the primary non-drag editing path.

- [ ] **Step 1: Add remaining shadcn components**

Run inside `apps/web`: `npx shadcn@latest add sheet input label select`

- [ ] **Step 2: Write the failing test**

```tsx
// apps/web/src/panel/ActivityForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityForm } from './ActivityForm';
import { useWheelStore } from '../store/wheelStore';
import type { Ring } from '../types';

vi.mock('../store/wheelStore');

const ring: Ring = { id: 'r1', wheelId: 'w1', name: 'Kampanjer', orderIndex: 0, color: '#3b82f6' };

describe('ActivityForm', () => {
  it('calls addActivity with form values on submit', async () => {
    const addActivity = vi.fn().mockResolvedValue(undefined);
    (useWheelStore as any).mockReturnValue({ addActivity });
    const onDone = vi.fn();

    render(<ActivityForm ring={ring} onDone={onDone} />);

    await userEvent.type(screen.getByLabelText(/tittel/i), 'Sommerkampanje');
    await userEvent.click(screen.getByRole('button', { name: /lagre/i }));

    expect(addActivity).toHaveBeenCalledWith(
      expect.objectContaining({ ringId: 'r1', title: 'Sommerkampanje' })
    );
    expect(onDone).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && pnpm test:run ActivityForm`
Expected: FAIL — `ActivityForm.tsx` does not exist.

- [ ] **Step 4: Implement**

```tsx
// apps/web/src/panel/ActivityForm.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWheelStore } from '../store/wheelStore';
import type { Activity, ActivityKind, Ring } from '../types';

export function ActivityForm({
  ring,
  activity,
  onDone,
}: {
  ring: Ring;
  activity?: Activity;
  onDone: () => void;
}) {
  const addActivity = useWheelStore((s) => s.addActivity);
  const updateActivity = useWheelStore((s) => s.updateActivity);

  const [title, setTitle] = useState(activity?.title ?? '');
  const [kind, setKind] = useState<ActivityKind>(activity?.kind ?? 'range');
  const [startDate, setStartDate] = useState(activity?.startDate ?? '');
  const [endDate, setEndDate] = useState(activity?.endDate ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ringId: ring.id,
      title,
      notes: null,
      kind,
      startDate,
      endDate: kind === 'milestone' ? null : endDate,
      recurrenceRule: null,
      lane: activity?.lane ?? 0,
      color: null,
    };
    if (activity) {
      await updateActivity(activity.id, payload);
    } else {
      await addActivity(payload);
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Tittel</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="startDate">Startdato</Label>
        <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </div>
      {kind === 'range' && (
        <div>
          <Label htmlFor="endDate">Sluttdato</Label>
          <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      )}
      <Button type="submit">Lagre</Button>
    </form>
  );
}
```

```tsx
// apps/web/src/panel/ActivityList.tsx
import { Button } from '@/components/ui/button';
import type { Activity } from '../types';

export function ActivityList({
  activities,
  ringName,
  onEdit,
  onDelete,
}: {
  activities: Activity[];
  ringName: (ringId: string) => string;
  onEdit: (activity: Activity) => void;
  onDelete: (activityId: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {activities.map((activity) => (
        <li key={activity.id} className="flex items-center justify-between border-b pb-2">
          <div>
            <div className="font-medium">{activity.title}</div>
            <div className="text-sm text-muted-foreground">{ringName(activity.ringId)}</div>
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(activity)}>Rediger</Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(activity.id)}>Slett</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/web && pnpm test:run ActivityForm`
Expected: PASS.

- [ ] **Step 6: Wire into App.tsx, replacing the fixture**

Update `App.tsx` to call `useWheelStore().loadWheel(id)` in a `useEffect` against a wheel created via `api.createWheel` on first run (or a hardcoded dev wheel ID you create once via `curl`), and render `ActivityList` + a shadcn `Sheet` containing `ActivityForm` triggered by an "Ny aktivitet" button, alongside the existing `WheelCanvas`. This is manual wiring (no new exported interface), verified visually.

- [ ] **Step 7: Verify visually**

Run `pnpm dev:api` and `pnpm dev:web`. Create a wheel and a ring via the UI or `curl`, then use the panel to add, edit, and delete an activity; confirm the wheel re-renders after each action.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/panel apps/web/src/App.tsx
git commit -m "Add activity form and list panel wired to the store"
```

---

## Task 13: Ring management panel

**Files:**
- Create: `apps/web/src/panel/RingManager.tsx`
- Test: `apps/web/src/panel/RingManager.test.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `useWheelStore` (`addRing`, `updateRing`, `removeRing` from Task 9), `@dnd-kit/sortable`.
- Produces: `RingManager({ rings: Ring[] })`, rendering a reorderable list; reordering calls `updateRing(ringId, { orderIndex })` for each affected ring.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/panel/RingManager.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RingManager } from './RingManager';
import { useWheelStore } from '../store/wheelStore';
import type { Ring } from '../types';

vi.mock('../store/wheelStore');

describe('RingManager', () => {
  it('calls addRing when the add button is used', async () => {
    const addRing = vi.fn().mockResolvedValue(undefined);
    (useWheelStore as any).mockReturnValue({ addRing, updateRing: vi.fn(), removeRing: vi.fn() });

    render(<RingManager rings={[]} />);
    await userEvent.type(screen.getByLabelText(/ringnavn/i), 'Kampanjer');
    await userEvent.click(screen.getByRole('button', { name: /legg til ring/i }));

    expect(addRing).toHaveBeenCalledWith(expect.objectContaining({ name: 'Kampanjer' }));
  });

  it('calls removeRing when delete is clicked', async () => {
    const removeRing = vi.fn().mockResolvedValue(undefined);
    const ring: Ring = { id: 'r1', wheelId: 'w1', name: 'Kampanjer', orderIndex: 0, color: '#3b82f6' };
    (useWheelStore as any).mockReturnValue({ addRing: vi.fn(), updateRing: vi.fn(), removeRing });

    render(<RingManager rings={[ring]} />);
    await userEvent.click(screen.getByRole('button', { name: /fjern/i }));

    expect(removeRing).toHaveBeenCalledWith('r1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test:run RingManager`
Expected: FAIL — `RingManager.tsx` does not exist.

- [ ] **Step 3: Implement (reordering via dnd-kit)**

```tsx
// apps/web/src/panel/RingManager.tsx
import { useState } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWheelStore } from '../store/wheelStore';
import type { Ring } from '../types';

function SortableRingRow({ ring, onRemove }: { ring: Ring; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: ring.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center justify-between border-b py-2">
      <span>{ring.name}</span>
      <Button variant="destructive" size="sm" onClick={onRemove}>Fjern</Button>
    </li>
  );
}

export function RingManager({ rings }: { rings: Ring[] }) {
  const { addRing, updateRing, removeRing } = useWheelStore();
  const [name, setName] = useState('');

  async function handleAdd() {
    await addRing({ name, color: '#3b82f6', orderIndex: rings.length });
    setName('');
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rings.findIndex((r) => r.id === active.id);
    const newIndex = rings.findIndex((r) => r.id === over.id);
    const reordered = arrayMove(rings, oldIndex, newIndex);
    await Promise.all(reordered.map((ring, index) => updateRing(ring.id, { orderIndex: index })));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div>
          <Label htmlFor="ringName">Ringnavn</Label>
          <Input id="ringName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={handleAdd}>Legg til ring</Button>
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rings.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ul>
            {rings.map((ring) => (
              <SortableRingRow key={ring.id} ring={ring} onRemove={() => removeRing(ring.id)} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test:run RingManager`
Expected: PASS.

- [ ] **Step 5: Wire into App.tsx and verify visually**

Add a shadcn `Sheet` (or a dedicated panel section) rendering `<RingManager rings={wheel.rings} />`. Verify in the browser: add two rings, drag to reorder, confirm the wheel's `CategoryRing` order updates; remove a ring and confirm its activities disappear from the wheel (cascade delete is enforced by the DB's `ON DELETE CASCADE`).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/panel/RingManager.tsx apps/web/src/panel/RingManager.test.tsx apps/web/src/App.tsx
git commit -m "Add ring management panel with drag-to-reorder"
```

---

## Task 14: Drag — move a whole activity segment

**Files:**
- Create: `apps/web/src/wheel/useSegmentDrag.ts`
- Test: `apps/web/src/wheel/useSegmentDrag.test.ts`
- Modify: `apps/web/src/wheel/ActivitySegment.tsx`

**Interfaces:**
- Consumes: `dateToAngle`/`angleToDate` (Task 4), `useWheelStore().updateActivity` (Task 9), `@use-gesture/react`.
- Produces: `useSegmentDrag({ activity, year, onPreviewChange, onCommit })` — a hook returning `bind()` (spread onto the SVG element) that computes a drag delta in days and reports it via `onPreviewChange(deltaDays)` on every move and `onCommit(deltaDays)` on release. Task 15 (resize) and Task 16 (milestone drag) follow the same `onPreviewChange`/`onCommit` shape for consistency.

- [ ] **Step 1: Write the failing test**

Because `@use-gesture/react` binds to real pointer events, test the pure delta computation it depends on directly rather than simulating gestures (per the spec: drag UX is verified manually in-browser; only the math is unit-tested):

```ts
// apps/web/src/wheel/useSegmentDrag.test.ts
import { describe, it, expect } from 'vitest';
import { angleDeltaToDayDelta } from './useSegmentDrag';

describe('angleDeltaToDayDelta', () => {
  it('converts a full-circle angle delta to a full year of days', () => {
    const days = angleDeltaToDayDelta(2 * Math.PI, 2026);
    expect(days).toBeCloseTo(365, 5);
  });

  it('converts a zero angle delta to zero days', () => {
    expect(angleDeltaToDayDelta(0, 2026)).toBeCloseTo(0, 5);
  });

  it('handles negative deltas (dragging counter-clockwise)', () => {
    const days = angleDeltaToDayDelta(-Math.PI, 2026);
    expect(days).toBeCloseTo(-365 / 2, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test:run useSegmentDrag`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
// apps/web/src/wheel/useSegmentDrag.ts
import { useDrag } from '@use-gesture/react';
import { isLeapYear } from 'date-fns';
import { addDays } from 'date-fns';
import type { Activity } from '../types';
import { useWheelStore } from '../store/wheelStore';
import { CENTER } from './constants';

function yearLength(year: number): number {
  return isLeapYear(new Date(year, 0, 1)) ? 366 : 365;
}

export function angleDeltaToDayDelta(angleDelta: number, year: number): number {
  return (angleDelta / (2 * Math.PI)) * yearLength(year);
}

function pointerAngle(x: number, y: number): number {
  // atan2 returns 0 at 3 o'clock, increasing counter-clockwise; shift so 0 = 12 o'clock, clockwise-positive
  return Math.atan2(x, -y);
}

export function useSegmentDrag({
  activity,
  year,
  onPreviewChange,
}: {
  activity: Activity;
  year: number;
  onPreviewChange: (dayDelta: number | null) => void;
}) {
  const updateActivity = useWheelStore((s) => s.updateActivity);

  const bind = useDrag(({ first, last, xy: [x, y], event, memo }) => {
    const svg = (event.target as SVGElement).ownerSVGElement;
    const rect = svg!.getBoundingClientRect();
    const localX = x - rect.left - CENTER;
    const localY = y - rect.top - CENTER;
    const currentAngle = pointerAngle(localX, localY);

    const startAngle = first ? currentAngle : memo;
    const dayDelta = Math.round(angleDeltaToDayDelta(currentAngle - startAngle, year));

    if (last) {
      onPreviewChange(null);
      if (dayDelta !== 0) {
        const newStart = addDays(new Date(activity.startDate), dayDelta);
        const newEnd = activity.endDate ? addDays(new Date(activity.endDate), dayDelta) : null;
        updateActivity(activity.id, {
          startDate: newStart.toISOString().slice(0, 10),
          endDate: newEnd ? newEnd.toISOString().slice(0, 10) : null,
        });
      }
    } else {
      onPreviewChange(dayDelta);
    }

    return startAngle;
  });

  return { bind };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test:run useSegmentDrag`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire into ActivitySegment for live preview + commit**

```tsx
// apps/web/src/wheel/ActivitySegment.tsx
import { useState } from 'react';
import { arc } from 'd3-shape';
import { addDays } from 'date-fns';
import { dateToAngle } from '../geometry/dateAngle';
import { useSegmentDrag } from './useSegmentDrag';
import type { Activity } from '../types';

const arcGenerator = arc();

export function ActivitySegment({
  activity,
  innerRadius,
  outerRadius,
  year,
  color,
}: {
  activity: Activity;
  innerRadius: number;
  outerRadius: number;
  year: number;
  color: string;
}) {
  const [previewDayDelta, setPreviewDayDelta] = useState<number | null>(null);
  const { bind } = useSegmentDrag({ activity, year, onPreviewChange: setPreviewDayDelta });

  const effectiveStart = previewDayDelta ? addDays(new Date(activity.startDate), previewDayDelta) : new Date(activity.startDate);
  const effectiveEnd = previewDayDelta ? addDays(new Date(activity.endDate!), previewDayDelta) : new Date(activity.endDate!);

  const startAngle = dateToAngle(effectiveStart, year);
  const endAngle = dateToAngle(effectiveEnd, year);
  const path = arcGenerator({ innerRadius, outerRadius, startAngle, endAngle } as any);

  return (
    <path
      {...(bind() as any)}
      data-activity-id={activity.id}
      d={path ?? undefined}
      fill={activity.color ?? color}
      opacity={previewDayDelta !== null ? 0.6 : 1}
      style={{ touchAction: 'none', cursor: 'grab' }}
    />
  );
}
```

- [ ] **Step 6: Verify visually**

Run `pnpm dev:web`. Drag the middle of an activity arc around the wheel; confirm it moves smoothly with reduced opacity while dragging, snaps to a new position on release, and the change persists after a page reload (i.e. it was saved via `updateActivity`).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/wheel/useSegmentDrag.ts apps/web/src/wheel/useSegmentDrag.test.ts apps/web/src/wheel/ActivitySegment.tsx
git commit -m "Add drag-to-move for activity segments"
```

---

## Task 15: Drag — resize segment edges

**Files:**
- Create: `apps/web/src/wheel/ResizeHandle.tsx`
- Modify: `apps/web/src/wheel/ActivitySegment.tsx`
- Test: `apps/web/src/wheel/ResizeHandle.test.tsx`

**Interfaces:**
- Consumes: `angleDeltaToDayDelta`, `pointerAngle`-equivalent logic pattern from Task 14 (duplicated locally since it's a 3-line pure computation, not worth extracting into a shared module for two call sites — see spec's YAGNI stance).
- Produces: `ResizeHandle({ edge: 'start' | 'end', activity, year, onPreviewChange, onCommit })`, rendered twice by `ActivitySegment` (once per edge).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/wheel/ResizeHandle.test.tsx
import { describe, it, expect } from 'vitest';
import { clampEdgeDate } from './ResizeHandle';

describe('clampEdgeDate', () => {
  it('does not let the start date pass the end date', () => {
    const clamped = clampEdgeDate('start', new Date('2026-05-10'), new Date('2026-05-01'), new Date('2026-05-05'));
    expect(clamped.getTime()).toBeLessThanOrEqual(new Date('2026-05-05').getTime());
  });

  it('does not let the end date precede the start date', () => {
    const clamped = clampEdgeDate('end', new Date('2026-04-01'), new Date('2026-05-01'), new Date('2026-05-05'));
    expect(clamped.getTime()).toBeGreaterThanOrEqual(new Date('2026-05-01').getTime());
  });

  it('passes through valid dates unchanged', () => {
    const clamped = clampEdgeDate('start', new Date('2026-04-20'), new Date('2026-05-01'), new Date('2026-05-05'));
    expect(clamped).toEqual(new Date('2026-04-20'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test:run ResizeHandle`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```tsx
// apps/web/src/wheel/ResizeHandle.tsx
import { useDrag } from '@use-gesture/react';
import { addDays } from 'date-fns';
import { dateToAngle } from '../geometry/dateAngle';
import { angleDeltaToDayDelta } from './useSegmentDrag';
import { useWheelStore } from '../store/wheelStore';
import { CENTER } from './constants';
import type { Activity } from '../types';

export function clampEdgeDate(edge: 'start' | 'end', candidate: Date, currentStart: Date, currentEnd: Date): Date {
  if (edge === 'start') {
    return candidate > currentEnd ? currentEnd : candidate;
  }
  return candidate < currentStart ? currentStart : candidate;
}

function pointerAngle(x: number, y: number): number {
  return Math.atan2(x, -y);
}

export function ResizeHandle({
  edge,
  activity,
  radius,
  year,
  onPreviewChange,
}: {
  edge: 'start' | 'end';
  activity: Activity;
  radius: number;
  year: number;
  onPreviewChange: (edge: 'start' | 'end', dayDelta: number | null) => void;
}) {
  const updateActivity = useWheelStore((s) => s.updateActivity);
  const anchorDate = edge === 'start' ? new Date(activity.startDate) : new Date(activity.endDate!);
  const anchorAngle = dateToAngle(anchorDate, year) - Math.PI / 2;

  const bind = useDrag(({ first, last, xy: [x, y], event, memo }) => {
    const svg = (event.target as SVGElement).ownerSVGElement;
    const rect = svg!.getBoundingClientRect();
    const localX = x - rect.left - CENTER;
    const localY = y - rect.top - CENTER;
    const currentAngle = pointerAngle(localX, localY);

    const startAngle = first ? currentAngle : memo;
    const dayDelta = Math.round(angleDeltaToDayDelta(currentAngle - startAngle, year));

    if (last) {
      onPreviewChange(edge, null);
      const currentStart = new Date(activity.startDate);
      const currentEnd = new Date(activity.endDate!);
      const candidate = addDays(anchorDate, dayDelta);
      const clamped = clampEdgeDate(edge, candidate, currentStart, currentEnd);
      const iso = clamped.toISOString().slice(0, 10);
      updateActivity(activity.id, edge === 'start' ? { startDate: iso } : { endDate: iso });
    } else {
      onPreviewChange(edge, dayDelta);
    }

    return startAngle;
  });

  return (
    <circle
      {...(bind() as any)}
      cx={radius * Math.cos(anchorAngle)}
      cy={radius * Math.sin(anchorAngle)}
      r={5}
      fill="white"
      stroke="#374151"
      strokeWidth={1.5}
      style={{ touchAction: 'none', cursor: 'ew-resize' }}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test:run ResizeHandle`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire two handles into ActivitySegment**

In `ActivitySegment.tsx`, add local state `previewEdgeDeltas: { start: number | null; end: number | null }`, apply the relevant delta to `effectiveStart`/`effectiveEnd` independently, and render two `<ResizeHandle edge="start" .../>` / `<ResizeHandle edge="end" .../>` alongside the arc `<path>`, positioned at `outerRadius` (radius prop) so they sit on the segment's outer edge.

- [ ] **Step 6: Verify visually**

Run `pnpm dev:web`. Drag the start handle of a segment later — confirm the arc shrinks from that side only and clamps at the end date; drag the end handle similarly.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/wheel/ResizeHandle.tsx apps/web/src/wheel/ResizeHandle.test.tsx apps/web/src/wheel/ActivitySegment.tsx
git commit -m "Add drag-to-resize handles for activity segment edges"
```

---

## Task 16: Drag — move a milestone

**Files:**
- Modify: `apps/web/src/wheel/MilestoneMarker.tsx`

**Interfaces:**
- Consumes: `angleDeltaToDayDelta` (Task 14), `useWheelStore().updateActivity` (Task 9).
- Produces: no new exported interface — `MilestoneMarker` becomes draggable in place, mirroring `ActivitySegment`'s pattern.

- [ ] **Step 1: Implement drag directly on MilestoneMarker (same pattern as Task 14, no new pure logic to unit-test)**

```tsx
// apps/web/src/wheel/MilestoneMarker.tsx
import { useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { addDays } from 'date-fns';
import { dateToAngle } from '../geometry/dateAngle';
import { angleDeltaToDayDelta } from './useSegmentDrag';
import { useWheelStore } from '../store/wheelStore';
import { CENTER } from './constants';
import type { Activity } from '../types';

function pointerAngle(x: number, y: number): number {
  return Math.atan2(x, -y);
}

export function MilestoneMarker({
  activity,
  radius,
  year,
  color,
}: {
  activity: Activity;
  radius: number;
  year: number;
  color: string;
}) {
  const updateActivity = useWheelStore((s) => s.updateActivity);
  const [previewDayDelta, setPreviewDayDelta] = useState<number | null>(null);

  const bind = useDrag(({ first, last, xy: [x, y], event, memo }) => {
    const svg = (event.target as SVGElement).ownerSVGElement;
    const rect = svg!.getBoundingClientRect();
    const localX = x - rect.left - CENTER;
    const localY = y - rect.top - CENTER;
    const currentAngle = pointerAngle(localX, localY);

    const startAngle = first ? currentAngle : memo;
    const dayDelta = Math.round(angleDeltaToDayDelta(currentAngle - startAngle, year));

    if (last) {
      setPreviewDayDelta(null);
      if (dayDelta !== 0) {
        const newDate = addDays(new Date(activity.startDate), dayDelta);
        updateActivity(activity.id, { startDate: newDate.toISOString().slice(0, 10) });
      }
    } else {
      setPreviewDayDelta(dayDelta);
    }

    return startAngle;
  });

  const effectiveDate = previewDayDelta ? addDays(new Date(activity.startDate), previewDayDelta) : new Date(activity.startDate);
  const angle = dateToAngle(effectiveDate, year) - Math.PI / 2;
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);

  return (
    <circle
      {...(bind() as any)}
      data-milestone-id={activity.id}
      cx={x}
      cy={y}
      r={6}
      fill={activity.color ?? color}
      opacity={previewDayDelta !== null ? 0.6 : 1}
      style={{ touchAction: 'none', cursor: 'grab' }}
    />
  );
}
```

- [ ] **Step 2: Verify visually**

Run `pnpm dev:web`. Drag a milestone marker around the ring; confirm it snaps to a new date on release and the change persists after reload.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/wheel/MilestoneMarker.tsx
git commit -m "Add drag-to-move for milestone markers"
```

---

## Task 17: Recurring activities on the wheel

**Files:**
- Modify: `apps/web/src/wheel/CategoryRing.tsx`
- Test: `apps/web/src/wheel/CategoryRing.test.tsx` (extend)

**Interfaces:**
- Consumes: `expandRecurrence` (Task 6).
- Produces: `CategoryRing` now renders one marker/segment per expanded occurrence for activities with a `recurrenceRule`, each tagged with the parent activity's id (per the spec: dragging any occurrence moves the whole series, so all occurrences share one drag target identity).

- [ ] **Step 1: Extend the failing test**

Add to `apps/web/src/wheel/CategoryRing.test.tsx`:

```tsx
it('renders one marker per occurrence for a recurring milestone', () => {
  const recurringActivity: Activity = {
    id: 'a3', ringId: 'r1', title: 'Månedsmøte', notes: null, kind: 'milestone',
    startDate: '2026-01-15', endDate: null,
    recurrenceRule: { type: 'monthly', interval: 1, until: null },
    lane: 1, color: null,
  };
  const { container } = render(
    <svg>
      <CategoryRing ring={ring} ringIndex={0} activities={[recurringActivity]} year={2026} />
    </svg>
  );
  expect(container.querySelectorAll('[data-milestone-id="a3"]')).toHaveLength(12);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test:run CategoryRing`
Expected: FAIL — only 1 marker rendered, not 12.

- [ ] **Step 3: Implement — expand recurring activities before rendering**

```tsx
// apps/web/src/wheel/CategoryRing.tsx
import type { Activity, Ring } from '../types';
import { ActivitySegment } from './ActivitySegment';
import { MilestoneMarker } from './MilestoneMarker';
import { expandRecurrence } from '../geometry/recurrence';
import { CATEGORY_RING_START_RADIUS, CATEGORY_RING_WIDTH, LANE_WIDTH } from './constants';

function occurrencesFor(activity: Activity, year: number): Activity[] {
  if (!activity.recurrenceRule) return [activity];
  const anchor = new Date(activity.startDate);
  const rule = {
    type: activity.recurrenceRule.type,
    interval: activity.recurrenceRule.interval,
    until: activity.recurrenceRule.until ? new Date(activity.recurrenceRule.until) : null,
  };
  return expandRecurrence(anchor, rule, year).map((date) => ({
    ...activity,
    startDate: date.toISOString().slice(0, 10),
  }));
}

export function CategoryRing({
  ring,
  ringIndex,
  activities,
  year,
}: {
  ring: Ring;
  ringIndex: number;
  activities: Activity[];
  year: number;
}) {
  const ringInner = CATEGORY_RING_START_RADIUS + ringIndex * CATEGORY_RING_WIDTH;
  const expanded = activities.flatMap((activity) => occurrencesFor(activity, year));

  return (
    <g>
      {expanded.map((occurrence, i) => {
        const laneInner = ringInner + occurrence.lane * LANE_WIDTH;
        const laneOuter = laneInner + LANE_WIDTH;
        return occurrence.kind === 'range' ? (
          <ActivitySegment
            key={`${occurrence.id}-${i}`}
            activity={occurrence}
            innerRadius={laneInner}
            outerRadius={laneOuter}
            year={year}
            color={ring.color}
          />
        ) : (
          <MilestoneMarker
            key={`${occurrence.id}-${i}`}
            activity={occurrence}
            radius={(laneInner + laneOuter) / 2}
            year={year}
            color={ring.color}
          />
        );
      })}
    </g>
  );
}
```

Note: dragging any occurrence still calls `updateActivity(activity.id, { startDate })` with the *shifted anchor* date, which per the spec moves the whole series (the anchor's month/day-of-week pattern shifts by the drag delta, interval unchanged) — this falls out naturally from Task 16's existing logic since all occurrences share the same `activity.id` and `updateActivity` always writes to the one underlying row.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test:run CategoryRing`
Expected: PASS (both the original 2 tests and the new one).

- [ ] **Step 5: Verify visually**

Add a recurring activity via the panel (Task 12's form needs a recurrence field — if not yet present, verify instead by creating one directly via `curl` against `POST /wheels/:id/activities` with a `recurrenceRule`), then confirm 12 markers appear around the wheel, evenly spaced by month.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/wheel/CategoryRing.tsx apps/web/src/wheel/CategoryRing.test.tsx
git commit -m "Expand recurring activities into per-occurrence markers on the wheel"
```

---

## Task 18: Recurrence field in the activity form

**Files:**
- Modify: `apps/web/src/panel/ActivityForm.tsx`
- Modify: `apps/web/src/panel/ActivityForm.test.tsx` (extend)

**Interfaces:**
- Consumes: shadcn `Select`, `RecurrenceRule`/`RecurrenceType` (Task 3).
- Produces: no new exported interface — closes the gap from Task 17 where recurrence could only be set via `curl`.

- [ ] **Step 1: Extend the failing test**

```tsx
it('includes a recurrenceRule when a repeat interval is chosen', async () => {
  const addActivity = vi.fn().mockResolvedValue(undefined);
  (useWheelStore as any).mockReturnValue({ addActivity });

  render(<ActivityForm ring={ring} onDone={vi.fn()} />);
  await userEvent.type(screen.getByLabelText(/tittel/i), 'Månedsmøte');
  await userEvent.selectOptions(screen.getByLabelText(/gjentakelse/i), 'monthly');
  await userEvent.click(screen.getByRole('button', { name: /lagre/i }));

  expect(addActivity).toHaveBeenCalledWith(
    expect.objectContaining({ recurrenceRule: { type: 'monthly', interval: 1, until: null } })
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test:run ActivityForm`
Expected: FAIL — no element with label "gjentakelse".

- [ ] **Step 3: Implement**

Add to `ActivityForm.tsx`: a `recurrenceType` state (`RecurrenceType | 'none'`, default `'none'`), a `<select id="recurrence" aria-label="Gjentakelse">` with options `Ingen | Daglig | Ukentlig | Månedlig | Årlig` mapping to `none|daily|weekly|monthly|yearly`, and include in the submitted payload:

```ts
recurrenceRule: recurrenceType === 'none' ? null : { type: recurrenceType, interval: 1, until: null },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test:run ActivityForm`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/panel/ActivityForm.tsx apps/web/src/panel/ActivityForm.test.tsx
git commit -m "Add recurrence field to the activity form"
```

---

## Task 19: Tooltip during hover and drag

**Files:**
- Create: `apps/web/src/wheel/ActivityTooltip.tsx`
- Modify: `apps/web/src/wheel/ActivitySegment.tsx`, `apps/web/src/wheel/MilestoneMarker.tsx`

**Interfaces:**
- Consumes: `@floating-ui/react` (`useFloating`, `offset`, `shift`), the preview-delta state already tracked in `ActivitySegment`/`MilestoneMarker` (Tasks 14–16).
- Produces: `ActivityTooltip({ referenceEl: Element | null, label: string })`, mounted once per segment/marker, visible when hovered or while its own drag preview is active.

- [ ] **Step 1: Implement the tooltip component**

```tsx
// apps/web/src/wheel/ActivityTooltip.tsx
import { useFloating, offset, shift, autoUpdate } from '@floating-ui/react';

export function ActivityTooltip({ referenceEl, label, visible }: { referenceEl: Element | null; label: string; visible: boolean }) {
  const { refs, floatingStyles } = useFloating({
    open: visible,
    elements: { reference: referenceEl ?? undefined },
    middleware: [offset(8), shift()],
    whileElementsMounted: autoUpdate,
  });

  if (!visible) return null;

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, position: 'fixed', zIndex: 50 }}
      className="rounded bg-gray-900 px-2 py-1 text-xs text-white shadow"
    >
      {label}
    </div>
  );
}
```

- [ ] **Step 2: Wire into ActivitySegment**

Track a `hovered` boolean via `onPointerEnter`/`onPointerLeave` on the `<path>`, and a `ref` on the `<path>` element (via `useRef<SVGPathElement>`) passed as `referenceEl`. Compute `label` as `` `${format(effectiveStart, 'd. MMM')} – ${format(effectiveEnd, 'd. MMM')}` `` (using `date-fns/format`). Render `<ActivityTooltip referenceEl={pathRef.current} label={label} visible={hovered || previewDayDelta !== null} />` as a sibling (outside the `<svg>`, e.g. via a portal — simplest: render it in a fixed-position `<div>` appended right after `WheelCanvas` in `App.tsx`, using React state lifted via a small `useHoveredActivity()` Zustand slice, OR — simpler for this scope — render the tooltip `<div>` directly adjacent to the `<svg>` in the DOM tree, which floating-ui positions correctly regardless of SVG nesting since it uses `getBoundingClientRect`).

Concretely, in `App.tsx`: keep a Zustand-free `useState<{ el: Element; label: string } | null>` at the `App` level, pass a `setTooltip` callback down as a prop through `CategoryRing` to `ActivitySegment`/`MilestoneMarker`, and render exactly one `<ActivityTooltip>` in `App.tsx` right after the closing `</WheelCanvas>` tag, fed by that single piece of state. This keeps floating-ui's `reference` element resolution simple (one tooltip instance, always positioned via `getBoundingClientRect`, regardless of the SVG's internal transform nesting) instead of mounting one tooltip per segment.

Apply the same pattern to `MilestoneMarker.tsx` with a single-date label.

- [ ] **Step 3: Verify visually**

Run `pnpm dev:web`. Hover over a segment — confirm a tooltip with its date range appears near the cursor. Drag a segment — confirm the tooltip updates live to show the shifted dates, then disappears on release.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/wheel/ActivityTooltip.tsx apps/web/src/wheel/ActivitySegment.tsx apps/web/src/wheel/MilestoneMarker.tsx
git commit -m "Add hover/drag tooltips showing activity dates"
```

---

## Task 20: Zoom and pan

**Files:**
- Modify: `apps/web/src/wheel/WheelCanvas.tsx`
- Create: `apps/web/src/wheel/pointerMath.ts`
- Modify: `apps/web/src/wheel/useSegmentDrag.ts`, `apps/web/src/wheel/ResizeHandle.tsx`, `apps/web/src/wheel/MilestoneMarker.tsx`
- Test: `apps/web/src/wheel/pointerMath.test.ts`

**Interfaces:**
- Consumes: `@use-gesture/react` (`useGesture` with `onWheel`/`onPinch`/`onDrag`).
- Produces: `screenToLocalPoint(el: SVGGraphicsElement, clientX: number, clientY: number): { x: number; y: number }`, replacing the `getBoundingClientRect`/`CENTER` arithmetic used in Tasks 14–16 so pointer math stays correct under any pan/zoom transform. `WheelCanvas` gains internal zoom/pan state, transparent to all children.

Introducing pan/zoom means the three existing drag sites (Task 14's `useSegmentDrag`, Task 15's `ResizeHandle`, Task 16's `MilestoneMarker`) can no longer assume the SVG's on-screen size maps 1:1 to its internal coordinate space — their `rect.left/top - CENTER` math would drift as soon as `transform.scale !== 1`. The fix is to stop computing that mapping by hand and instead ask the SVG for its actual current transform via `getScreenCTM()`, which is correct regardless of how many transforms (pan, zoom, or both) sit above the dragged element.

- [ ] **Step 1: Write the failing test for the coordinate helper**

`getScreenCTM()` doesn't exist in jsdom, so this is tested with a manually constructed fake matrix rather than a real DOM element:

```ts
// apps/web/src/wheel/pointerMath.test.ts
import { describe, it, expect } from 'vitest';
import { applyInverseMatrix } from './pointerMath';

describe('applyInverseMatrix', () => {
  it('maps a screen point back through a pure translation', () => {
    const matrix = { a: 1, b: 0, c: 0, d: 1, e: 100, f: 50 }; // translate(100, 50)
    const result = applyInverseMatrix(matrix, 150, 80);
    expect(result.x).toBeCloseTo(50, 5);
    expect(result.y).toBeCloseTo(30, 5);
  });

  it('maps a screen point back through translation + uniform scale', () => {
    const matrix = { a: 2, b: 0, c: 0, d: 2, e: 100, f: 50 }; // translate(100,50) scale(2)
    const result = applyInverseMatrix(matrix, 200, 150);
    expect(result.x).toBeCloseTo(50, 5);
    expect(result.y).toBeCloseTo(50, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test:run pointerMath`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
// apps/web/src/wheel/pointerMath.ts
export interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export function applyInverseMatrix(m: Matrix2D, screenX: number, screenY: number): { x: number; y: number } {
  const det = m.a * m.d - m.b * m.c;
  const invA = m.d / det;
  const invB = -m.b / det;
  const invC = -m.c / det;
  const invD = m.a / det;
  const invE = (m.c * m.f - m.d * m.e) / det;
  const invF = (m.b * m.e - m.a * m.f) / det;

  return {
    x: invA * screenX + invC * screenY + invE,
    y: invB * screenX + invD * screenY + invF,
  };
}

export function screenToLocalPoint(el: SVGGraphicsElement, clientX: number, clientY: number): { x: number; y: number } {
  const ctm = el.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  return applyInverseMatrix(ctm, clientX, clientY);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test:run pointerMath`
Expected: PASS (2 tests).

- [ ] **Step 5: Replace the rect/CENTER math in the three drag sites with `screenToLocalPoint`**

In `useSegmentDrag.ts`, `ResizeHandle.tsx`, and `MilestoneMarker.tsx`, replace:

```ts
const svg = (event.target as SVGElement).ownerSVGElement;
const rect = svg!.getBoundingClientRect();
const localX = x - rect.left - CENTER;
const localY = y - rect.top - CENTER;
const currentAngle = pointerAngle(localX, localY);
```

with:

```ts
const { x: localX, y: localY } = screenToLocalPoint(event.target as SVGGraphicsElement, x, y);
const currentAngle = pointerAngle(localX, localY);
```

and drop the now-unused `CENTER` import from all three files (the CTM inverse already yields coordinates relative to the CENTER-translated group, since `event.target` is a descendant of it with no transform of its own).

- [ ] **Step 6: Implement WheelCanvas pan/zoom**

```tsx
// apps/web/src/wheel/WheelCanvas.tsx
import { useState, type ReactNode } from 'react';
import { useGesture } from '@use-gesture/react';
import { WHEEL_SIZE, CENTER } from './constants';

export function WheelCanvas({ children }: { children: ReactNode }) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  const bind = useGesture({
    onDrag: ({ offset: [x, y], pinching }) => {
      if (pinching) return;
      setTransform((t) => ({ ...t, x, y }));
    },
    onPinch: ({ offset: [scale] }) => {
      setTransform((t) => ({ ...t, scale: Math.min(Math.max(scale, 0.5), 3) }));
    },
    onWheel: ({ delta: [, dy] }) => {
      setTransform((t) => ({ ...t, scale: Math.min(Math.max(t.scale - dy * 0.001, 0.5), 3) }));
    },
  });

  return (
    <svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`} {...(bind() as any)} style={{ touchAction: 'none' }}>
      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
        <g transform={`translate(${CENTER}, ${CENTER})`}>{children}</g>
      </g>
    </svg>
  );
}
```

Note this task deliberately puts the pan/zoom gesture binding (`bind()`) on the root `<svg>`, while segment/milestone drags bind on their own elements — `@use-gesture/react` scopes each `bind()` call to the element it's spread onto, so a drag starting on an activity segment fires that segment's `onDrag`, not the canvas's, with no extra coordination needed.

- [ ] **Step 7: Verify visually**

Run `pnpm dev:web`. Scroll to zoom in/out (clamped 0.5x–3x), drag empty wheel background to pan, then drag an activity segment, a resize handle, and a milestone while zoomed in — confirm all three track the pointer exactly (no drift) at every zoom level.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/wheel/WheelCanvas.tsx apps/web/src/wheel/pointerMath.ts apps/web/src/wheel/pointerMath.test.ts apps/web/src/wheel/useSegmentDrag.ts apps/web/src/wheel/ResizeHandle.tsx apps/web/src/wheel/MilestoneMarker.tsx
git commit -m "Add zoom/pan and fix drag pointer math to stay correct under any transform"
```

---

## Task 21: Empty states and API error handling

**Files:**
- Modify: `apps/web/src/App.tsx`, `apps/web/src/store/wheelStore.ts`, `apps/web/src/main.tsx`

**Interfaces:**
- Consumes: `useWheelStore().wheel` (Task 9), shadcn's `sonner` `toast` function.
- Produces: no new interface — final polish pass per the spec's Task 6 ("tomtilstander, feilhåndtering i UI").

- [ ] **Step 1: Add sonner for toasts**

Run inside `apps/web`: `npx shadcn@latest add sonner`

In `apps/web/src/main.tsx`, add `<Toaster />` (imported from `@/components/ui/sonner`) as a sibling of `<App />` inside the root render call.

- [ ] **Step 2: Surface store-action failures as toasts**

In `wheelStore.ts`, wrap the body of every action after its `api.xxx(...)` call in `try/catch`, e.g.:

```ts
addActivity: async (input) => {
  const wheel = get().wheel;
  if (!wheel) return;
  try {
    const activity = await api.createActivity(wheel.id, input);
    set({ wheel: { ...wheel, activities: [...wheel.activities, activity] } });
  } catch (err) {
    toast.error('Kunne ikke lagre aktiviteten');
    throw err;
  }
},
```

Apply the identical `try { ... } catch (err) { toast.error('...'); throw err; }` shape to `addRing`, `updateRing`, `removeRing`, `updateActivity`, and `removeActivity`, each with a message naming the failed operation (e.g. `'Kunne ikke slette ringen'`). Import `toast` from `sonner` at the top of `wheelStore.ts`.

- [ ] **Step 3: Add an empty state**

In `App.tsx`, replace the top-level render with:

```tsx
if (!wheel) {
  return <div className="p-8 text-center text-muted-foreground">Laster årshjul…</div>;
}

if (wheel.rings.length === 0) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      Legg til din første ring for å komme i gang.
      <RingManager rings={[]} />
    </div>
  );
}
```

before the existing `<WheelCanvas>`-rendering return path.

- [ ] **Step 4: Verify visually**

Stop the API server while the web app is running, attempt to add an activity, confirm a toast error appears instead of a silent failure or an uncaught promise rejection in the console. Restart the API, confirm normal operation resumes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "Add empty states and toast-based error handling for API failures"
```

---

## Self-Review Notes

- **Spec coverage:** architecture/monorepo (Task 1–2), data model (Task 7), rendering (Tasks 10–11, 17), backend/API (Task 8), sidepanel (Tasks 12–13, 18), drag interaction incl. snapping (Tasks 14–16), tooltip (Task 19), zoom/pan (Task 20), testing strategy (Vitest/RTL/supertest used throughout), empty states/error handling (Task 21) — all spec sections have a corresponding task.
- **Type consistency:** `Activity`, `Ring`, `Wheel`, `RecurrenceRule` (Task 3) are used with identical field names in every later task (store, API client, routes' mappers, components). `angleDeltaToDayDelta` is defined once (Task 14) and imported by Tasks 15–16 rather than redefined.
- **Snapping:** implemented as `Math.round(dayDelta)` at the point of commit in every drag hook (Tasks 14–16), consistent with the spec's "snap to whole days regardless of zoom level."
