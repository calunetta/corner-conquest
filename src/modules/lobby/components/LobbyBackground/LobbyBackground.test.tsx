import { render, screen } from '@testing-library/react';
import { LobbyBackground } from './LobbyBackground';

describe('LobbyBackground', () => {
  it('renders without crashing', () => {
    const { container } = render(<LobbyBackground />);
    expect(container.querySelector('[class*="pointer-events-none"]')).toBeInTheDocument();
  });

  it('includes alt text for all island sprites', () => {
    render(<LobbyBackground />);

    expect(screen.getByAltText('Blue Castle')).toBeInTheDocument();
    expect(screen.getByAltText('Blue Knight')).toBeInTheDocument();
    expect(screen.getByAltText('Wild Bear')).toBeInTheDocument();
    expect(screen.getByAltText('Red Castle')).toBeInTheDocument();
  });

  it('includes alt text for all boat sprites', () => {
    render(<LobbyBackground />);

    expect(screen.getByAltText('Patrol Boat 1')).toBeInTheDocument();
    expect(screen.getByAltText('Patrol Boat 2')).toBeInTheDocument();
  });
});
