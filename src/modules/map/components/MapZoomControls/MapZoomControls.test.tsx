import { render, screen, fireEvent } from '@testing-library/react';
import { MapZoomControls } from './MapZoomControls';

describe('MapZoomControls', () => {
  it('renders the three buttons', () => {
    const handlers = {
      onZoomIn: jest.fn(),
      onZoomOut: jest.fn(),
      onResetZoom: jest.fn(),
    };

    render(<MapZoomControls zoom={0.85} {...handlers} />);

    expect(screen.getByTestId('map-zoom-in')).toBeInTheDocument();
    expect(screen.getByTestId('map-zoom-out')).toBeInTheDocument();
    expect(screen.getByTestId('map-zoom-reset')).toBeInTheDocument();
  });

  it('shows the current zoom percentage', () => {
    const handlers = {
      onZoomIn: jest.fn(),
      onZoomOut: jest.fn(),
      onResetZoom: jest.fn(),
    };

    render(<MapZoomControls zoom={1.0} {...handlers} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calculates percentage correctly using Math.round(zoom*100)', () => {
    const handlers = {
      onZoomIn: jest.fn(),
      onZoomOut: jest.fn(),
      onResetZoom: jest.fn(),
    };

    // Test zoom value that requires rounding
    render(<MapZoomControls zoom={0.85} {...handlers} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('calls onZoomIn when zoom in button is clicked', () => {
    const onZoomIn = jest.fn();
    const handlers = {
      onZoomIn,
      onZoomOut: jest.fn(),
      onResetZoom: jest.fn(),
    };

    render(<MapZoomControls zoom={0.85} {...handlers} />);

    fireEvent.click(screen.getByTestId('map-zoom-in'));

    expect(onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('calls onZoomOut when zoom out button is clicked', () => {
    const onZoomOut = jest.fn();
    const handlers = {
      onZoomIn: jest.fn(),
      onZoomOut,
      onResetZoom: jest.fn(),
    };

    render(<MapZoomControls zoom={0.85} {...handlers} />);

    fireEvent.click(screen.getByTestId('map-zoom-out'));

    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('calls onResetZoom when reset button is clicked', () => {
    const onResetZoom = jest.fn();
    const handlers = {
      onZoomIn: jest.fn(),
      onZoomOut: jest.fn(),
      onResetZoom,
    };

    render(<MapZoomControls zoom={1.0} defaultZoom={0.85} {...handlers} />);

    fireEvent.click(screen.getByTestId('map-zoom-reset'));

    expect(onResetZoom).toHaveBeenCalledTimes(1);
  });

  it('uses custom defaultZoom when provided', () => {
    const handlers = {
      onZoomIn: jest.fn(),
      onZoomOut: jest.fn(),
      onResetZoom: jest.fn(),
    };

    render(<MapZoomControls zoom={0.9} defaultZoom={0.9} {...handlers} />);

    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('renders reset button with icon and current zoom percentage', () => {
    const handlers = {
      onZoomIn: jest.fn(),
      onZoomOut: jest.fn(),
      onResetZoom: jest.fn(),
    };

    render(<MapZoomControls zoom={1.0} defaultZoom={0.85} {...handlers} />);

    const resetButton = screen.getByTestId('map-zoom-reset');
    // Button contains the percentage that will be shown
    expect(resetButton).toHaveTextContent('100%');
    // Button should be present and clickable
    expect(resetButton).toBeVisible();
  });

  it('renders reset button with correct percentage when using custom defaultZoom', () => {
    const handlers = {
      onZoomIn: jest.fn(),
      onZoomOut: jest.fn(),
      onResetZoom: jest.fn(),
    };

    render(<MapZoomControls zoom={1.15} defaultZoom={1.0} {...handlers} />);

    const resetButton = screen.getByTestId('map-zoom-reset');
    // Current zoom is 115%, not the default
    expect(resetButton).toHaveTextContent('115%');
  });

  it('renders three buttons with proper structure', () => {
    const handlers = {
      onZoomIn: jest.fn(),
      onZoomOut: jest.fn(),
      onResetZoom: jest.fn(),
    };

    render(<MapZoomControls zoom={0.85} {...handlers} />);

    // All buttons are rendered
    const zoomOutButton = screen.getByTestId('map-zoom-out');
    const resetButton = screen.getByTestId('map-zoom-reset');
    const zoomInButton = screen.getByTestId('map-zoom-in');

    expect(zoomOutButton).toBeInTheDocument();
    expect(resetButton).toBeInTheDocument();
    expect(zoomInButton).toBeInTheDocument();

    // Reset button uniquely displays the percentage
    expect(resetButton).toHaveTextContent('85%');
    expect(zoomOutButton).not.toHaveTextContent('%');
    expect(zoomInButton).not.toHaveTextContent('%');
  });
});
