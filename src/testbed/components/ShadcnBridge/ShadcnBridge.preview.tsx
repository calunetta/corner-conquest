import type { ComponentPreview } from '@/testbed';
import {
  ButtonFocusRing,
  ButtonsAsChild,
  ButtonsDefault,
  ButtonsDisabled,
  ButtonsMobileRow,
  ButtonsOnSpecialFrame,
  ButtonTooltip,
} from './ShadcnBridgeButtons';
import {
  DialogDefault,
  DialogGlassClassName,
  DialogHybrid,
  DialogLongContent,
  DialogPaperFrame,
} from './ShadcnBridgeDialogs';
import { AlertDialogLeave, SheetState } from './ShadcnBridgeOverlays';

export const shadcnBridgePreview: ComponentPreview = {
  slug: 'shadcn-bridge',
  title: 'shadcn bridge',
  group: 'Pixel UI',
  states: [
    { name: 'Buttons default', render: () => <ButtonsDefault /> },
    { name: 'Buttons disabled', render: () => <ButtonsDisabled /> },
    { name: 'Buttons asChild', render: () => <ButtonsAsChild /> },
    { name: 'Buttons on special frame', render: () => <ButtonsOnSpecialFrame /> },
    { name: 'Buttons mobile row', render: () => <ButtonsMobileRow /> },
    { name: 'Button tooltip', render: () => <ButtonTooltip /> },
    { name: 'Button focus ring', render: () => <ButtonFocusRing /> },
    { name: 'Dialog', render: () => <DialogDefault /> },
    { name: 'Dialog long content', render: () => <DialogLongContent /> },
    { name: 'Dialog paper frame', render: () => <DialogPaperFrame /> },
    { name: 'Dialog with glass className', render: () => <DialogGlassClassName /> },
    { name: 'Dialog hybrid', render: () => <DialogHybrid /> },
    { name: 'AlertDialog', render: () => <AlertDialogLeave /> },
    { name: 'Sheet right', render: () => <SheetState side="right" /> },
    { name: 'Sheet left', render: () => <SheetState side="left" /> },
    { name: 'Sheet bottom', render: () => <SheetState side="bottom" /> },
  ],
};
