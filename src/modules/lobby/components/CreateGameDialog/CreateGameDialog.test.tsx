import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CreateGameDialog } from './CreateGameDialog';

const mockOnOpenChange = jest.fn();
const mockOnCreateGame = jest.fn(async () => true);

// Mock ResizeObserver for Slider component
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

describe('CreateGameDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(<TooltipProvider>{component}</TooltipProvider>);
  };

  it('renders the dialog when open is true', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    expect(screen.getByText('Create Conquest Arena')).toBeInTheDocument();
  });

  it('has a disabled create button when game name is empty', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    const createButton = screen.getByRole('button', { name: /create game/i });
    expect(createButton).toBeDisabled();
  });

  it('enables create button when game name is entered', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    const nameInput = screen.getByPlaceholderText('Archipelago Conquest') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'My Game' } });

    const createButton = screen.getByRole('button', { name: /create game/i });
    expect(createButton).not.toBeDisabled();
  });

  it('renders all 4 format cards with titles', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    expect(screen.getByText('Solo vs. Bot AI')).toBeInTheDocument();
    expect(screen.getByText('2 Players')).toBeInTheDocument();
    expect(screen.getByText('3 Players')).toBeInTheDocument();
    expect(screen.getByText('4 Players')).toBeInTheDocument();
  });

  it('renders faction options', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    expect(screen.getByText('Choose Faction Army')).toBeInTheDocument();
  });

  it('shows advanced rules button', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    expect(screen.getByRole('button', { name: /advanced rules/i })).toBeInTheDocument();
  });

  it('opens CustomSettingsSheet when Advanced Rules is clicked', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    const advancedButton = screen.getByRole('button', { name: /advanced rules/i });
    fireEvent.click(advancedButton);

    // Check for CustomSettingsSheet tab appearance
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
  });

  it('displays faction options with images', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    // Check that faction label is present
    expect(screen.getByText('Choose Faction Army')).toBeInTheDocument();

    // Faction buttons should be rendered
    const factionButtons = screen.getAllByRole('button').filter((btn) => {
      return btn.querySelector('img') !== null;
    });
    expect(factionButtons.length).toBeGreaterThan(0);
  });

  it('default render shows "4 Players" format card selected (aria-pressed=true)', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    const formatButtons = screen.getAllByRole('button').filter((btn) => {
      return btn.getAttribute('aria-pressed') !== null;
    });
    expect(formatButtons.length).toBe(4);

    const fourPlayersButton = formatButtons.find((btn) => btn.textContent?.includes('4 Players'));
    expect(fourPlayersButton).toHaveAttribute('aria-pressed', 'true');

    const otherButtons = formatButtons.filter((btn) => !btn.textContent?.includes('4 Players'));
    otherButtons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('clicking "Solo vs. Bot AI" card makes it selected and reveals Debug Training Mode', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    // Debug Training Mode should not be visible initially (default is 4 players)
    expect(screen.queryByText('Debug Training Mode')).not.toBeInTheDocument();

    const soloButton = screen.getByText('Solo vs. Bot AI').closest('button');
    fireEvent.click(soloButton!);

    // After clicking, Solo card should be selected
    expect(soloButton).toHaveAttribute('aria-pressed', 'true');

    // Debug Training Mode should now be visible
    expect(screen.getByText('Debug Training Mode')).toBeInTheDocument();
  });

  it('clicking non-solo format card hides Debug Training Mode', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    const soloButton = screen.getByText('Solo vs. Bot AI').closest('button');
    fireEvent.click(soloButton!);
    expect(screen.getByText('Debug Training Mode')).toBeInTheDocument();

    const twoPlayersButton = screen.getByText('2 Players').closest('button');
    fireEvent.click(twoPlayersButton!);

    expect(screen.queryByText('Debug Training Mode')).not.toBeInTheDocument();
    expect(twoPlayersButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not render Select placeholder text after replacement', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    expect(screen.queryByText('Select format')).not.toBeInTheDocument();
  });
});
