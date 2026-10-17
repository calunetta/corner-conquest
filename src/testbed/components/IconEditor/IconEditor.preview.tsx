'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { IconOverridesConfig } from '@/modules/icons';
import { IconEditorView } from './IconEditor';
import { sampleDraftOverrides, sampleIconRegistry, sampleSavedOverrides } from './IconEditor.fixtures';
import { clampRotation, clampSize, toModuleGroups } from './IconEditor.map';
import type { IconEditorStatus } from './IconEditor.types';

/** Image already in public/sprites/, used as the upload stand-in below. */
const SAMPLE_UPLOAD_SRC = '/sprites/icon_fight.png';

/** Mirrors the connected hook's wiring with fixture data, so the real view renders without the
 *  dev-only routes. IconEditor itself can't take fixtures (its hook reads the real registry and
 *  overrides and calls the service on mount), so it is not rendered here.
 *  Upload does not hit the dev upload route: it swaps in SAMPLE_UPLOAD_SRC as the draft image. */
function IconEditorPreviewEditor() {
  const [savedOverrides, setSavedOverrides] = useState<IconOverridesConfig>(sampleSavedOverrides);
  const [draftOverrides, setDraftOverrides] = useState<IconOverridesConfig>(sampleDraftOverrides);
  const [status, setStatus] = useState<IconEditorStatus>('idle');

  function updateDraft(iconId: string, change: Partial<IconOverridesConfig[string]>) {
    setDraftOverrides((previous) => ({ ...previous, [iconId]: { ...previous[iconId], ...change } }));
  }

  function resetDraft(iconId: string) {
    setDraftOverrides((previous) => {
      const next = { ...previous };
      delete next[iconId];
      return next;
    });
  }

  const moduleGroups = toModuleGroups(sampleIconRegistry, draftOverrides, savedOverrides, {}, (iconId) => ({
    onRotationChange: (rotation) => updateDraft(iconId, { rotation: clampRotation(rotation) }),
    onSizeChange: (size) => updateDraft(iconId, { size: clampSize(size) }),
    onUpload: () => updateDraft(iconId, { src: SAMPLE_UPLOAD_SRC }),
    onReset: () => resetDraft(iconId),
  }));
  const isDirty = moduleGroups.some((group) => group.icons.some((icon) => icon.isDirty));

  function handleSave() {
    setSavedOverrides(draftOverrides);
    setStatus('saved');
  }

  return (
    <IconEditorView
      isLoading={false}
      moduleGroups={moduleGroups}
      isDirty={isDirty}
      status={status}
      onSave={handleSave}
    />
  );
}

export const iconEditorPreview: ComponentPreview = {
  slug: 'icon-editor',
  title: 'Icon Editor',
  group: 'Dev tools',
  states: [
    { name: 'Editor', render: () => <IconEditorPreviewEditor /> },
  ],
};
