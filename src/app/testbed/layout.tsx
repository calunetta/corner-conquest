import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { isTestbedEnabled } from '@/testbed/testbed.config';
import { TestbedShell } from '@/testbed/components/TestbedShell';

export const metadata: Metadata = {
  title: 'Testbed · Corner Conquest',
  robots: { index: false, follow: false },
};

export default function TestbedLayout({ children }: { children: ReactNode }) {
  if (!isTestbedEnabled()) notFound();

  return <TestbedShell>{children}</TestbedShell>;
}
