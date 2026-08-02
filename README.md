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
- [x] 3 · Strip map component, station sheet, derived running order
- [x] 4 · Places index with search and filter
- [x] 5 · Location: permission flow, live distances, fallbacks
- [x] 6 · MapLibre map screen
- [x] 7 · The advisor
- [x] 8 · Animation pass
- [x] 9 · PWA, offline, install
- [x] 10 · Accessibility and Lighthouse pass

## The advisor

`lib/advisor.ts` is a **rules engine, not a model** — option (a). Three reasons: the app
has to work with no signal, which an API route cannot; the constraints come from the
family rather than from a general travel model, so they need to be guarantees rather
than good intentions; and a scoring function can be tested, which an LLM's answer
cannot. `advisor.test.ts` holds it to every one of them.

Hard rules, which filter candidates out entirely:

- Shut is shut.
- Never Pink Beach before 12:30.
- No drive over ten minutes between 13:00 and 15:00 — the nap is protected.
- On 25 August, nothing that cannot be reached and enjoyed for an hour before 15:00,
  because bag check-in shuts at 16:30 and the ride is 25 minutes. After 15:00 it stops
  recommending places at all and says to head for Harbour Bay.
- Never a hotel or the ferry terminal.

Soft rules, which score what is left: today's line (+3, crossing lines costs 1.5),
distance (steeply — twenty minutes in a car with a toddler is the difference between an
outing and an ordeal), outdoor things penalised between 10:00 and 16:00 and rewarded
outside it, indoors preferred when raining or after 18:00, mealtimes, a toddler-suitability
weight per category, and a penalty for anywhere about to close.

It returns **one** recommendation with one sentence of reasoning. A list is what you
produce when nobody will decide. "Tick it off" persists to localStorage and it stops
suggesting that place.

## Offline

The service worker keeps two caches: the app shell (cache-first — the assets are
content-hashed) and map tiles (cache-first, capped at 700, and a tile that will not load
leaves paper rather than an error). Everything else — the trip data, the distances, the
running order, the advisor — is compiled into the bundle and needs no network at all.

Verified with the network cut: every route renders fully, 64 assets cached.

## Measured

Lighthouse mobile, on the production build:

| Route | Performance | Accessibility |
| --- | --- | --- |
| `/` | 96 | 100 |
| `/places` | 95 | 100 |
| `/lines/4` | 98 | 100 |
| `/costs` | 98 | 100 |
| `/map` | 90 | 96 |

Zero axe violations (WCAG 2.1 A and AA) on all six routes, and no horizontal overflow at
390, 414 or 768 px.

The one thing `/map` is flagged for is **target spacing**: the pins are 44×44 as required,
but real places 400 m apart overlap at the default zoom, so their hit areas touch. That is
inherent to plotting 33 true coordinates on one screen, it is the case WCAG 2.5.8 exempts
for content-determined positions, and zooming separates them. Its 96 is still above the
stated bar.

## Two things worth your judgement

**Pins are line-coloured, not category-coloured.** §4 asked for category-coloured pins,
but §7 says line colour always encodes which day something belongs to and is never
decorative. Colouring by category on one screen would quietly break that, so the pin body
is the line colour and the **category glyph** sits inside it — which is what the colour was
for. Easy to swap if you would rather have it the other way.

**Line 4 is a lot of day.** 15 stations and 32.3 km end to end, with an 8.8 km hop to Gerai
Nelayan and another 9.4 km to Pink Beach. The router is not misbehaving — line 4 genuinely
spans the whole north of the island. With a toddler that is a lot of car, and you may want
to move some of those stops onto another day.

## The running order is derived, not scheduled

The trip data has no per-place times, and none are invented. `lib/route.ts` builds a
*sequence* for each day and the strip map draws it. The rules, in order:

1. **Where the day starts.** A ferry that lands today beats a hotel you check out of
   today, which beats the hotel you woke up in. That last one is why the Radisson opens
   days three and four despite belonging to line 2 — that is what an interchange is.
2. **Bags first.** A hotel you check into today comes straight after the opening stop.
3. **Except for what you cross on the way.** A `land` stop that sits roughly on the
   straight line to that hotel is visited en route, which is how Barelang Bridges stay
   between the terminal and the Harris. Only `land` qualifies; a mall on the same road
   is still a detour when you are carrying four bags and a toddler.
4. **Morning before afternoon.** Anything shut until midday is routed into the back half
   of the day, so Pink Beach can never open one.
5. **Then nearest-neighbour**, run separately over each half, so consecutive stops are
   near each other rather than bouncing across the island.
6. **Where the day ends.** Only the ferry home qualifies.

The only clock times shown anywhere are real: the ferry, the bag check-in window, and
published opening hours. A place with no published hours gets no time at all, and a
place that came with an opening time and no closing time says "from 12:30" rather than
guessing a shutter. The screen says "a suggested order, not a timetable" because that
is what it is.
