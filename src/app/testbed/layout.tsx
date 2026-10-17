import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { TestbedShell } from '@/testbed/components/TestbedShell';

export const metadata: Metadata = {
  title: 'Testbed · Corner Conquest',
  robots: { index: false, follow: false },
};

export default function TestbedLayout({ children }: { children: ReactNode }) {
  return <TestbedShell>{children}</TestbedShell>;
}
