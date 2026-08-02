/**
 * The three Lottie moments, authored here rather than fetched.
 *
 * The brief allows Lottie in exactly three places — the first-load splash, the
 * empty state, and the celebration when a day's last stop is ticked off — and
 * nowhere in the interface. Nothing here is downloaded: the app has to work
 * with no signal, so the animation data is built in TypeScript and bundled,
 * which also means it can carry the app's own colours.
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

function composition(
  name: string,
  frames: number,
  layers: Record<string, unknown>[],
  width = 200,
  height = 200,
): Record<string, unknown> {
  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: frames,
    w: width,
    h: height,
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
 * First load: four courses arriving in order, in their own colours.
 *
 * This used to be a line drawing itself with three stations landing on it,
 * which was the app's idea until the app stopped being about lines. The dots
 * are deliberately not joined up — a connector would put the railway back.
 *
 * `palette` is the four meal colours, in the order they happen in a day.
 */
export function splashAnimation(
  colour: string,
  palette: readonly string[] = [],
): Record<string, unknown> {
  const colours = palette.length > 0 ? palette : [colour, colour, colour, colour];
  const gap = 46;
  const first = 100 - (gap * (colours.length - 1)) / 2;
  // The splash is gone at 1.5 s, so the last course has to have landed and
  // settled well before then — six frames apart at 30 fps puts the fourth pop
  // at 0.6 s and its settle at 1.0 s.
  const frames = 40;

  return composition(
    'splash',
    frames,
    colours.map((c, i) =>
      layer({
        name: `course-${i + 1}`,
        index: i + 1,
        position: [first + i * gap, 44],
        shapes: circle(34, c ?? colour),
        scale: pop(i * 6),
        from: 0,
        to: frames,
      }),
    ),
    // A band, not a square — four dots in a row leave most of a 200×200
    // canvas empty, which reads on screen as a gap under the animation.
    200,
    88,
  );
}

/** Nothing matched: one dot, alone, breathing. */
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

/** The last stop of a day, ticked. Six dots going off like a small firework. */
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
