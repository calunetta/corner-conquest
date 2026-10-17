'use client';

import * as LucideIcons from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIconEditor } from './IconEditor.hook';
import { styles } from './IconEditor.styles';
import type { IconEditorStatus, IconEditorViewModel, IconModuleGroup } from './IconEditor.types';
import { IconEditorRow } from './IconEditorRow';

const STATUS_TEXT: Record<IconEditorStatus, string> = {
  idle: '',
  saving: '',
  saved: 'Saved.',
  error: 'Could not save — see console.',
  conflict: 'Changed elsewhere. Reload the page to load the saved overrides; unsaved edits will be lost.',
};

function IconEditorLoading() {
  return (
    <div className={styles.loading}>
      <LucideIcons.Loader2 className={styles.spinner} aria-hidden />
      <span>Loading icons…</span>
    </div>
  );
}

function IconModuleSection({ group }: { group: IconModuleGroup }) {
  return (
    <AccordionItem value={group.module} className={styles.accordionItem}>
      <AccordionTrigger className={styles.accordionTrigger}>
        <span className={styles.triggerLabel}>
          {group.module}
          {group.overriddenCount > 0 && (
            <Badge variant="outline" className={styles.overriddenCount}>
              {group.overriddenCount} overridden
            </Badge>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className={styles.rowStack}>
          {group.icons.map((icon) => (
            <IconEditorRow key={icon.id} {...icon} />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/** Pure view: everything comes from props, so tests and previews need no providers. */
export function IconEditorView({ isLoading, moduleGroups, isDirty, status, onSave }: IconEditorViewModel) {
  const isSaving = status === 'saving';

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>Icon Editor</h2>
          <p className={styles.hint}>Upload a replacement image, or adjust rotation and size, then save.</p>
        </div>
        <div className={styles.saveRow}>
          <Button type="button" size="sm" disabled={!isDirty || isSaving} onClick={onSave}>
            {isSaving ? <LucideIcons.Loader2 className={styles.spinner} aria-hidden /> : <LucideIcons.Save className={styles.icon} aria-hidden />}
            Save
          </Button>
          <p role="status" className={styles.statusText({ status })}>
            {STATUS_TEXT[status]}
          </p>
        </div>
      </header>

      {isLoading ? (
        <IconEditorLoading />
      ) : (
        <Accordion type="multiple" defaultValue={moduleGroups.map((group) => group.module)}>
          {moduleGroups.map((group) => (
            <IconModuleSection key={group.module} group={group} />
          ))}
        </Accordion>
      )}
    </section>
  );
}

/** Connected component for the testbed route: reads the registry and overrides through its hook. */
export function IconEditor() {
  return <IconEditorView {...useIconEditor()} />;
}
