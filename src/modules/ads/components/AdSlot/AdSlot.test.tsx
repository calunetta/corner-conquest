import { render } from '@testing-library/react';
import { AdSlotView } from './AdSlot';
import {
  adsDisabledDecision,
  consentUnknownDecision,
  gdprAppliesDecision,
  gdprDoesNotApplyDecision,
  productionDecision,
} from './AdSlot.fixtures';

describe('AdSlotView', () => {
  it('renders the placeholder with consent unknown', () => {
    const { getByTestId } = render(<AdSlotView {...consentUnknownDecision} />);

    expect(getByTestId('ad-slot-placeholder')).toHaveTextContent(
      'Ad slot (dev placeholder — non-personalized) · consent: unknown',
    );
  });

  it.each([
    ['GDPR applies', gdprAppliesDecision, 'consent: gdpr applies'],
    ['GDPR does not apply', gdprDoesNotApplyDecision, 'consent: gdpr does not apply'],
  ])('shows the consent state when %s', (_label, decision, expectedText) => {
    const { getByTestId } = render(<AdSlotView {...decision} />);

    expect(getByTestId('ad-slot-placeholder')).toHaveTextContent(expectedText);
  });

  it.each([
    ['flag off', adsDisabledDecision],
    ['production build', productionDecision],
  ])('renders nothing when %s', (_label, decision) => {
    const { container } = render(<AdSlotView {...decision} />);

    expect(container).toBeEmptyDOMElement();
  });
});
