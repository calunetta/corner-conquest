'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { AvatarPickerButtonView } from './AvatarPickerButton';
import {
  chosenAvatarPicker,
  errorAvatarPicker,
  noAvatarPicker,
  savingAvatarPicker,
} from './AvatarPickerButton.fixtures';
import type { AvatarPickerButtonViewModel } from './AvatarPickerButton.types';

/**
 * Owns the dialog's open state so every state can be closed (Done, Escape, outside click) and reopened
 * through the component's own trigger button, which stays visible when the dialog is closed.
 */
function InteractiveAvatarPicker({ initial }: { initial: AvatarPickerButtonViewModel }) {
  const [isDialogOpen, setIsDialogOpen] = useState(initial.isDialogOpen);
  return <AvatarPickerButtonView {...initial} isDialogOpen={isDialogOpen} onOpenChange={setIsDialogOpen} />;
}

export const avatarPickerButtonPreview: ComponentPreview = {
  slug: 'avatars-avatar-picker-button',
  title: 'Avatar picker button',
  group: 'Avatars',
  states: [
    { name: 'Trigger, no avatar chosen', render: () => <InteractiveAvatarPicker initial={noAvatarPicker} /> },
    { name: 'Trigger, avatar chosen', render: () => <InteractiveAvatarPicker initial={chosenAvatarPicker} /> },
    {
      name: 'Dialog open, avatar selected',
      render: () => <InteractiveAvatarPicker initial={{ ...chosenAvatarPicker, isDialogOpen: true }} />,
    },
    { name: 'Saving', render: () => <InteractiveAvatarPicker initial={savingAvatarPicker} /> },
    { name: 'Error', render: () => <InteractiveAvatarPicker initial={errorAvatarPicker} /> },
  ],
};
