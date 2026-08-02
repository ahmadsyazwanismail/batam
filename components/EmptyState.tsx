'use client';

import { LottieMoment } from './LottieMoment';

/** Nothing matched. One of the three places a Lottie is allowed to appear. */
export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}): JSX.Element {
  return (
    <div className="px-gutter py-12 text-center">
      <div className="mx-auto w-28">
        <LottieMoment name="empty" />
      </div>
      <p className="mt-3 text-[1.125rem] font-semibold tracking-[-0.02em]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[30ch] text-caption leading-relaxed text-muted">
        {body}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-ghost mx-auto mt-4 px-4 py-2.5 text-caption"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
