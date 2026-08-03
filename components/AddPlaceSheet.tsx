'use client';

import { useEffect, useMemo, useState } from 'react';
import { DAYS } from '@/data/trip';
import type { LocationApi } from '@/lib/useLocation';
import { farFromTrip, parseLocation, SOURCE_LABEL } from '@/lib/parseLocation';
import {
  CATEGORY_CHOICES,
  draftProblem,
  type SavedPlace,
  type SavedPlaceDraft,
} from '@/lib/savedPlaces';
import { Sheet } from './Sheet';
import type { DraftState } from './addPlaceDraft';

/**
 * Adding somewhere new, on the trip, with one hand.
 *
 * The hard part is not the form, it is the coordinates: there is no backend and
 * no geocoder, so "find me the address of this restaurant" is not something the
 * app can honestly offer. What it offers instead are the three ways you can
 * actually get a point onto a phone with no server behind it — paste the Maps
 * link you already have, use where you are standing, or move the map under a
 * crosshair. All three work with no signal once the app is installed.
 */

const fmt = (n: number): string => n.toFixed(5);

export function AddPlaceSheet({
  open,
  draft,
  onDraftChange,
  editing,
  location,
  onPickOnMap,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean;
  draft: DraftState;
  onDraftChange: (next: DraftState) => void;
  /** Set when editing an existing place rather than adding one. */
  editing: SavedPlace | null;
  location: LocationApi;
  /** Hands control to the map's crosshair. Absent where there is no map to hand it to. */
  onPickOnMap?: () => void;
  onSave: (draft: SavedPlaceDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}): JSX.Element {
  const [paste, setPaste] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // A fresh sheet starts fresh: a half-typed link left over from last time
  // would be read as this place's location.
  useEffect(() => {
    if (!open) {
      setPaste('');
      setSubmitted(false);
      setConfirmingDelete(false);
    }
  }, [open]);

  const parsed = useMemo(() => (paste.trim() ? parseLocation(paste) : null), [paste]);

  // Applying on parse rather than behind a button: there is nothing to confirm,
  // and a "Use this" step is one more tap for something already unambiguous.
  useEffect(() => {
    if (parsed?.ok) {
      onDraftChange({ ...draft, point: parsed.point, how: SOURCE_LABEL[parsed.source] });
    }
    // Only when the parse result itself changes — including `draft` here would
    // re-apply the paste over a point picked on the map afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed]);

  const problem = draftProblem(draft);
  const far = draft.point ? farFromTrip(draft.point) : null;
  const canSave = !problem && draft.point !== null;

  const set = <K extends keyof DraftState>(field: K, value: DraftState[K]): void =>
    onDraftChange({ ...draft, [field]: value });

  const submit = (): void => {
    setSubmitted(true);
    if (!canSave || !draft.point) return;
    onSave({
      name: draft.name,
      note: draft.note,
      category: draft.category,
      day: draft.day,
      lat: draft.point.lat,
      lon: draft.point.lon,
    });
  };

  const locating = location.permission === 'locating';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${editing.name}` : 'Add a place'}
    >
      <div className="px-gutter pb-2 pt-2">
        <h3 className="text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em]">
          {editing ? 'Edit place' : 'Add a place'}
        </h3>
        <p className="mt-2 text-caption text-muted">
          {editing
            ? 'Yours to change. The trip as booked is not touched.'
            : 'Somewhere you found that is not on the plan. It goes on the map and into Places, marked as yours.'}
        </p>

        {/* --- name ------------------------------------------------------- */}
        <label className="eyebrow mt-6 block" htmlFor="add-name">
          Name
        </label>
        <input
          id="add-name"
          type="text"
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Kopi Kenangan, the shop with the kites…"
          autoComplete="off"
          className="tap mt-1.5 w-full rounded border border-hairline border-rule bg-card px-3 py-2.5 text-[1rem] placeholder:text-muted"
        />
        {submitted && problem && (
          <p role="alert" className="mt-1.5 text-caption text-warn">
            {problem}
          </p>
        )}

        {/* --- where ------------------------------------------------------ */}
        <p className="eyebrow mt-6">Where is it?</p>

        <div
          className="mt-1.5 rounded border border-hairline border-rule bg-card px-3 py-2.5"
          aria-live="polite"
        >
          {draft.point ? (
            <>
              <p className="numeric font-semibold tracking-[-0.01em]">
                {fmt(draft.point.lat)}, {fmt(draft.point.lon)}
              </p>
              <p className="mt-0.5 text-caption text-muted">{draft.how ?? 'picked on the map'}</p>
            </>
          ) : (
            <p className="text-caption text-muted">
              Not set yet. Paste a link, use where you are, or drop a pin.
            </p>
          )}
        </div>

        {far && (
          <p role="status" className="mt-1.5 text-caption text-muted">
            {far}
          </p>
        )}

        <label className="sr-only" htmlFor="add-paste">
          Paste a Maps link or coordinates
        </label>
        <input
          id="add-paste"
          type="text"
          inputMode="url"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Paste a Maps link, or 1.1301, 104.0529"
          autoComplete="off"
          spellCheck={false}
          className="tap mt-2 w-full rounded border border-hairline border-rule bg-card px-3 py-2.5 text-[1rem] placeholder:text-muted"
        />
        {parsed && !parsed.ok && (
          <p role="alert" className="mt-1.5 text-caption text-muted">
            {parsed.reason}
          </p>
        )}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (location.fix) {
                onDraftChange({
                  ...draft,
                  point: location.fix.point,
                  how: `where you were, to within ${Math.round(location.fix.accuracy)} m`,
                });
              } else {
                location.ask();
              }
            }}
            className="btn border border-rule py-3"
          >
            {locating ? 'Finding you…' : location.fix ? 'Use where I am' : 'Use my location'}
          </button>
          {onPickOnMap ? (
            <button type="button" onClick={onPickOnMap} className="btn border border-rule py-3">
              Drop a pin
            </button>
          ) : (
            <a href="/map#add" className="btn border border-rule py-3">
              Drop a pin
            </a>
          )}
        </div>
        {location.error && (
          <p role="status" className="mt-1.5 text-caption text-muted">
            {location.error}
          </p>
        )}

        {/* --- what ------------------------------------------------------- */}
        <p className="eyebrow mt-6" id="add-category-label">
          What is it?
        </p>
        <div
          role="group"
          aria-labelledby="add-category-label"
          className="-mx-gutter mt-1.5 flex gap-1.5 overflow-x-auto px-gutter pb-0.5"
        >
          {CATEGORY_CHOICES.map((choice) => {
            const on = draft.category === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => set('category', choice.value)}
                aria-pressed={on}
                className="tap shrink-0 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors"
                style={
                  on
                    ? { backgroundColor: 'var(--ink)', color: 'var(--card)', borderColor: 'var(--ink)' }
                    : { borderColor: 'var(--rule)', color: 'var(--muted)' }
                }
              >
                {choice.label}
              </button>
            );
          })}
        </div>

        {/* --- when ------------------------------------------------------- */}
        <p className="eyebrow mt-6" id="add-day-label">
          Which day?
        </p>
        <div
          role="group"
          aria-labelledby="add-day-label"
          className="-mx-gutter mt-1.5 flex gap-1.5 overflow-x-auto px-gutter pb-0.5"
        >
          <button
            type="button"
            onClick={() => set('day', null)}
            aria-pressed={draft.day === null}
            className="tap shrink-0 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors"
            style={
              draft.day === null
                ? { backgroundColor: 'var(--ink)', color: 'var(--card)', borderColor: 'var(--ink)' }
                : { borderColor: 'var(--rule)', color: 'var(--muted)' }
            }
          >
            Not decided
          </button>
          {DAYS.map((day) => {
            const on = draft.day === day.id;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => set('day', day.id)}
                aria-pressed={on}
                className="tap shrink-0 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors"
                style={
                  on
                    ? {
                        backgroundColor: day.textColour,
                        color: '#FFFFFF',
                        borderColor: day.textColour,
                      }
                    : { borderColor: 'var(--rule)', color: 'var(--muted)' }
                }
              >
                Day {day.id}
              </button>
            );
          })}
        </div>

        {/* --- note ------------------------------------------------------- */}
        <label className="eyebrow mt-6 block" htmlFor="add-note">
          Note <span className="font-normal normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="add-note"
          type="text"
          value={draft.note}
          onChange={(e) => set('note', e.target.value)}
          placeholder="what it is, who said so, when it opens"
          autoComplete="off"
          className="tap mt-1.5 w-full rounded border border-hairline border-rule bg-card px-3 py-2.5 text-[1rem] placeholder:text-muted"
        />

        {/* --- commit ----------------------------------------------------- */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={submitted && !canSave}
            className="btn-solid py-3 disabled:opacity-60"
          >
            {editing ? 'Save changes' : 'Add it'}
          </button>
          <button type="button" onClick={onClose} className="btn border border-rule py-3">
            Cancel
          </button>
        </div>
        {submitted && !draft.point && (
          <p role="alert" className="mt-1.5 text-caption text-warn">
            It needs a location — that is the whole point of putting it on the map.
          </p>
        )}

        {onDelete && (
          <div className="mt-6 border-t-hairline border-rule pt-4">
            {confirmingDelete ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onDelete}
                  className="btn border py-3"
                  style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
                >
                  Yes, remove it
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="btn border border-rule py-3"
                >
                  Keep it
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="tap w-full py-2 text-caption font-semibold text-muted"
              >
                Remove this place
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
