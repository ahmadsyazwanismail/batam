import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The bug this file exists to stop coming back.
 *
 * `Sheet` moves focus into the dialog when it opens. Its effect used to list
 * `onClose` in its dependencies, and every caller passes either an inline arrow
 * or a function declared in the parent's body — a new identity on every render.
 * So typing one character into a field inside a sheet re-rendered the parent,
 * re-ran the focus effect, and moved focus off the input and onto the dialog.
 * On a phone that closes the keyboard after every letter, which is exactly how
 * it was reported: "each character it will remove my keyboard".
 *
 * It shipped because no sheet had contained a text field until the add-a-place
 * form did — the failure needed a form to be visible at all.
 *
 * There is no jsdom or component-testing setup in this project (vitest runs on
 * `lib/` and `data/` in node), so this reads the source, the way
 * `contrast.test.ts` reads `globals.css`. It is a coarse instrument. It is also
 * the difference between catching this in a second and shipping it twice.
 */

const read = (path: string): string =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** Every `}, [ ... ])` dependency array in a file. */
function depArrays(source: string): string[] {
  return [...source.matchAll(/\}\s*,\s*\[([^\]]*)\]\s*\)/g)].map((m) => m[1] ?? '');
}

describe('Sheet does not re-run its focus effect on every parent render', () => {
  const source = read('components/Sheet.tsx');

  it('keeps callback props out of every dependency array', () => {
    for (const deps of depArrays(source)) {
      expect(deps, `a dependency array still names a callback prop: [${deps}]`).not.toMatch(
        /\bon[A-Z]\w*/,
      );
    }
  });

  it('reaches the close handler through a ref instead', () => {
    expect(source).toMatch(/closeRef\s*=\s*useRef\(onClose\)/);
    expect(source).toMatch(/closeRef\.current\(\)/);
  });

  it('still moves focus into the dialog when it opens', () => {
    // The fix must not have been to simply stop managing focus — that is a
    // real accessibility requirement for a modal, not incidental.
    expect(source).toMatch(/panel\.current\?\.focus\(\)/);
    expect(source).toMatch(/aria-modal="true"/);
  });

  it('still restores focus to whatever opened it', () => {
    expect(source).toMatch(/previouslyFocused\?\.focus\?\.\(\)/);
  });
});

describe('MapCanvas does not rebuild the map on every parent render', () => {
  const source = read('components/MapCanvas.tsx');

  it('keeps callback props out of the effect that constructs the map', () => {
    // Same class of mistake, far more expensive: this effect calls
    // `instance.remove()` on cleanup, so an unstable `onSelect` would tear the
    // whole map down and rebuild it. Both callers wrap theirs in useCallback
    // today; this makes that a property of the component rather than a promise
    // the callers have to keep.
    for (const deps of depArrays(source)) {
      expect(deps, `a dependency array still names a callback prop: [${deps}]`).not.toMatch(
        /\bon[A-Z]\w*/,
      );
    }
  });

  it('reaches the select handler through a ref instead', () => {
    expect(source).toMatch(/selectRef\s*=\s*useRef\(onSelect\)/);
    expect(source).toMatch(/selectRef\.current\(/);
  });
});

describe('the form still has fields to type into', () => {
  const source = read('components/AddPlaceSheet.tsx');

  it('has the three text inputs the guard above is protecting', () => {
    for (const id of ['add-name', 'add-note', 'add-paste']) {
      expect(source, `${id} is gone — is this guard still testing anything?`).toContain(id);
    }
  });
});
