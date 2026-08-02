'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SPRING } from '@/lib/motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED = 'batam-install-dismissed';

/**
 * Offer to install, once, and never again if they say no.
 *
 * Worth having: installed, the app opens standalone and its cache survives, so
 * it is genuinely usable on a phone with the data switched off — which is what
 * roaming with a toddler tends to mean.
 */
export function InstallPrompt(): JSX.Element | null {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED)) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED, '1');
    setEvent(null);
  };

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={SPRING}
          className="fixed inset-x-3 bottom-[calc(theme(spacing.tabbar)+env(safe-area-inset-bottom)+0.75rem)] z-40 rounded-md border border-hairline border-rule bg-card p-3 shadow-sm"
        >
          <p className="text-caption font-semibold">Add Batam Lines to your home screen</p>
          <p className="mt-0.5 text-caption text-muted">
            It then works with the data switched off.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await event.prompt();
                await event.userChoice;
                dismiss();
              }}
              className="btn-solid flex-1 py-2.5 text-caption"
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="btn-ghost flex-1 py-2.5 text-caption text-muted"
            >
              Not now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
