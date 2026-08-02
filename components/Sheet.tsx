'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { SHEET_SPRING, usePrefersReducedMotion } from '@/lib/motion';

/**
 * A bottom sheet, not a modal.
 *
 * Drag it down and it follows your thumb; let go past the threshold, or with
 * enough velocity, and it goes. The physics are a spring, so a flick feels like
 * a flick rather than a fixed 200 ms animation.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Announced as the sheet's accessible name. */
  title: string;
  children: ReactNode;
}): JSX.Element {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const reduced = usePrefersReducedMotion();

  // Escape closes, focus moves in, and the page behind stops scrolling.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // aria-modal="true" is a promise that the rest of the page is inert, so
      // Tab has to stay inside the sheet rather than wandering off behind it.
      if (e.key !== 'Tab' || !panel.current) return;

      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-ink/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] max-w-app overflow-y-auto overscroll-contain rounded-t-sheet border-t border-hairline border-rule bg-card focus:outline-none"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            initial={reduced ? { opacity: 0 } : { y: '100%' }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '100%' }}
            transition={reduced ? { duration: 0.01 } : SHEET_SPRING}
            drag={reduced ? false : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              // Either a decisive flick or a long pull dismisses it.
              if (info.velocity.y > 500 || info.offset.y > 120) onClose();
            }}
          >
            {/* The grab handle is the drag surface, so a scrollable body still
                scrolls rather than fighting the sheet. */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="sticky top-0 z-10 cursor-grab touch-none bg-card pb-1 pt-2.5 active:cursor-grabbing"
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-rule" aria-hidden />
            </div>

            <h2 id={titleId} className="sr-only">
              {title}
            </h2>
            {children}

            <div className="px-gutter pb-6 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost w-full py-3 text-caption uppercase tracking-[0.1em] text-muted"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
