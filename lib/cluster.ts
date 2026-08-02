import type { DayId } from '@/data/trip';

/**
 * Screen-space clustering for map pins.
 *
 * Fifteen of the thirty-three stops sit within a couple of kilometres of
 * Nagoya, so at the opening zoom they land on top of each other: unreadable,
 * and their 44px hit areas overlap so you cannot reliably tap the one you
 * meant. Grouping them by where they actually fall on the glass fixes both.
 *
 * Pure and in screen pixels rather than degrees, because the thing being fixed
 * is a screen problem — the same two places need grouping at zoom 11 and not
 * at zoom 16.
 */

export interface ScreenPoint {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly day: DayId;
}

export interface Cluster {
  readonly keys: readonly string[];
  /**
   * Where to draw the group, in screen pixels: the seed point, not the
   * centroid.
   *
   * Seeds are guaranteed to be at least `radiusPx` apart — a point within the
   * radius of an earlier seed was absorbed by it — so bubbles placed on seeds
   * never overlap. Centroids have no such guarantee: two groups can each drift
   * toward the other and collide, which is the exact problem clustering was
   * meant to solve.
   */
  readonly x: number;
  readonly y: number;
  /** The line every member belongs to, or null when the group is mixed. */
  readonly day: DayId | null;
}

/**
 * Greedy: walk the points in a stable order and absorb every unclaimed
 * neighbour within the radius. Not optimal, and it does not need to be — it
 * runs on every pan, and the only property that matters is that two pins the
 * thumb cannot separate end up in the same group.
 */
export function clusterByScreen(
  points: readonly ScreenPoint[],
  radiusPx: number,
): Cluster[] {
  const ordered = [...points].sort((a, b) => a.y - b.y || a.x - b.x || a.key.localeCompare(b.key));
  const claimed = new Set<string>();
  const clusters: Cluster[] = [];

  for (const point of ordered) {
    if (claimed.has(point.key)) continue;
    claimed.add(point.key);

    const members = [point];
    for (const other of ordered) {
      if (claimed.has(other.key)) continue;
      if (Math.hypot(other.x - point.x, other.y - point.y) > radiusPx) continue;
      claimed.add(other.key);
      members.push(other);
    }

    const lines = new Set(members.map((m) => m.day));
    clusters.push({
      keys: members.map((m) => m.key),
      x: point.x,
      y: point.y,
      day: lines.size === 1 ? members[0]!.day : null,
    });
  }

  return clusters;
}

/**
 * How close is too close.
 *
 * A pin's hit area is 44px, so two pins whose centres are nearer than that
 * cannot both be tapped reliably. A little under, so pins that merely sit
 * shoulder to shoulder still show separately.
 */
export const CLUSTER_RADIUS_PX = 40;
