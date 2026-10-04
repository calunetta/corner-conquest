'use client';

import Link from 'next/link';
import { findPreview } from '../../registry';
import { selectStates, toKebabCase } from './PreviewStage.map';
import { styles } from './PreviewStage.styles';

interface PreviewStageProps {
  slug: string;
  /** Render only this state, e.g. `?state=Expiring`; all states when omitted. */
  stateName?: string;
}

export function PreviewStage({ slug, stateName }: PreviewStageProps) {
  const preview = findPreview(slug);
  const states = preview && stateName ? selectStates(preview.states, stateName) : [];
  const availableStates = preview?.states.map((state) => state.name).join(', ');

  return (
    <div className={styles.page} data-testid="testbed-stage">
      <header className={styles.header}>
        <Link href="/testbed" className={styles.backLink}>
          {'← All components'}
        </Link>
        <h1 className={styles.title}>{preview?.title ?? 'Preview not found'}</h1>
        {preview && <p className={styles.group}>{preview.group}</p>}
      </header>

      {!preview && (
        <p className={styles.message} data-testid="testbed-missing">
          No preview is registered with the slug &quot;{slug}&quot;.
        </p>
      )}

      {preview && !stateName && (
        <ul className={styles.stateList} data-testid="testbed-state-list">
          {preview.states.map((state) => (
            <li key={state.name} className={styles.stateListItem}>
              <Link
                href={`/testbed/${slug}?state=${state.name}`}
                className={styles.stateLink}
              >
                {state.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {preview && stateName && states.length === 0 && (
        <p className={styles.message} data-testid="testbed-missing">
          No state named &quot;{stateName}&quot;. Available: {availableStates}.
        </p>
      )}

      {states.map((state) => (
        <section
          key={state.name}
          className={styles.state}
          aria-label={state.name}
          data-testid={`testbed-state-${toKebabCase(state.name)}`}
        >
          <h2 className={styles.stateName}>{state.name}</h2>
          <div className={styles.canvas}>{state.render()}</div>
        </section>
      ))}
    </div>
  );
}
