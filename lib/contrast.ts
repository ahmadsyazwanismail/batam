/**
 * WCAG 2.1 relative luminance and contrast ratio.
 *
 * Here so the palette's accessibility is a test rather than a claim — the five
 * line colours are fixed, and it is easy to reach for one as text without
 * noticing that orange on paper is 2.4:1.
 */

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Normal text. */
export const AA_NORMAL = 4.5;
/** 18.66px bold and up, which is every line bullet in the app. */
export const AA_LARGE = 3;
