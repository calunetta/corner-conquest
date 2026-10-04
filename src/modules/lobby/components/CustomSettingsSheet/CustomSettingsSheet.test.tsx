import { render, screen, fireEvent } from '@testing-library/react';
import { CustomSettingsSheet } from './CustomSettingsSheet';
import { defaultGameSettings } from '@/modules/game-rules';

// Mock ResizeObserver for Slider component
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

describe('CustomSettingsSheet', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tabs for General, Costs, and Content', () => {
    render(
      <CustomSettingsSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
        initialSettings={defaultGameSettings}
      />,
    );

    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Costs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Content' })).toBeInTheDocument();
  });

  it('shows fog of war toggle on general tab', () => {
    render(
      <CustomSettingsSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
        initialSettings={defaultGameSettings}
      />,
    );

    expect(screen.getByText('Fog of War')).toBeInTheDocument();
  });

  it('renders slider for victory point goal', () => {
    render(
      <CustomSettingsSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
        initialSettings={defaultGameSettings}
      />,
    );

    expect(screen.getByText('Victory Points to Win')).toBeInTheDocument();
  });

  it('renders save and cancel buttons', () => {
    render(
      <CustomSettingsSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
        initialSettings={defaultGameSettings}
      />,
    );

    expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('has all three tabs visible', () => {
    render(
      <CustomSettingsSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
        initialSettings={defaultGameSettings}
      />,
    );

    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Costs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Content' })).toBeInTheDocument();
  });

  it('shows sliders on General tab', () => {
    render(
      <CustomSettingsSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
        initialSettings={defaultGameSettings}
      />,
    );

    // General tab is active by default
    const sliders = screen.getAllByRole('slider');
    // General tab should have at least the Fog of War and some sliders
    expect(sliders.length).toBeGreaterThan(0);
    expect(screen.getByText('Victory Points to Win')).toBeInTheDocument();
  });

  it('has Content tab and can be interacted with', () => {
    render(
      <CustomSettingsSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
        initialSettings={defaultGameSettings}
      />,
    );

    // Content tab should exist
    const contentTab = screen.getByRole('tab', { name: 'Content' });
    expect(contentTab).toBeInTheDocument();

    fireEvent.click(contentTab);
    expect(contentTab).toBeInTheDocument();
  });

  it('calls onSave when Save button is clicked', () => {
    render(
      <CustomSettingsSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
        initialSettings={defaultGameSettings}
      />,
    );

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) when Cancel button is clicked', () => {
    render(
      <CustomSettingsSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
        initialSettings={defaultGameSettings}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
