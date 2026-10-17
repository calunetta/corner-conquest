import { render } from '@testing-library/react';
import { AdSlotView } from './AdSlot';
import {
  adsDisabledDecision,
  consentDeniedDecision,
  consentGrantedDecision,
  consentUnknownDecision,
} from './AdSlot.fixtures';

describe('AdSlotView', () => {
  it('renders the labelled placeholder when allowed', () => {
    const { getByText } = render(<AdSlotView {...consentGrantedDecision} />);

    expect(getByText('Ad slot (dev placeholder — non-personalized)')).toBeInTheDocument();
  });

  it.each([
    ['flag off', adsDisabledDecision],
    ['consent unknown', consentUnknownDecision],
    ['consent denied', consentDeniedDecision],
  ])('renders nothing when %s', (_label, decision) => {
    const { container } = render(<AdSlotView {...decision} />);

    expect(container).toBeEmptyDOMElement();
  });
});
