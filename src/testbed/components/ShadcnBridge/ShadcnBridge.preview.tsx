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
  ],
};
