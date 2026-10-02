import type { ReactNode } from 'react';
import { TestbedSidebar } from '../TestbedSidebar';
import { styles } from './TestbedShell.styles';

export interface TestbedShellProps {
  children: ReactNode;
}

export function TestbedShell({ children }: TestbedShellProps) {
  return (
    <div className={styles.shell}>
      <TestbedSidebar />
      <main className={styles.detail}>{children}</main>
    </div>
  );
}
