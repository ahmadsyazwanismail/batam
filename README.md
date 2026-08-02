# Batam Lines

A trip companion for one specific family trip: Batam, Indonesia, 21–25 August 2026,
two adults and a daughter who will be 1 year 10 months.

The organising metaphor is a transit network. Each day is a numbered, coloured
**line**. The two hotels are **interchanges**. Each place is a **station**.

The app has three jobs, in this order:

1. Where am I and what is near me right now
2. What is the plan for today
3. What does it cost

There is no backend and no database. The trip data is a typed module compiled into
the bundle, so the whole app works with no signal — which matters, because they will
be roaming.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Unit tests (vitest) |
| `npm run typecheck` | `tsc --noEmit`, strict |
| `npm run lint` | ESLint |

## Deploying

Vercel, with no configuration. Push the repo, import it, accept the detected Next.js
settings. There are no environment variables and no secrets — nothing in the app calls
out to anything.

```bash
npx vercel --prod
```

## Layout

```
app/        Routes. One per screen, plus /lines/[id] for a single day.
components/ UI. `screens/` holds a whole screen; the rest are pieces.
lib/        Geometry, time, contrast, motion vocabulary, state.
data/       trip.ts — the entire trip, typed. The only source of truth.
```

`data/trip.ts` is the file to read first. Everything else is a view of it.

## Notes on the data

Some places sit **inside** a mall and get no map pin of their own — Chikuro, Top 100,
Sociolla and Marugame Udon are inside Grand Batam Mall; Renuin is inside Nagoya Hill.
They are still indexed for search, so looking for "Renuin" finds the mall you actually
walk into. `MAP_PLACES` is the pinnable subset; `PLACES` is all 38.

Every time in the app is **WIB**, and Batam is one hour behind Malaysia. Nothing reads
the device timezone — the phone will be roaming and may or may not have shifted — so
clocks are computed from the UTC instant and a fixed +7 offset, and always labelled.
`lib/time.ts` is the only place that knows this.

## Two places this departs from the brief

Both are contrast, and both are the design brief (§7) meeting the quality bar (§9)
head-on. Both are enforced by `lib/contrast.test.ts` so they cannot drift.

**`muted` is `#666B73`, not `#6B7078`.** The specified value measures 4.49:1 against
paper — a hundredth under the 4.5:1 bar, and it is the colour every caption is set in.
One step darker clears it at 4.83:1 and is not perceptibly different.

**Line colours have a darkened sibling for when they are used as text.** The five line
colours are unchanged and are what you see everywhere the colour is a *shape* — bullets,
spines, pins, chips, the tab indicator. But Crosstown orange as *text* on paper is
2.4:1, which fails even the large-text bar, so each line also carries a `textColour`
that clears 4.5:1 on both paper and card. Purple already passed and is untouched.

Relatedly, the numeral inside a line bullet is white on the dark lines and ink on the
light ones, the way a real network handles a yellow line, and bullets are never set
below 20px bold.

## Build order

The brief lists ten steps. Done so far:

- [x] 1 · Data module and types, haversine and distance-verdict helpers, unit tests
- [x] 2 · Shell: bottom tab bar, routing, design tokens
- [ ] 3 · Strip map component
- [ ] 4 · Places index with search and filter
- [ ] 5 · Location: permission flow, live distances, fallbacks
- [ ] 6 · MapLibre map screen
- [ ] 7 · The advisor
- [ ] 8 · Animation pass
- [ ] 9 · PWA, offline, install
- [ ] 10 · Accessibility and Lighthouse pass

Today, Lines and Costs render real data. Map and Places are placeholders that say which
step fills them in.
