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

## Adding a place on the trip

`data/trip.ts` is the trip **as booked**, and nothing writes to it at runtime. Places
found on the ground go somewhere else: `lib/savedPlaces.ts`, persisted to localStorage
through the same store as the tick list. They are kept visibly separate everywhere —
their own pin shape, a "Yours" tag in the list, their own block at the foot of a day —
so the app never blurs "we booked this" into "we might go here".

Both sheets are imported statically, not lazily. Lazy-loading them saved 5 kB on Places
and broke adding a place with no signal — the chunk cannot be fetched when you are
offline, which is the one situation this app exists for. 5 kB is not worth that.

Four ways to get a coordinate, in the order they are worth trying:

| How | When you would use it | Needs signal |
| --- | --- | --- |
| Search the name | You know what it is called. `lib/geocode.ts`, against OpenStreetMap's Nominatim — free, no key, no account. | yes |
| Paste a link | You found it in Google Maps. `lib/parseLocation.ts` reads Google, Apple, Waze, OSM, `geo:` and bare coordinates. | no |
| Use my location | You are standing in it. | no |
| Drop a pin | You can see it but it is not on any map. The map moves under a fixed crosshair, because your thumb covers the spot you are aiming at. | no |

Search is the only part of this app that needs a connection, and the only one that can
come back empty. OSM knows the malls, the hotels, the ferry terminal and the mosques; it
very often does not know the warung that opened last year, which is exactly the sort of
place you would be adding. So it is one route among four rather than the way in, and
every failure message — offline, rate-limited, unreachable, nothing found — names one of
the other three instead of apologising. Nominatim's policy caps use at one request a
second and forbids bulk, which is why there is no search-as-you-type: you press a button,
and `MIN_GAP_MS` refuses a second request sent too soon.

Results are ranked by distance from the trip, not by Nominatim's own score. That score is
global, so searching "Sederhana" ranks a large place in Java above a small one on Batam;
anything within 60 km is promoted, and anything outside is tagged **far** rather than
hidden — Johor Bahru and Singapore are both legitimately on the way.

**Unverified:** the live Nominatim call has never run. The network policy where this was
built blocks it, so `lib/geocode.test.ts` works against recorded response shapes and a
fake `fetch`, and the browser tests stub the route. The request shape and every failure
path are covered; that OpenStreetMap still answers in this shape is not.

Two details in the parser earn their tests. A Google link carries the place **and** the
camera — `!3d…!4d…` is the pin, `@lat,lon` is where the map was looking, and they differ
by streets if you panned before copying, so the pin wins. And a shortened
`maps.app.goo.gl` link carries no coordinates at all; following it needs a connection
and Google blocks the request from a browser, so the app says so and points at "Drop a
pin" rather than failing blankly.

A place you add can be given a day, or left without one. Left without one it stays out
of every day filter and out of every day's plan — that is a real answer, not a missing
one, and defaulting it to a day would be the app deciding your itinerary. Given a day,
it appears under "Yours, on this day" at the foot of that day, deliberately **not**
folded into the four meal courses: which course a place lands in is derived from the
trip data (`lib/meals.ts`), and the app knows nothing about somewhere you just heard
about.

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
| `/` | 94–95 | 100 |
| `/places` | 91–96 | 100 |
| `/lines/4` | 98 | 100 |
| `/costs` | 98–99 | 100 |
| `/map` | 81–86 | 100 |

Zero axe violations (WCAG 2.1 A and AA) on all six routes, and no horizontal overflow at
390, 414 or 768 px.

Performance is quoted as a range because it is a range: repeated runs on the same build
and machine vary by several points. **`/map` sits in the low-to-mid 80s and does not meet
the 90+ bar**, which is the one place this falls short of the brief. It is MapLibre's own
start-up cost — around 500 ms of blocking time to parse and initialise the GL renderer,
on a screen that is a map. Everything the app does around it has already been moved off
the critical path: the library is code-split, the 33 markers build on the next frame
rather than in the constructor's task, and regrouping is throttled to one pass per frame.
Getting past 90 would mean not showing a map until the user asks for one, which is a
worse app. Worth re-measuring on your own hardware before treating any number here as
the truth.

## Pins cluster

Fifteen of the thirty-three stops sit within a couple of kilometres of Nagoya, so at the
opening zoom they piled up: unreadable, and their 44px hit areas overlapped so you could
not reliably tap the one you meant. `lib/cluster.ts` groups them by where they land on the
glass — screen pixels, not degrees, because the same two places need grouping at zoom 11
and not at zoom 16. Tapping a group zooms to where it comes apart.

A group is anchored on its seed point rather than its members' centroid. Seeds are
guaranteed to be at least a radius apart, so bubbles never collide; centroids have no such
guarantee and two groups can drift into each other, which is the exact problem clustering
was there to solve. A group takes its line's colour when every member shares a day, and ink
when it spans more than one — the colour still means "which day", or says nothing.

## Prayer times

`lib/prayer.ts` computes them on the device from the sun's position — no network, because
the premise is that none is available. **Subuh 20°, Isyak 18°, Asar at shadow factor 1
(Shafi'i)**, the parameters both Kemenag (Indonesia) and JAKIM (Malaysia) publish, so the
same numbers hold either side of the strait.

Verified against Kuala Lumpur, where JAKIM's times are published and where the city sits
far enough from its timezone meridian to catch a longitude sign error that Batam would
not: Zohor and Maghrib land within four minutes. The card says on screen that the times
are calculated rather than authoritative, because a family that keeps them should know
which they are looking at.

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
