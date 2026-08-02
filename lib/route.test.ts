import { describe, expect, it } from 'vitest';
import { allRunningOrders, runningOrder } from './route';
import { haversineKm } from './geo';
import { LINES, MAP_PLACES, type LineId } from '@/data/trip';

const keys = (line: LineId): string[] => runningOrder(line).map((s) => s.place.key);

describe('running order', () => {
  it('covers every pinnable place on the line', () => {
    for (const line of LINES) {
      const own = MAP_PLACES.filter((p) => p.line === line.id).map((p) => p.key);
      const ordered = keys(line.id);
      for (const key of own) {
        expect(ordered, `line ${line.id} is missing ${key}`).toContain(key);
      }
    }
  });

  it('never repeats a station', () => {
    for (const line of LINES) {
      const ordered = keys(line.id);
      expect(new Set(ordered).size, `line ${line.id}`).toBe(ordered.length);
    }
  });

  it('numbers stations from one, in order', () => {
    for (const line of LINES) {
      runningOrder(line.id).forEach((station, i) => {
        expect(station.index).toBe(i + 1);
      });
    }
  });

  it('marks the first and last stations as termini and nothing in between', () => {
    for (const line of LINES) {
      const stations = runningOrder(line.id);
      expect(stations[0]!.terminus).toBe('start');
      expect(stations[stations.length - 1]!.terminus).toBe('end');
      for (const middle of stations.slice(1, -1)) {
        expect(middle.terminus).toBeNull();
      }
    }
  });

  it('leaves mall tenants out — a mall is one stop, not five', () => {
    const line4 = keys(4);
    for (const tenant of ['chikuro', 'marugame', 'sociolla', 'top100', 'renuin']) {
      expect(line4).not.toContain(tenant);
    }
    expect(line4).toContain('gbm');
    expect(line4).toContain('nagoyahill');
  });
});

describe('the day starts where the day actually starts', () => {
  it('lands at the ferry terminal on day one', () => {
    const first = runningOrder(1)[0]!;
    expect(first.place.key).toBe('ferry');
    expect(first.connection).toBe('Ferry in');
    expect(first.fixedTime?.label).toBe('Lands 10:00');
  });

  it('drives down to Harris by way of Barelang on day one', () => {
    expect(keys(1)).toEqual(['ferry', 'barelang', 'harris']);
  });

  it('checks out of Harris at the top of day two, the one hotel move', () => {
    const line2 = runningOrder(2);
    expect(line2[0]!.place.key).toBe('harris');
    expect(line2[0]!.connection).toBe('Check out');
    expect(line2[0]!.interchange).toBe(true);
  });

  it('crosses a landmark on the way rather than doubling back for it', () => {
    // Barelang is `land` and sits on the road down to the Harris, so it goes
    // between the terminal and the hotel even though check-in normally wins.
    expect(keys(1)).toEqual(['ferry', 'barelang', 'harris']);
  });

  it('does not treat a mall on the same road as "on the way"', () => {
    // K Square is barely off the line from the Harris to the Radisson, but a
    // shop is a destination, not something you cross. Bags first.
    expect(keys(2).indexOf('ksquare')).toBeGreaterThan(keys(2).indexOf('radisson'));
  });

  it('drops the bags at the Radisson before anything else on the move day', () => {
    // K Square is nearer to the road north than the hotel is, but nobody takes
    // a toddler and four bags shopping first.
    expect(keys(2).slice(0, 2)).toEqual(['harris', 'radisson']);
  });

  it('does not invent a check-out on days that do not have one', () => {
    for (const line of [3, 4] as LineId[]) {
      const stations = runningOrder(line);
      expect(stations[0]!.connection).toBe('Base');
      // And nothing in the middle of a day claims to be a connection.
      for (const middle of stations.slice(1)) {
        expect(middle.connection).toBeUndefined();
      }
    }
  });

  it('only ever labels a connection on a terminus', () => {
    for (const line of LINES) {
      for (const station of runningOrder(line.id)) {
        if (station.connection) expect(station.terminus).not.toBeNull();
      }
    }
  });

  it('ends day five at the terminal, with the real bag check-in window', () => {
    const stations = runningOrder(5);
    const last = stations[stations.length - 1]!;
    expect(last.place.key).toBe('ferry');
    expect(last.connection).toBe('Ferry home');
    expect(last.fixedTime?.label).toBe('Bags 15:30–16:30 · sails 17:00');
  });

  it('starts every other day at that day’s hotel', () => {
    for (const line of [3, 4] as LineId[]) {
      expect(runningOrder(line)[0]!.place.key).toBe('radisson');
    }
  });
});

describe('opening times constrain the order', () => {
  it('never puts Pink Beach first, however near it is', () => {
    const line4 = keys(4);
    expect(line4.indexOf('pinkbeach')).toBeGreaterThan(0);
  });

  it('pushes everything that opens after midday behind everything that does not', () => {
    for (const line of LINES) {
      const stations = runningOrder(line.id);
      // The closing connection is where the day ends by definition, so it is
      // exempt from the morning/afternoon split.
      const routed = stations.filter((s) => !s.connection);
      const lastMorning = routed.reduce(
        (n, s, i) => ((s.place.opening?.opens ?? 0) < 720 ? i : n),
        -1,
      );
      const firstAfternoon = routed.findIndex(
        (s) => (s.place.opening?.opens ?? 0) >= 720,
      );
      if (firstAfternoon !== -1) {
        expect(firstAfternoon, `line ${line.id}`).toBeGreaterThan(lastMorning);
      }
    }
  });

  it('carries the real opening hours and nothing else', () => {
    const byKey = new Map(runningOrder(4).map((s) => [s.place.key, s]));
    expect(byKey.get('dinogate')?.fixedTime?.label).toBe('09:00–18:00');
    expect(byKey.get('eska')?.fixedTime?.label).toBe('10:00–22:00');
    // Pink Beach came with an opening time and no closing time, so it says so.
    expect(byKey.get('pinkbeach')?.fixedTime?.label).toBe('From 12:30');
    // Everything else has no published hours, and so gets no time at all.
    expect(byKey.get('gbm')?.fixedTime).toBeUndefined();
    expect(byKey.get('amanda')?.fixedTime).toBeUndefined();
  });

  it('opens Morning Bakery from 06:00 on the last day', () => {
    const bakery = runningOrder(5).find((s) => s.place.key === 'mornbakery');
    expect(bakery?.fixedTime?.label).toBe('From 06:00');
  });
});

describe('distances between stations', () => {
  it('has no distance on the first station and one on every other', () => {
    for (const line of LINES) {
      const stations = runningOrder(line.id);
      expect(stations[0]!.fromPreviousKm).toBeNull();
      for (const station of stations.slice(1)) {
        expect(station.fromPreviousKm).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('matches the haversine between consecutive stations', () => {
    const stations = runningOrder(3);
    for (let i = 1; i < stations.length; i += 1) {
      expect(stations[i]!.fromPreviousKm).toBeCloseTo(
        haversineKm(stations[i - 1]!.place, stations[i]!.place),
        9,
      );
    }
  });

  it('beats naive alphabetical order on total walking', () => {
    // The point of routing at all: consecutive stops should be near each other.
    for (const line of [3, 4] as LineId[]) {
      const stations = runningOrder(line);
      const routed = stations.reduce((n, s) => n + (s.fromPreviousKm ?? 0), 0);

      const alphabetical = [...MAP_PLACES.filter((p) => p.line === line)].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const naive = alphabetical.reduce(
        (n, p, i) => (i === 0 ? 0 : n + haversineKm(alphabetical[i - 1]!, p)),
        0,
      );

      expect(routed, `line ${line}`).toBeLessThan(naive);
    }
  });
});

describe('allRunningOrders', () => {
  it('returns one order per line', () => {
    const all = allRunningOrders();
    expect(Object.keys(all)).toHaveLength(LINES.length);
    for (const line of LINES) {
      expect(all[line.id]!.length).toBeGreaterThan(0);
    }
  });
});
