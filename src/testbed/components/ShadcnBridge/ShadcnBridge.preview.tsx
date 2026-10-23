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
import { InputStates, LabelWithInput, TextareaStates } from './ShadcnBridgeFields';
import {
  Badges,
  CardFrames,
  CardPlate,
  ProgressOnDark,
  ProgressOnPaper,
} from './ShadcnBridgePlates';
import {
  PopoverOpen,
  TabsStates,
  ToastDefault,
  ToastDestructive,
  ToastLongText,
  TooltipOpen,
} from './ShadcnBridgeNav';
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
    { name: 'Card plate', render: () => <CardPlate /> },
    { name: 'Card frames', render: () => <CardFrames /> },
    { name: 'Input', render: () => <InputStates /> },
    { name: 'Textarea', render: () => <TextareaStates /> },
    { name: 'Label with input', render: () => <LabelWithInput /> },
    { name: 'Badges', render: () => <Badges /> },
    { name: 'Progress on dark', render: () => <ProgressOnDark /> },
    { name: 'Progress on paper', render: () => <ProgressOnPaper /> },
    { name: 'Tooltip open', render: () => <TooltipOpen /> },
    { name: 'Popover open', render: () => <PopoverOpen /> },
    { name: 'Tabs', render: () => <TabsStates /> },
    { name: 'Toast default', render: () => <ToastDefault /> },
    { name: 'Toast destructive', render: () => <ToastDestructive /> },
    { name: 'Toast long text', render: () => <ToastLongText /> },
  ],
};
