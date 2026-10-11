export type LinkGoogleAccountButtonErrorDialog = {
  open: boolean;
  title: string;
  description: string;
};

export type LinkGoogleAccountButtonViewProps = {
  isLinking: boolean;
  errorDialog: LinkGoogleAccountButtonErrorDialog;
  onLink: () => void;
  onErrorDialogOpenChange: (open: boolean) => void;
};
