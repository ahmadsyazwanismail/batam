import { describe, expect, it } from 'vitest';
import { clusterByScreen, CLUSTER_RADIUS_PX, type ScreenPoint } from './cluster';
import type { DayId } from '@/data/trip';

const p = (key: string, x: number, y: number, day: DayId = 4): ScreenPoint => ({
  key,
  x,
  y,
  day,
});

describe('clusterByScreen', () => {
  it('leaves well-separated points alone', () => {
    const clusters = clusterByScreen(
      [p('a', 0, 0), p('b', 200, 0), p('c', 0, 200)],
      CLUSTER_RADIUS_PX,
    );
    expect(clusters).toHaveLength(3);
    for (const c of clusters) expect(c.keys).toHaveLength(1);
  });

  it('groups points the thumb cannot separate', () => {
    const clusters = clusterByScreen(
      [p('a', 100, 100), p('b', 108, 104), p('c', 95, 112)],
      CLUSTER_RADIUS_PX,
    );
    expect(clusters).toHaveLength(1);
    expect([...clusters[0]!.keys].sort()).toEqual(['a', 'b', 'c']);
  });

  it('never loses or duplicates a point', () => {
    const points = Array.from({ length: 40 }, (_, i) =>
      p(`k${i}`, (i * 37) % 300, (i * 53) % 300),
    );
    const clusters = clusterByScreen(points, CLUSTER_RADIUS_PX);
    const keys = clusters.flatMap((c) => c.keys);
    expect(keys).toHaveLength(points.length);
    expect(new Set(keys).size).toBe(points.length);
  });

  it('anchors a group on one of its members', () => {
    const clusters = clusterByScreen([p('a', 100, 100), p('b', 120, 140)], 60);
    expect(clusters).toHaveLength(1);
    expect([clusters[0]!.x, clusters[0]!.y]).toEqual([100, 100]);
  });

  it('never places two groups close enough to overlap', () => {
    // The whole point. A centroid-anchored version fails this: two groups can
    // each drift toward the other until their bubbles collide.
    const points = Array.from({ length: 60 }, (_, i) =>
      p(`k${i}`, (i * 17) % 220, ((i * 29) % 180) + Math.floor(i / 12) * 6),
    );
    const clusters = clusterByScreen(points, CLUSTER_RADIUS_PX);
    for (let i = 0; i < clusters.length; i += 1) {
      for (let j = i + 1; j < clusters.length; j += 1) {
        const gap = Math.hypot(
          clusters[i]!.x - clusters[j]!.x,
          clusters[i]!.y - clusters[j]!.y,
        );
        expect(gap, `${i} vs ${j}`).toBeGreaterThan(CLUSTER_RADIUS_PX);
      }
    }
  });

  it('keeps the line when every member shares one', () => {
    const clusters = clusterByScreen([p('a', 10, 10, 3), p('b', 14, 12, 3)], 60);
    expect(clusters[0]!.day).toBe(3);
  });

  it('reports a mixed group as having no single line', () => {
    // Line colour means "which day", so a group spanning two days must not
    // claim either of them.
    const clusters = clusterByScreen([p('a', 10, 10, 3), p('b', 14, 12, 4)], 60);
    expect(clusters[0]!.day).toBeNull();
  });

  it('separates everything once you zoom in far enough', () => {
    const points = [p('a', 100, 100), p('b', 108, 104), p('c', 95, 112)];
    // Same points, radius of one pixel — the effect of zooming right in.
    expect(clusterByScreen(points, 1)).toHaveLength(3);
  });

  it('is stable — the same input gives the same grouping', () => {
    const points = [p('a', 10, 10), p('b', 30, 20), p('c', 200, 200), p('d', 25, 25)];
    const first = clusterByScreen(points, CLUSTER_RADIUS_PX);
    const again = clusterByScreen([...points].reverse(), CLUSTER_RADIUS_PX);
    expect(first.map((c) => [...c.keys].sort())).toEqual(
      again.map((c) => [...c.keys].sort()),
    );
  });

  it('handles an empty list', () => {
    expect(clusterByScreen([], CLUSTER_RADIUS_PX)).toEqual([]);
  });

  it('uses a radius under the 44px hit area', () => {
    // Two pins exactly a hit-area apart should still show separately.
    expect(CLUSTER_RADIUS_PX).toBeLessThan(44);
    expect(clusterByScreen([p('a', 0, 0), p('b', 44, 0)], CLUSTER_RADIUS_PX)).toHaveLength(2);
  });
});
