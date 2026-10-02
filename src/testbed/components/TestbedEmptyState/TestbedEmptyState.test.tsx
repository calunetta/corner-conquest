import { render, screen } from '@testing-library/react';
import { TestbedEmptyState } from './TestbedEmptyState';

describe('TestbedEmptyState', () => {
  it('renders the h1 heading "Select a component"', () => {
    render(<TestbedEmptyState />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Select a component' });
    expect(heading).toBeInTheDocument();
  });

  it('renders the body copy text', () => {
    render(<TestbedEmptyState />);

    expect(screen.getByText('Every registered component state, rendered in isolation. Pick a component from the list to see all its states.')).toBeInTheDocument();
  });

  it('renders both heading and body together', () => {
    render(<TestbedEmptyState />);

    const heading = screen.getByRole('heading', { level: 1 });
    const body = screen.getByText(/Every registered component state/);

    expect(heading.parentElement).toBe(body.parentElement);
  });
});
