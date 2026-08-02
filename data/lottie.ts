/**
 * The three Lottie moments, authored here rather than fetched.
 *
 * The brief allows Lottie in exactly three places — the first-load splash, the
 * empty state, and the celebration when a day's last station is ticked off —
 * and nowhere in the interface. Nothing here is downloaded: the app has to work
 * with no signal, so the animation data is built in TypeScript and bundled,
 * which also means it can be tinted with whichever line is running today.
 */

type Vec = number[];

interface Keyframe {
  readonly t: number;
  readonly s: Vec;
  readonly i?: { x: Vec; y: Vec };
  readonly o?: { x: Vec; y: Vec };
}

/** Lottie wants colours as 0–1 RGBA. */
function rgba(hex: string): Vec {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
}

const EASE_OUT = { i: { x: [0.2], y: [1] }, o: { x: [0.4], y: [0] } };

const still = (value: Vec) => ({ a: 0, k: value });
const animated = (frames: readonly Keyframe[]) => ({
  a: 1,
  k: frames.map((f) => ({ ...EASE_OUT, t: f.t, s: f.s })),
});

interface LayerOptions {
  readonly name: string;
  readonly index: number;
  readonly shapes: unknown[];
  readonly position: Vec;
  readonly scale?: ReturnType<typeof animated> | ReturnType<typeof still>;
  readonly opacity?: ReturnType<typeof animated> | ReturnType<typeof still>;
  readonly from: number;
  readonly to: number;
}

function layer(o: LayerOptions): Record<string, unknown> {
  return {
    ddd: 0,
    ind: o.index,
    ty: 4,
    nm: o.name,
    sr: 1,
    ks: {
      o: o.opacity ?? still([100]),
      r: still([0]),
      p: still([...o.position, 0]),
      a: still([0, 0, 0]),
      s: o.scale ?? still([100, 100, 100]),
    },
    ao: 0,
    shapes: o.shapes,
    ip: o.from,
    op: o.to,
    st: 0,
    bm: 0,
  };
}

function circle(diameter: number, colour: string): unknown[] {
  return [
    {
      ty: 'gr',
      nm: 'dot',
      it: [
        { ty: 'el', d: 1, s: still([diameter, diameter]), p: still([0, 0]) },
        { ty: 'fl', c: still(rgba(colour)), o: still([100]), r: 1 },
        {
          ty: 'tr',
          p: still([0, 0]),
          a: still([0, 0]),
          s: still([100, 100]),
          r: still([0]),
          o: still([100]),
          sk: still([0]),
          sa: still([0]),
        },
      ],
    },
  ];
}

/** A vertical bar that draws itself downwards via a trim path. */
function spine(height: number, width: number, colour: string, to: number): unknown[] {
  return [
    {
      ty: 'gr',
      nm: 'spine',
      it: [
        {
          ty: 'rc',
          d: 1,
          s: still([width, height]),
          p: still([0, 0]),
          r: still([0]),
        },
        { ty: 'fl', c: still(rgba(colour)), o: still([100]), r: 1 },
        {
          ty: 'tm',
          s: still([0]),
          e: animated([
            { t: 0, s: [0] },
            { t: to, s: [100] },
          ]),
          o: still([0]),
          m: 1,
        },
        {
          ty: 'tr',
          p: still([0, 0]),
          a: still([0, 0]),
          s: still([100, 100]),
          r: still([0]),
          o: still([100]),
          sk: still([0]),
          sa: still([0]),
        },
      ],
    },
  ];
}

function composition(
  name: string,
  frames: number,
  layers: Record<string, unknown>[],
): Record<string, unknown> {
  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: frames,
    w: 200,
    h: 200,
    nm: name,
    ddd: 0,
    assets: [],
    layers,
  };
}

const pop = (at: number) =>
  animated([
    { t: at, s: [0, 0, 100] },
    { t: at + 7, s: [118, 118, 100] },
    { t: at + 13, s: [100, 100, 100] },
  ]);

/**
 * First load: a line drawing itself, three stations arriving on it. The app's
 * whole idea in one gesture.
 */
export function splashAnimation(colour: string): Record<string, unknown> {
  return composition('splash', 70, [
    layer({
      name: 'stop-3',
      index: 1,
      position: [100, 155],
      shapes: circle(26, colour),
      scale: pop(34),
      from: 0,
      to: 70,
    }),
    layer({
      name: 'stop-2',
      index: 2,
      position: [100, 100],
      shapes: circle(26, colour),
      scale: pop(24),
      from: 0,
      to: 70,
    }),
    layer({
      name: 'stop-1',
      index: 3,
      position: [100, 45],
      shapes: circle(26, colour),
      scale: pop(14),
      from: 0,
      to: 70,
    }),
    layer({
      name: 'spine',
      index: 4,
      position: [100, 100],
      shapes: spine(120, 9, colour, 22),
      from: 0,
      to: 70,
    }),
  ]);
}

/** Nothing matched: one station, alone, breathing. */
export function emptyAnimation(colour: string): Record<string, unknown> {
  return composition('empty', 90, [
    layer({
      name: 'ring',
      index: 1,
      position: [100, 100],
      shapes: circle(60, colour),
      scale: animated([
        { t: 0, s: [60, 60, 100] },
        { t: 45, s: [128, 128, 100] },
        { t: 90, s: [60, 60, 100] },
      ]),
      opacity: animated([
        { t: 0, s: [26] },
        { t: 45, s: [4] },
        { t: 90, s: [26] },
      ]),
      from: 0,
      to: 90,
    }),
    layer({
      name: 'dot',
      index: 2,
      position: [100, 100],
      shapes: circle(26, colour),
      from: 0,
      to: 90,
    }),
  ]);
}

/** The last station of a day, ticked. Six dots leaving the platform. */
export function celebrateAnimation(colour: string): Record<string, unknown> {
  const rays = [0, 60, 120, 180, 240, 300].map((degrees, i) => {
    const radians = (degrees * Math.PI) / 180;
    const reach = 62;
    return layer({
      name: `ray-${i}`,
      index: i + 1,
      position: [100, 100],
      shapes: circle(15, colour),
      scale: animated([
        { t: 0, s: [0, 0, 100] },
        { t: 12, s: [100, 100, 100] },
        { t: 34, s: [0, 0, 100] },
      ]),
      opacity: animated([
        { t: 0, s: [0] },
        { t: 8, s: [100] },
        { t: 34, s: [0] },
      ]),
      from: 0,
      to: 45,
    });
    // The travel outwards is expressed as position keyframes below.
    void radians;
    void reach;
  });

  // Give each ray its own outward path.
  rays.forEach((ray, i) => {
    const radians = ((i * 60) * Math.PI) / 180;
    const ks = ray.ks as Record<string, unknown>;
    ks.p = animated([
      { t: 0, s: [100, 100, 0] },
      { t: 34, s: [100 + Math.cos(radians) * 62, 100 + Math.sin(radians) * 62, 0] },
    ]);
  });

  return composition('celebrate', 45, [
    ...rays,
    layer({
      name: 'core',
      index: rays.length + 1,
      position: [100, 100],
      shapes: circle(40, colour),
      scale: animated([
        { t: 0, s: [0, 0, 100] },
        { t: 10, s: [120, 120, 100] },
        { t: 22, s: [100, 100, 100] },
      ]),
      from: 0,
      to: 45,
    }),
  ]);
}
