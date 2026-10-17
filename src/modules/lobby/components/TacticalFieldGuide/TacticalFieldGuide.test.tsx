import { fireEvent, render, screen } from '@testing-library/react';
import { TacticalFieldGuide } from './TacticalFieldGuide';
import { styles } from './TacticalFieldGuide.styles';

const getToggle = () => screen.getByRole('button', { name: 'Tactical Field Guide' });
const getContent = () => document.getElementById(getToggle().getAttribute('aria-controls') as string) as HTMLElement;

describe('TacticalFieldGuide', () => {
  it('is collapsed by default on mobile', () => {
    render(<TacticalFieldGuide />);

    expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(getContent()).toHaveClass(...styles.contentCollapsed.split(' '));
  });

  it('keeps the field guide copy in the DOM while collapsed', () => {
    render(<TacticalFieldGuide />);

    expect(screen.getByText('Victory Point Goal:')).toBeInTheDocument();
    expect(screen.getByText('Positioning:')).toBeInTheDocument();
    expect(screen.getByText('Special Cards:')).toBeInTheDocument();
  });

  it('expands and collapses the content when the toggle is clicked', () => {
    render(<TacticalFieldGuide />);

    fireEvent.click(getToggle());
    expect(getToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(getContent()).not.toHaveClass('hidden');

    fireEvent.click(getToggle());
    expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(getContent()).toHaveClass('hidden');
  });

  it('points the toggle at the content region it controls', () => {
    render(<TacticalFieldGuide />);

    expect(getToggle().getAttribute('aria-controls')).toBeTruthy();
    expect(getContent()).toContainElement(screen.getByText('Victory Point Goal:'));
  });
});
