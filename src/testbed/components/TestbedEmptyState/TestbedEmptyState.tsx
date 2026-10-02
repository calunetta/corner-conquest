import { styles } from './TestbedEmptyState.styles';

export function TestbedEmptyState() {
  return (
    <div className={styles.root}>
      <h1 className={styles.heading}>Select a component</h1>
      <p className={styles.body}>
        Every registered component state, rendered in isolation. Pick a component from the list to see all its states.
      </p>
    </div>
  );
}
