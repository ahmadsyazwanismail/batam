'use client';

import Lottie from 'lottie-react';

/**
 * The only module that imports lottie-web.
 *
 * Kept on its own so it can be code-split: it is roughly 250 kB for three
 * decorative moments, and it must not sit in the bundle that has to open on a
 * roaming phone.
 */
export default function LottiePlayer({
  animationData,
  loop,
  autoplay,
  onComplete,
}: {
  animationData: Record<string, unknown>;
  loop: boolean;
  autoplay: boolean;
  onComplete?: () => void;
}): JSX.Element {
  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      onComplete={onComplete}
      aria-hidden
      role="presentation"
    />
  );
}
