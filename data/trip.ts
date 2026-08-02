/**
 * The trip.
 *
 * Everything in this file is real and already booked. It is bundled at build
 * time so the app works with no signal at all — there is no backend, no fetch,
 * and nothing here is fetched, derived from an API, or guessed.
 *
 * All times in this module are WIB (Batam, UTC+7). Malaysia is one hour ahead.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Category =
  | 'hotel'
  | 'ferry'
  | 'land'
  | 'beach'
  | 'food'
  | 'shop'
  | 'spa'
  | 'dino';

export type DayId = 1 | 2 | 3 | 4 | 5;

/** Minutes from midnight, WIB. 13:30 is 810. */
export type MinutesOfDay = number;

export interface OpeningHours {
  /** Inclusive. */
  readonly opens: MinutesOfDay;
  /**
   * Exclusive, and only where it is actually known. Pink Beach and Morning
   * Bakery came with an opening time and nothing else, so they have none — the
   * app says "from 12:30" rather than inventing a shutter time.
   */
  readonly closes?: MinutesOfDay;
}

/**
 * A shop or restaurant inside a mall. Tenants never get their own map pin —
 * they are drawn as contents of the parent — but they are indexed for search,
 * so looking for "Renuin" finds Nagoya Hill.
 */
export interface Tenant {
  readonly name: string;
  /**
   * Set when the tenant is also a row in {@link PLACES}. Typed as `string`
   * rather than `PlaceKey` because `PlaceKey` is derived from `PLACES` and the
   * two would reference each other. `trip.test.ts` checks every one resolves.
   */
  readonly placeKey?: string;
  readonly floor?: string;
  readonly note?: string;
}

export interface Place {
  readonly key: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
  readonly category: Category;
  readonly day: DayId;
  readonly note: string;
  /** Set on malls. These are drawn as contents rather than as separate pins. */
  readonly tenants?: readonly Tenant[];
  /** Set on a place that lives inside a mall. Suppresses its own map pin. */
  readonly insideOf?: string;
  /** Only where the hours are known and hard. Absent means "not pinned down". */
  readonly opening?: OpeningHours;
}

export interface Day {
  readonly id: DayId;
  /** ISO date, the day this line runs. */
  readonly date: string;
  /** Weekday as printed on the ticket, e.g. "Fri". */
  readonly weekday: string;
  readonly name: string;
  /**
   * The line colour, exactly as specified. Used for anything the colour *is* —
   * bullets, spines, pins, chips, the tab indicator.
   */
  readonly colour: string;
  /**
   * The numeral inside the bullet. White on the dark lines, ink on the light
   * ones, the way real transit signage handles a yellow line.
   */
  readonly onColour: string;
  /**
   * The line colour when it has to be *text* on paper. Orange at 2.4:1 is
   * unreadable, so each line has a darkened sibling that clears 4.5:1 on both
   * paper and card. Same hue, and `colour` is still what you see everywhere the
   * colour is a shape rather than a word. `contrast.test.ts` holds it to that.
   */
  readonly textColour: string;
  /** The hotel this day starts and ends at — the interchange. */
  readonly base: PlaceKey;
}

export interface Booking {
  readonly hotel: PlaceKey;
  readonly hotelName: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly nights: number;
  readonly room: string;
  readonly priceMYR: number;
  readonly note?: string;
}

export interface FerryLeg {
  readonly direction: 'out' | 'back';
  readonly from: string;
  readonly to: string;
  readonly date: string;
  readonly departs: string;
  readonly departsZone: 'MYT' | 'WIB';
  readonly arrives?: string;
  readonly arrivesZone?: 'MYT' | 'WIB';
}

export interface CostRow {
  readonly label: string;
  readonly lowMYR: number;
  readonly highMYR: number;
  readonly note?: string;
}

export interface Warning {
  readonly key: string;
  readonly title: string;
  readonly body: string;
}

// ---------------------------------------------------------------------------
// Shape of the trip
// ---------------------------------------------------------------------------

export const TRIP = {
  title: 'Batam',
  startDate: '2026-08-21',
  endDate: '2026-08-25',
  travellers: '2 adults + 1 daughter (1 y 10 m)',
  /** Batam runs on WIB, UTC+7. Home runs on MYT, UTC+8. */
  tzOffsetHours: 7,
  homeTzOffsetHours: 8,
  tzLabel: 'WIB',
  homeTzLabel: 'MYT',
} as const;

export const INK = '#16181C';
export const PAPER = '#F4F3EE';
export const CARD_BG = '#FBFAF6';

export const DAYS: readonly Day[] = [
  {
    id: 1,
    date: '2026-08-21',
    weekday: 'Fri',
    name: 'Arrival',
    colour: '#D93F3F',
    onColour: '#FFFFFF',
    textColour: '#C53939',
    base: 'harris',
  },
  {
    id: 2,
    date: '2026-08-22',
    weekday: 'Sat',
    name: 'Crosstown',
    colour: '#E08A1E',
    onColour: INK,
    textColour: '#9B5F15',
    base: 'radisson',
  },
  {
    id: 3,
    date: '2026-08-23',
    weekday: 'Sun',
    name: 'Batam Centre',
    colour: '#2E9E6B',
    onColour: INK,
    textColour: '#247B53',
    base: 'radisson',
  },
  {
    id: 4,
    date: '2026-08-24',
    weekday: 'Mon',
    name: 'Northern loop',
    colour: '#2C74BC',
    onColour: '#FFFFFF',
    textColour: '#2A6FB4',
    base: 'radisson',
  },
  {
    id: 5,
    date: '2026-08-25',
    weekday: 'Tue',
    name: 'Departure',
    colour: '#7D4FB0',
    onColour: '#FFFFFF',
    // Purple already clears the bar as text, so it is left exactly as specified.
    textColour: '#7D4FB0',
    base: 'radisson',
  },
];

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

const hhmm = (h: number, m = 0): MinutesOfDay => h * 60 + m;

/**
 * Held `as const` only so {@link PlaceKey} can be derived from the keys.
 * Everything else reads {@link PLACES}, which is the same array with the
 * literal types widened back to `Place`.
 */
const PLACE_DATA = [
  // -- Line 1 · Arrival ------------------------------------------------------
  {
    key: 'ferry',
    name: 'Harbour Bay Ferry Terminal',
    lat: 1.15384,
    lon: 103.99737,
    category: 'ferry',
    day: 1,
    note: 'camera collected here on arrival',
  },
  {
    key: 'barelang',
    name: 'Barelang Bridges',
    lat: 1.0293,
    lon: 104.015,
    category: 'land',
    day: 1,
    note: 'crossed on the drive down',
  },
  {
    key: 'harris',
    name: 'Harris Resort Barelang',
    lat: 0.9825,
    lon: 104.0341,
    category: 'hotel',
    day: 1,
    note: '21–22 Aug · pool access room',
  },

  // -- Line 2 · Crosstown ----------------------------------------------------
  {
    key: 'radisson',
    name: 'Radisson Golf',
    lat: 1.1034,
    lon: 104.0318,
    category: 'hotel',
    day: 2,
    note: '22–25 Aug · golf view, balcony',
  },
  {
    key: 'alya',
    name: 'Alya Layer Cakes',
    lat: 1.1085146,
    lon: 104.0372765,
    category: 'food',
    day: 2,
    note: 'order am · free hotel delivery',
  },
  {
    key: 'bandoeng',
    name: 'Bandoeng Resto',
    lat: 1.1094872,
    lon: 104.0409454,
    category: 'food',
    day: 2,
    note: 'Sundanese',
  },
  {
    key: 'ksquare',
    name: 'K Square',
    lat: 1.1011,
    lon: 104.0368,
    category: 'shop',
    day: 2,
    note: 'nearest mall to Radisson',
  },
  {
    key: 'pagisore',
    name: 'Pagi Sore',
    lat: 1.1069691,
    lon: 104.0293397,
    category: 'food',
    day: 2,
    note: '500 m from Radisson',
  },

  // -- Line 3 · Batam Centre -------------------------------------------------
  {
    key: 'dapurnina',
    name: 'Dapur Nina',
    lat: 1.1276006,
    lon: 104.0465854,
    category: 'food',
    day: 3,
    note: 'Greenland',
  },
  {
    key: 'garuda',
    name: 'Garuda',
    lat: 1.1203823,
    lon: 104.0483364,
    category: 'food',
    day: 3,
    note: 'nasi padang',
  },
  {
    key: 'ikanbakar',
    name: 'Ikan Bakar Cianjur',
    lat: 1.1274183,
    lon: 104.0509873,
    category: 'food',
    day: 3,
    note: 'near the mosque',
  },
  {
    key: 'maru',
    name: 'Maru Bake House',
    lat: 1.1274,
    lon: 104.0327,
    category: 'food',
    day: 3,
    note: 'pumpkin donuts',
  },
  {
    key: 'masjid',
    name: 'Masjid Agung',
    lat: 1.1262463,
    lon: 104.0534015,
    category: 'land',
    day: 3,
    note: 'Raja Hamidah',
  },
  {
    key: 'mietarempa',
    name: 'Mie Tarempa Sungai Panas',
    lat: 1.1371,
    lon: 104.0253,
    category: 'food',
    day: 3,
    note: 'luti gendang',
  },
  {
    key: 'mula',
    name: 'Mula Patisserie',
    lat: 1.1245615,
    lon: 104.0473261,
    category: 'food',
    day: 3,
    note: 'salted cream matcha',
  },
  {
    key: 'sambal',
    name: 'Sambal Bakaran',
    lat: 1.125535,
    lon: 104.0412957,
    category: 'food',
    day: 3,
    note: 'sambal lamongan',
  },
  {
    key: 'welcome',
    name: 'Welcome to Batam sign',
    lat: 1.1223,
    lon: 104.0534,
    category: 'land',
    day: 3,
    note: 'night market in the evening',
  },

  // -- Line 4 · Northern loop ------------------------------------------------
  {
    key: 'amanda',
    name: 'Amanda Brownies',
    lat: 1.1444,
    lon: 104.0137,
    category: 'food',
    day: 4,
    note: 'steamed brownies, souvenir',
  },
  {
    key: 'apurva',
    name: 'Apurva Massage',
    lat: 1.1330469,
    lon: 104.0107919,
    category: 'spa',
    day: 4,
    note: 'Muslimah-friendly privacy',
  },
  {
    key: 'chikuro',
    name: 'Chikuro',
    lat: 1.135412,
    lon: 104.0073514,
    category: 'food',
    day: 4,
    note: 'Level 3, GBM · long queues',
    insideOf: 'gbm',
  },
  {
    key: 'dinogate',
    name: 'Dino Gate',
    lat: 1.1627341,
    lon: 104.0455902,
    category: 'dino',
    day: 4,
    note: 'Bengkong · 9am–6pm',
    opening: { opens: hhmm(9), closes: hhmm(18) },
  },
  {
    key: 'eska',
    name: 'Eska Wellness',
    lat: 1.1542881,
    lon: 103.99746,
    category: 'spa',
    day: 4,
    note: 'Bayfront, Harbour Bay · 10am–10pm · 4.8★',
    opening: { opens: hhmm(10), closes: hhmm(22) },
  },
  {
    key: 'gerai',
    name: 'Gerai Nelayan 2M',
    lat: 1.1339512,
    lon: 103.971781,
    category: 'food',
    day: 4,
    note: 'Sekupang, by the sea · 4.4★ · has a surau',
  },
  {
    key: 'gbm',
    name: 'Grand Batam Mall',
    lat: 1.1357,
    lon: 104.0069,
    category: 'shop',
    day: 4,
    note: 'Chikuro · Top 100 · Sociolla · Marugame',
    tenants: [
      { name: 'Chikuro', placeKey: 'chikuro', floor: 'Level 3', note: 'long queues' },
      { name: 'Top 100', placeKey: 'top100', note: 'supermarket' },
      { name: 'Sociolla', placeKey: 'sociolla', floor: 'Level 1' },
      { name: 'Marugame Udon', placeKey: 'marugame', note: 'halal' },
    ],
  },
  {
    key: 'infinity',
    name: 'Infinity Massage',
    lat: 1.1345296,
    lon: 104.0100004,
    category: 'spa',
    day: 4,
    note: 'Penuin',
  },
  {
    key: 'kakimini',
    name: 'Kaki Mini',
    lat: 1.135924,
    lon: 104.0051597,
    category: 'shop',
    day: 4,
    note: 'babyshop with a play area',
  },
  {
    key: 'loveseafood',
    name: 'Love Seafood',
    lat: 1.1491,
    lon: 104.0135,
    category: 'food',
    day: 4,
    note: 'Nagoya branch',
  },
  {
    key: 'marugame',
    name: 'Marugame Udon',
    lat: 1.1355161,
    lon: 104.0072605,
    category: 'food',
    day: 4,
    note: 'GBM · halal',
    insideOf: 'gbm',
  },
  {
    key: 'moni',
    name: 'Moni Cosmetic',
    lat: 1.1552715,
    lon: 104.0240816,
    category: 'shop',
    day: 4,
    note: 'Bengkong',
  },
  {
    key: 'nagoyahill',
    name: 'Nagoya Hill Mall',
    lat: 1.1467,
    lon: 104.0129,
    category: 'shop',
    day: 4,
    note: 'Renuin on Level 2',
    tenants: [{ name: 'Renuin', placeKey: 'renuin', floor: 'Level 2' }],
  },
  {
    key: 'sederhana',
    name: 'Nasi Padang Sederhana',
    lat: 1.1419312,
    lon: 104.0123221,
    category: 'food',
    day: 4,
    note: 'Nagoya',
  },
  {
    key: 'pinkbeach',
    name: 'Pink Beach · Bluefire',
    lat: 1.1692801,
    lon: 104.0483334,
    category: 'beach',
    day: 4,
    note: 'opens 12:30pm · ~RM12 pax',
    opening: { opens: hhmm(12, 30) },
  },
  {
    key: 'ranahminang',
    name: 'Ranah Minang',
    lat: 1.1485757,
    lon: 104.0099615,
    category: 'food',
    day: 4,
    note: 'Nagoya · 4.8★ · nasi padang',
  },
  {
    key: 'renuin',
    name: 'Renuin',
    lat: 1.1457753,
    lon: 104.0125251,
    category: 'food',
    day: 4,
    note: 'Nagoya Hill L2 · 4.7★ · kids area',
    insideOf: 'nagoyahill',
  },
  {
    key: 'sociolla',
    name: 'Sociolla',
    lat: 1.1348364,
    lon: 104.0082777,
    category: 'shop',
    day: 4,
    note: 'L1, GBM · 4.5★',
    insideOf: 'gbm',
  },
  {
    key: 'top100',
    name: 'Top 100',
    lat: 1.1356,
    lon: 104.00705,
    category: 'shop',
    day: 4,
    note: 'supermarket inside GBM',
    insideOf: 'gbm',
  },

  // -- Line 5 · Departure ----------------------------------------------------
  {
    key: 'dcmall',
    name: 'DC Mall',
    lat: 1.141,
    lon: 104.0028,
    category: 'shop',
    day: 5,
    note: 'Zhuko · Diamond · Kue Jongkong',
    tenants: [{ name: 'Zhuko' }, { name: 'Diamond' }, { name: 'Kue Jongkong' }],
  },
  {
    key: 'mornbakery',
    name: 'Morning Bakery',
    lat: 1.1529,
    lon: 103.9997,
    category: 'food',
    day: 5,
    note: 'Harbour Bay branch · opens 6am',
    opening: { opens: hhmm(6) },
  },
] as const satisfies readonly Place[];

export type PlaceKey = (typeof PLACE_DATA)[number]['key'];

export const PLACES: readonly Place[] = PLACE_DATA;

const PLACE_INDEX: ReadonlyMap<string, Place> = new Map(
  PLACES.map((p) => [p.key, p]),
);

export function getPlace(key: string): Place | undefined {
  return PLACE_INDEX.get(key);
}

/** For keys that are known good at author time — line bases, bookings, tenants. */
export function requirePlace(key: PlaceKey): Place {
  const place = PLACE_INDEX.get(key);
  if (!place) throw new Error(`No place "${key}"`);
  return place;
}

/**
 * The places that get a pin. Anything inside a mall is folded into its parent,
 * so Grand Batam Mall is one pin, not five stacked on the same doorway.
 */
export const MAP_PLACES: readonly Place[] = PLACES.filter((p) => !p.insideOf);

export function placesOnDay(line: DayId): readonly Place[] {
  return PLACES.filter((p) => p.day === line);
}

export function dayById(id: DayId): Day {
  const line = DAYS.find((l) => l.id === id);
  if (!line) throw new Error(`No line ${id}`);
  return line;
}

export function dayByDate(isoDate: string): Day | undefined {
  return DAYS.find((l) => l.date === isoDate);
}

/**
 * The words a place can be found by. A mall answers to its tenants' names, so
 * searching "Chikuro" or "Renuin" surfaces the mall you actually walk into.
 */
export function searchTerms(place: Place): readonly string[] {
  const terms = [place.name, place.note, place.category];
  for (const tenant of place.tenants ?? []) {
    terms.push(tenant.name);
    if (tenant.note) terms.push(tenant.note);
  }
  const parent = place.insideOf ? getPlace(place.insideOf) : undefined;
  if (parent) terms.push(parent.name);
  return terms.map((t) => t.toLowerCase());
}

// ---------------------------------------------------------------------------
// Hotels, ferry, money
// ---------------------------------------------------------------------------

export const BOOKINGS: readonly Booking[] = [
  {
    hotel: 'harris',
    hotelName: 'Harris Resort Barelang',
    checkIn: '2026-08-21',
    checkOut: '2026-08-22',
    nights: 1,
    room: 'Pool access room, breakfast',
    priceMYR: 354,
  },
  {
    hotel: 'radisson',
    hotelName: 'Radisson Golf & Convention Center',
    checkIn: '2026-08-22',
    checkOut: '2026-08-25',
    nights: 3,
    room: 'Golf view with balcony, breakfast',
    priceMYR: 1309,
    note: 'Held across two separate bookings to lock the rate.',
  },
];

interface Ferry {
  readonly operator: string;
  readonly returnFareMYR: number;
  readonly fareCovers: string;
  readonly infantFareMYR: number;
  readonly baggage: string;
  readonly checkIn: OpeningHours;
  /** Out, then back. */
  readonly legs: readonly [FerryLeg, FerryLeg];
}

export const FERRY: Ferry = {
  operator: 'Putri Anggreni',
  returnFareMYR: 463,
  fareCovers: '2 adults + 1 infant, return',
  infantFareMYR: 22,
  baggage: '2 pieces up to 20 kg per passenger · excess IDR 15,000/kg',
  /** Bag drop for the 17:00 sailing home. */
  checkIn: { opens: hhmm(15, 30), closes: hhmm(16, 30) },
  legs: [
    {
      direction: 'out',
      from: 'Puteri Harbour, Malaysia',
      to: 'Harbour Bay, Batam',
      date: '2026-08-21',
      departs: '09:00',
      departsZone: 'MYT',
      arrives: '10:00',
      arrivesZone: 'WIB',
    },
    {
      direction: 'back',
      from: 'Harbour Bay, Batam',
      to: 'Puteri Harbour, Malaysia',
      date: '2026-08-25',
      departs: '17:00',
      departsZone: 'WIB',
    },
  ],
};

interface Costs {
  readonly booked: readonly CostRow[];
  readonly onTheDay: readonly CostRow[];
  /** Both totals exclude shopping. */
  readonly bookedTotalMYR: number;
  readonly totalLowMYR: number;
  readonly totalHighMYR: number;
}

export const COSTS: Costs = {
  booked: [
    { label: 'Ferry · return, 2 adults + infant', lowMYR: 463, highMYR: 463 },
    { label: 'Harris Resort Barelang · 1 night', lowMYR: 354, highMYR: 354 },
    { label: 'Radisson Golf · 3 nights', lowMYR: 1309, highMYR: 1309 },
  ],
  onTheDay: [
    {
      label: 'Terminal & seaport charges',
      lowMYR: 100,
      highMYR: 160,
      note: 'Cash only. Not included in the ticket.',
    },
    { label: 'Ground transport', lowMYR: 124, highMYR: 201 },
    { label: 'Attractions', lowMYR: 40, highMYR: 70 },
    { label: 'Food', lowMYR: 400, highMYR: 700 },
  ],
  bookedTotalMYR: 2126,
  totalLowMYR: 2790,
  totalHighMYR: 3257,
};

// ---------------------------------------------------------------------------
// Things to know before you go
// ---------------------------------------------------------------------------

export const WARNINGS: readonly Warning[] = [
  {
    key: 'timezone',
    title: 'Batam is one hour behind Malaysia',
    body: 'Every time in this app is WIB. The ferry out leaves Puteri Harbour at 09:00 MYT and lands at 10:00 WIB — an hour on the water, not two.',
  },
  {
    key: 'infant-fare',
    title: 'The infant ferry fare is RM 22 each way, not free',
    body: "The operator's website only sells adult seats, so hers has to be bought at the Puteri Harbour counter with her passport.",
  },
  {
    key: 'maulid',
    title: '25 August is Maulid Nabi',
    body: 'A public holiday. Nothing closes, but it makes a long weekend for Indonesia too — expect roughly 20% Grab surge on the way home.',
  },
  {
    key: 'baggage',
    title: 'Two bags up to 20 kg each',
    body: 'Per passenger. Excess is IDR 15,000/kg, paid at the counter.',
  },
  {
    key: 'halal',
    title: 'Halal is the default',
    body: 'Batam is majority Muslim. Halal food is the norm rather than something to hunt for.',
  },
];

/** The day the Grab surge applies, and the day everything must finish by 15:00. */
export const HOLIDAY_DATE = '2026-08-25';

export const PACKING: readonly { key: string; label: string }[] = [
  { key: 'passports', label: 'Three passports, hers included' },
  { key: 'infant-ticket', label: 'Cash for her ferry ticket at the counter' },
  { key: 'cash-idr', label: 'Cash for terminal & seaport charges' },
  { key: 'stroller', label: 'Stroller' },
  { key: 'sunblock', label: 'Sunblock and hats' },
  { key: 'swim', label: 'Swim things for the Harris pool room' },
  { key: 'meds', label: 'Her medicines and thermometer' },
  { key: 'snacks', label: 'Snacks for the ferry' },
  { key: 'adapter', label: 'Plug adapter (Indonesia, type C/F)' },
  { key: 'esim', label: 'eSIM or roaming sorted before boarding' },
];
