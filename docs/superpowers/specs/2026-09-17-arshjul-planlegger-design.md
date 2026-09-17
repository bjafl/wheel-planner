# Årshjul-planlegger — design

Dato: 2026-09-17

## Formål

Et internt planleggingsverktøy for å visualisere og redigere aktiviteter,
milepæler og repeterende hendelser i et årshjul (radial tidslinje for ett
kalenderår). Fokus på UI/UX og direkte manipulering på selve hjulet, med en
enkel test-backend (SQLite) og rom for videre vekst (flerbruker,
autentisering, flere år) uten at nåværende design må rives opp.

## Omfang for denne spec-en

Alt beskrevet under er første leveranse ("MVP med drag fra start" — bruker
har eksplisitt prioritert direkte manipulering fremfor en tryggere,
skjema-først MVP). Rekkefølgen aktivitetene bygges i er beskrevet under
"Byggefaser", men alt inngår i samme leveranse — det er ikke separate
release-milepæler.

**Eksplisitt utenfor omfang (kan bli egne fremtidige spec-er):**
- Flerbruker/samarbeid, autentisering
- Visning av flere år samtidig / rullerende 12-månedersvindue
- Eksport (PDF/bilde) eller deling til eksterne brukere
- Undo/redo
- Mobil/touch-optimalisert layout utover det `@use-gesture/react` gir gratis

## Arkitektur

Anbefalt tilnærming (av tre vurderte — se avsnittet "Vurderte
alternativer" for detaljer og avveininger): egen SVG-rendering med
`d3-shape`/`d3-scale` for geometri, Zustand for state, og en Express +
`better-sqlite3`-backend fra dag 1. Dette gir full kontroll over
drag/resize-geometrien (som uansett må skrives for hånd, uavhengig av
rendering-bibliotek), passer naturlig med Tailwind/shadcn for styling og
tilgjengelighet, og unngår en unødvendig frontend→backend-migrering senere.

### Prosjektstruktur

Monorepo med **pnpm workspaces**:

```
wheel-planner/
├── pnpm-workspace.yaml
├── package.json
├── apps/
│   ├── web/                  (Vite + React + TS + Tailwind + shadcn/ui)
│   │   └── src/
│   │       ├── wheel/        (SVG-rendering: ringer, segmenter, markører)
│   │       ├── geometry/     (rene funksjoner: dato↔vinkel, lane-packing, recurrence)
│   │       ├── store/        (Zustand store)
│   │       ├── panel/        (skjema/liste for CRUD på aktiviteter/ringer)
│   │       └── api/          (fetch-klient mot backend)
│   └── api/                  (Express + better-sqlite3)
│       └── src/
│           ├── db/           (schema, migrations)
│           └── routes/       (REST-endepunkter)
```

`geometry/` inneholder ingen React/DOM-avhengigheter. Dette gjør
dato↔vinkel-mapping, lane-packing og recurrence-utfolding trivielt
enhetstestbare isolert, og gjenbrukbare uendret dersom rendering-strategien
endres senere.

Kommunikasjon frontend↔backend er enkel REST over JSON. Ingen
websockets/sanntid nå (matcher "internt verktøy, ikke flerbruker ennå"),
men et rent REST-lag gjør det enkelt å legge til senere uten å endre
datamodellen.

## Datamodell

SQLite-skjema, rå SQL/tynn query-builder (ingen ORM — unødvendig for dette
omfanget):

```sql
wheels        (id, title, year, created_at)
rings         (id, wheel_id, name, order_index, color)
activities    (
  id, ring_id, title, notes,
  kind,                  -- 'range' | 'milestone'
  start_date, end_date,  -- end_date NULL for milestone
  recurrence_rule,       -- NULL, eller JSON: {type, interval, until?}
  lane,                  -- heltall, satt av lane-packing
  color                  -- valgfri override av ring-fargen
)
```

Nøkkelbeslutninger:

- **`ring` = kategori-ring**, med egen rekkefølge og farge.
- **`lane` beregnes av en ren funksjon i `geometry/`** hver gang aktiviteter
  i en ring endres (sorter etter startdato, plasser i første ledige bane),
  men **resultatet lagres** i stedet for å regnes ut live ved hver
  rendering. Dette er en UX-avveining, ikke en ytelsesoptimalisering: når
  brukeren drar én aktivitet, skal andre aktiviteters lane forbli stabil
  med mindre kollisjonen faktisk krever omplassering — enklere å style
  riktig når laget er eksplisitt tilstand man kan sammenligne før/etter.
- **Repeterende hendelser** lagres som én rad med en regel
  (`daily|weekly|monthly|yearly` + intervall + valgfri sluttdato).
  `geometry/`-laget utfolder regelen til konkrete forekomster *for det
  valgte året* ved rendering — ingen egen rad per forekomst, som gjør
  redigering av hele serien enklere og unngår duplisering.
- **`kind` som diskriminator** (range/milestone) i én tabell fremfor to,
  siden feltene nesten er identiske og kun `end_date` skiller dem.

## Hjul-rendering & interaksjon

Komponenthierarki (SVG):

```
<WheelCanvas>              ← <svg>, eier zoom/pan-transform (@use-gesture/react)
  <MonthRing />            ← ytterste ring: måneds-/dag-segmenter + labels
  <TodayMarker />          ← radiell strek ved dagens dato
  <CategoryRing ring={r}>  ← én per kategori-ring
    <ActivitySegment />    ← 'range': arc med to drag-håndtak (start/slutt) + midtsone (flytt hele)
    <MilestoneMarker />    ← 'milestone': punkt-markør, draggbar langs sirkelen
  </CategoryRing>
</WheelCanvas>
```

Tre draggester, alle basert på samme rene funksjon `angleToDate(angle,
year)` fra `geometry/` (komponentene selv inneholder ingen dato-matte, kun
pointer-håndtering via `@use-gesture/react`):

1. **Flytte hele segmentet** (dra i midten): vinkel→dato med offset låst
   ved drag-start, hele intervallet forskyves likt, varighet uendret.
2. **Resize kant** (eget håndtak i hver ende): kun `start_date` eller
   `end_date` oppdateres, med clamp så start aldri passerer slutt.
3. **Flytte milepæl**: samme mapping, skriver til én enkelt dato.

**Live feedback under drag:** lokal komponent-state holder
"ghost"-posisjonen mens man drar (unngår at hver `pointermove` trigger
global re-render 60x/sekund); commit til Zustand-store (og dermed
lane-recompute + API-kall) skjer først på `dragEnd`.

**Snapping:** til hele dager, uansett zoom-nivå.

**Dragging av repeterende hendelser:** siden en repeterende hendelse er én
rad (ikke én per forekomst — se Datamodell), flytter drag av *en hvilken
som helst* synlig forekomst hele serien: `start_date` (ankerdatoen for
regelen) forskyves med samme delta som forekomsten ble dratt, mens
intervall/regel forblir uendret. Å redigere kun én forekomst annerledes
enn resten av serien er eksplisitt utenfor omfang for denne leveransen.

**Tooltip/popover** (`@floating-ui/react`): vises på hover og under drag,
viser gjeldende dato(er) i klartekst.

## Backend & API

```
GET    /wheels/:id                 → hele hjulet: wheel + rings + activities
POST   /wheels                     → opprett nytt årshjul
POST   /wheels/:id/rings
PUT    /wheels/:id/rings/:ringId
DELETE /wheels/:id/rings/:ringId
POST   /wheels/:id/activities
PUT    /activities/:id
DELETE /activities/:id
```

Lane-packing kjøres på klienten og sendes med i request-body ved
skriving — unngår kodeduplisering mellom frontend/backend i første omgang
uten å innføre en delt workspace-pakke for én liten funksjon.

Ingen React Query/datahentings-bibliotek i første omgang: lav
trafikkmengde (ett hjul, sjeldne skriv), Zustand + optimistisk oppdatering
er tilstrekkelig. Kan legges til senere om cache-invalidering blir et
reelt problem.

## Sidepanel (sekundær redigeringsvei)

- shadcn `Sheet`/`Dialog` for aktivitets-skjema (tittel, ring, start/slutt
  eller milepæl-dato, recurrence, farge)
- shadcn-basert liste/søk for å bla gjennom aktiviteter
- Ring-administrasjon (legg til/fjern/reorder) som egen enkel liste;
  `@dnd-kit/sortable` vurderes kun for denne listen (helt separat fra
  hjul-dragingen, som bruker `@use-gesture/react`)

## Testing

- **Vitest** for `geometry/`: round-trip-tester for `angleToDate`/
  `dateToAngle`, lane-packing mot kjente overlapp-scenarier, recurrence-
  utfolding for gitt regel+år mot forventede forekomster. Høy verdi siden
  feil her er subtile og lett å ikke oppdage visuelt.
- **React Testing Library** for panel/skjema-CRUD-flyt.
- Drag-interaksjon verifiseres **manuelt i nettleser** — pointer-gesture-
  simulering i jsdom gir lav tillit til reell UX.
- Backend: integrasjonstester mot en in-memory/temp SQLite-fil per test.

## Byggefaser

Bygge-rekkefølge (ikke separate leveranser — alt inngår i samme MVP):

1. Monorepo-oppsett (pnpm workspaces, Vite+React+TS+Tailwind+shadcn,
   Express+better-sqlite3), DB-skjema + migrations
2. `geometry/`-laget med full testdekning (TDD)
3. Statisk hjul-rendering mot testdata, ingen interaksjon ennå
4. Sidepanel CRUD mot ekte backend, koblet til Zustand-store
5. Drag-interaksjon (flytt, resize, milepæl-drag) med snapping og tooltip
6. Polering: farger/typografi, zoom/pan, tomtilstander, feilhåndtering i UI

## Vurderte alternativer

**B) @visx/shape-komponenter + kun localStorage/JSON, backend utsatt.**
Samme geometri-motor under panseret (visx er en tynn React-wrapper rundt
d3). Raskere til første skjermvisning, men bruker har allerede bestemt seg
for en enkel backend nå — å bygge frontend-only først og migrere til
SQLite etterpå er ekstra arbeid uten reell gevinst, og visx løser uansett
ikke selve drag-logikken. Forkastet.

**C) Canvas-rendering** (som referanseprosjektet AgileVentures/
year_wheel_project). Kan skalere bedre med svært mange segmenter, men
mister gratis DOM-hit-testing, er vanskeligere å style med Tailwind/shadcn,
og gir dårligere tilgjengelighet. Dårlig match gitt uttalt UI/UX-fokus.
Forkastet.
