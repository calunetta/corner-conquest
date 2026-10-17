export type DeleteAccountDialogView = 'confirm' | 'deleting' | 'error';

export type DeleteAccountButtonViewProps = {
  isDialogOpen: boolean;
  view: DeleteAccountDialogView;
  /** Only meaningful when view === 'error'. */
  errorMessage: string;
  onOpenChange: (open: boolean) => void;
  /** Must call event.preventDefault() before this fires — see DeleteAccountButton.tsx contract. */
  onConfirmDelete: () => void;
};
