'use client';

import Link from 'next/link';
import { previews } from '../../registry';
import { groupPreviews } from './PreviewCatalog.map';
import { styles } from './PreviewCatalog.styles';

export function PreviewCatalog() {
  const groups = groupPreviews(previews);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Component testbed</h1>
        <p className={styles.subtitle}>
          Every registered component state, rendered in isolation. Open one to see all its states.
        </p>
      </header>

      {groups.length === 0 && <p className={styles.empty}>No previews registered yet.</p>}

      {groups.map((group) => (
        <section key={group.name} className={styles.group} aria-label={group.name}>
          <h2 className={styles.groupTitle}>{group.name}</h2>
          <ul className={styles.list}>
            {group.previews.map((preview) => (
              <li key={preview.slug}>
                <Link
                  href={`/testbed/${preview.slug}`}
                  className={styles.link}
                  data-testid={`testbed-link-${preview.slug}`}
                >
                  <span className={styles.linkTitle}>{preview.title}</span>
                  <span className={styles.linkMeta}>{preview.states.length} states</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
