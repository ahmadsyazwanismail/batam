'use client';

import type { ReactNode } from 'react';
import { PageTransition } from '@/components/PageTransition';

// A template re-mounts on every navigation, which is what the slide needs.
export default function Template({ children }: { children: ReactNode }): JSX.Element {
  return <PageTransition>{children}</PageTransition>;
}
