'use client';

import * as React from 'react';
import { getToastState, subscribeToToastState, dismissToast, toast, type ToastState } from './toast-store';

export function useToast(): ToastState & { toast: typeof toast; dismiss: typeof dismissToast } {
  const [state, setState] = React.useState<ToastState>(getToastState());

  React.useEffect(() => {
    // Preserved from the legacy hook: dependency array is `[state]`, not `[]`. Re-subscribing the
    // same `setState` reference on every state change is a no-op in practice; changing this is an
    // unreviewed behavior edit (see docs/ai/lessons-learned.md "Hooks & effects").
    return subscribeToToastState(setState);
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: dismissToast,
  };
}

export { toast };
