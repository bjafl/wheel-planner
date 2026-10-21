# Wheel Planner

An interactive *årshjul* (annual wheel) planner: a radial timeline of one
calendar year where activities, milestones and recurring events are drawn as
arcs and markers on concentric category rings — and edited by dragging them
directly on the wheel. The focus is on direct-manipulation UI; the backend is
a deliberately simple Express + SQLite API.

## Status

Working single-user prototype. All 21 tasks in the implementation plan
(`docs/superpowers/plans/`) are done, and the geometry, store, API and key
components have tests.

Known limits: there is no UI for creating or choosing a wheel yet — the app
creates one wheel per browser (for 2026) on first run and remembers its id in
`localStorage`. No auth, multi-user, multi-year view, export or undo/redo
(explicitly out of scope in the design spec).

## Features

- **The wheel** — SVG rendering of a month ring, a "today" marker and one
  ring per category, with activities as arcs and milestones as point markers.
- **Drag to edit** — move a whole activity, resize either edge with handles,
  or move a milestone; dates update as you drag.
- **Recurring activities** — daily / weekly / monthly / yearly rules with an
  interval and optional end date, expanded into per-occurrence markers.
- **Lane packing** — overlapping activities in the same ring are packed into
  separate lanes automatically.
- **Ring management** — add, remove and drag-to-reorder category rings.
- **Side panel** — form and list for creating, editing and deleting
  activities and milestones.
- **Zoom and pan** on the canvas, hover/drag tooltips with dates, text labels
  on the wheel, empty states and toast errors when the API fails.

The UI text is in Norwegian.

## Tech stack

| Part | Stack |
| --- | --- |
| Web | React 19, TypeScript, Vite, Zustand, Tailwind CSS 4, shadcn/ui |
| Wheel geometry | Hand-written SVG with `d3-shape` / `d3-scale`, `date-fns` |
| Interaction | `@use-gesture/react` (drag, zoom, pan), `@dnd-kit` (ring reordering), Floating UI (tooltips) |
| API | Express 5, `better-sqlite3` |
| Tooling | pnpm workspaces, just, Vitest + Testing Library, Supertest, oxlint |

## Project layout

```
apps/
  web/src/
    geometry/   pure functions: date↔angle, lane packing, recurrence (no React/DOM)
    wheel/      SVG components: rings, segments, handles, markers, canvas, pointer math
    panel/      activity form/list, ring manager
    store/      Zustand store, persists every change through the API
    api/        fetch client
  api/src/
    db/         SQLite schema + client
    routes/     REST endpoints for wheels, rings, activities
docs/superpowers/
  specs/        design spec (Norwegian)
  plans/        task-by-task implementation plan
```

Data model: a **wheel** (title, year) has ordered, coloured **rings**; a ring
has **activities**, each either a date `range` or a `milestone`, with an
optional recurrence rule and a lane index.

## Getting started

Requires Node.js, pnpm and [just](https://github.com/casey/just).

```bash
just install
cp .env.example .env   # optional — host/port for web (5173) and API (3001)
just dev               # API + web dev servers together
```

Open http://localhost:5173. The Vite dev server proxies API calls to the API,
which stores data in a local `wheel-planner.sqlite` file.

Other recipes:

```bash
just test    # web + API tests
just build   # type-check and build the web app
just lint    # oxlint
```

## License

MIT — see [LICENSE](LICENSE).
