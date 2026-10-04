import type { CreateGameDialogProps } from './CreateGameDialog.types';

export const defaultCreateGameDialogProps: CreateGameDialogProps = {
  open: true,
  onOpenChange: () => undefined,
  onCreateGame: async () => true,
};
