'use client';

import Link from 'next/link';
import { useRef, useEffect } from 'react';
import { useTestbedSidebar } from './TestbedSidebar.hook';
import { isIndexRoute, isRowActive, pluralizeStates } from './TestbedSidebar.map';
import { styles } from './TestbedSidebar.styles';
import type { TestbedSidebarViewModel } from './TestbedSidebar.types';

export function TestbedSidebarView({ groups, pathname }: TestbedSidebarViewModel) {
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' });
  }, []);

  return (
    <nav aria-label="Components" className={styles.nav(isIndexRoute(pathname))} ref={navRef}>
      <Link href="/testbed" className={styles.title}>
        Component testbed
      </Link>

      {groups.length === 0 && <p className={styles.empty}>No previews registered yet.</p>}

      {groups.map((group) => (
        <section key={group.name} aria-label={group.name} className={styles.group}>
          <h2 className={styles.groupTitle}>{group.name}</h2>
          <ul className={styles.list}>
            {group.previews.map((preview) => {
              const isActive = isRowActive(pathname, preview.slug);
              return (
                <li key={preview.slug}>
                  <Link
                    href={`/testbed/${preview.slug}`}
                    data-testid={`testbed-link-${preview.slug}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={styles.row(isActive)}
                  >
                    <span className={styles.rowTitle(isActive)}>{preview.title}</span>
                    <span className={styles.rowMeta}>{pluralizeStates(preview.states.length)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

export function TestbedSidebar() {
  return <TestbedSidebarView {...useTestbedSidebar()} />;
}
