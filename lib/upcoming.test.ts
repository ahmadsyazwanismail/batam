import { describe, expect, it } from 'vitest';
import { formatCountdown, upcoming } from './upcoming';
import { requirePlace } from '@/data/trip';

const radisson = requirePlace('radisson');
const at = (isoDate: string, hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(
    Date.parse(`${isoDate}T00:00:00Z`) + (h! * 60 + m!) * 60_000 - 7 * 3_600_000,
  );
};

describe('upcoming', () => {
  it('never looks backwards', () => {
    for (const t of ['06:00', '11:00', '15:00', '21:00']) {
      for (const row of upcoming(at('2026-08-24', t), radisson)) {
        expect(row.inMinutes, `${t} ${row.label}`).toBeGreaterThan(0);
      }
    }
  });

  it('returns them in time order', () => {
    const rows = upcoming(at('2026-08-24', '08:00'), radisson);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i]!.at).toBeGreaterThanOrEqual(rows[i - 1]!.at);
    }
  });

  it('respects the limit', () => {
    expect(upcoming(at('2026-08-24', '06:00'), radisson, 2)).toHaveLength(2);
  });

  it('shows the ferry landing on day one', () => {
    const rows = upcoming(at('2026-08-21', '07:00'), radisson, 8);
    expect(rows.some((r) => r.kind === 'ferry' && r.at === 10 * 60)).toBe(true);
  });

  it('shows the bag check-in and the sailing on the last day, as deadlines', () => {
    const rows = upcoming(at('2026-08-25', '09:00'), radisson, 8);
    const deadlines = rows.filter((r) => r.kind === 'deadline');
    expect(deadlines.length).toBeGreaterThanOrEqual(2);
    for (const d of deadlines) expect(d.urgent).toBe(true);
    expect(rows.some((r) => r.label === 'Bag check-in closes' && r.at === 16 * 60 + 30)).toBe(
      true,
    );
  });

  it('shows Pink Beach opening on the day it is on the line', () => {
    const rows = upcoming(at('2026-08-24', '09:00'), radisson, 12);
    expect(rows.some((r) => r.label.startsWith('Pink Beach'))).toBe(true);
  });

  it('does not mention a place that is not on today’s line', () => {
    // Morning Bakery is a line 5 stop; it has no business on Monday.
    const rows = upcoming(at('2026-08-24', '05:00'), radisson, 12);
    expect(rows.some((r) => r.label.startsWith('Morning Bakery'))).toBe(false);
  });

  it('includes the next prayer', () => {
    const rows = upcoming(at('2026-08-24', '11:00'), radisson, 8);
    expect(rows.some((r) => r.kind === 'prayer')).toBe(true);
  });

  it('is empty late at night, when nothing is left', () => {
    expect(upcoming(at('2026-08-24', '23:50'), radisson)).toHaveLength(0);
  });

  it('says nothing at all outside the trip', () => {
    const rows = upcoming(at('2026-01-15', '09:00'), radisson);
    expect(rows.filter((r) => r.kind === 'opening')).toHaveLength(0);
  });
});

describe('formatCountdown', () => {
  it('reads like a person wrote it', () => {
    expect(formatCountdown(0)).toBe('now');
    expect(formatCountdown(3)).toBe('in 3 min');
    expect(formatCountdown(59)).toBe('in 59 min');
    expect(formatCountdown(60)).toBe('in 1 h');
    expect(formatCountdown(135)).toBe('in 2 h 15 m');
    expect(formatCountdown(120)).toBe('in 2 h');
  });
});
