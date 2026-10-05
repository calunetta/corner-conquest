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

const renderWithProviders = (component: React.ReactElement) => {
  return render(<TooltipProvider>{component}</TooltipProvider>);
};

describe('CreateGameDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('renders the correct icon for each format card', () => {
    renderWithProviders(
      <CreateGameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreateGame={mockOnCreateGame}
      />,
    );

    const soloCard = screen.getByText('Solo vs. Bot AI').closest('button')!;
    const twoPlayersCard = screen.getByText('2 Players').closest('button')!;
    const threePlayersCard = screen.getByText('3 Players').closest('button')!;
    const fourPlayersCard = screen.getByText('4 Players').closest('button')!;

    expect(soloCard.querySelector('[data-testid="lucide-icon-bot"]')).toBeInTheDocument();
    expect(twoPlayersCard.querySelector('[data-testid="lucide-icon-swords"]')).toBeInTheDocument();
    expect(threePlayersCard.querySelector('[data-testid="lucide-icon-users"]')).toBeInTheDocument();
    expect(fourPlayersCard.querySelector('[data-testid="lucide-icon-crown"]')).toBeInTheDocument();
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

  // tester-b: Comprehensive state and accessibility tests
  describe('Format card states and meta text', () => {
    it('renders meta text for all 4 format cards', () => {
      renderWithProviders(
        <CreateGameDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreateGame={mockOnCreateGame}
        />,
      );

      expect(screen.getByText('Training match')).toBeInTheDocument();
      expect(screen.getByText('1v1 Duel')).toBeInTheDocument();
      expect(screen.getByText('Archipelago Skirmish')).toBeInTheDocument();
      expect(screen.getByText('Grand Conquest')).toBeInTheDocument();
    });

    it('all format cards have aria-pressed attribute (ARIA for selection state)', () => {
      renderWithProviders(
        <CreateGameDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreateGame={mockOnCreateGame}
        />,
      );

      const soloButton = screen.getByText('Solo vs. Bot AI').closest('button');
      const twoPlayersButton = screen.getByText('2 Players').closest('button');
      const threePlayersButton = screen.getByText('3 Players').closest('button');
      const fourPlayersButton = screen.getByText('4 Players').closest('button');

      // All buttons should have aria-pressed attribute
      [soloButton, twoPlayersButton, threePlayersButton, fourPlayersButton].forEach((btn) => {
        expect(btn).toHaveAttribute('aria-pressed');
      });
    });

    it('format cards wrap in a group with aria-labelledby pointing to the label', () => {
      renderWithProviders(
        <CreateGameDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreateGame={mockOnCreateGame}
        />,
      );

      const group = screen.getByRole('group', { hidden: true });
      expect(group).toHaveAttribute('aria-labelledby', 'maxPlayers');

      const label = screen.getByText('Match Format');
      expect(label).toHaveAttribute('id', 'maxPlayers');
    });

    it('clicking format card toggles only that card selected (others become unselected)', () => {
      renderWithProviders(
        <CreateGameDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreateGame={mockOnCreateGame}
        />,
      );

      const soloButton = screen.getByText('Solo vs. Bot AI').closest('button')!;
      const threePlayersButton = screen.getByText('3 Players').closest('button')!;

      // Initially 4 Players is selected
      expect(screen.getByText('4 Players').closest('button')).toHaveAttribute('aria-pressed', 'true');

      // Click Solo
      fireEvent.click(soloButton);
      expect(soloButton).toHaveAttribute('aria-pressed', 'true');
      expect(threePlayersButton).toHaveAttribute('aria-pressed', 'false');

      // Click 3 Players
      fireEvent.click(threePlayersButton);
      expect(threePlayersButton).toHaveAttribute('aria-pressed', 'true');
      expect(soloButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Keyboard navigation', () => {
    it('all format cards are keyboard-focusable (type="button")', () => {
      renderWithProviders(
        <CreateGameDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreateGame={mockOnCreateGame}
        />,
      );

      const formatCardButtons = Array.from(
        screen.getAllByRole('button'),
      ).filter((btn) => btn.getAttribute('aria-pressed') !== null) as HTMLButtonElement[];

      expect(formatCardButtons).toHaveLength(4);
      formatCardButtons.forEach((btn) => {
        expect(btn).toHaveAttribute('type', 'button');
        expect(btn).not.toBeDisabled();
      });
    });

    it('format card buttons activate on click (native button behavior)', () => {
      renderWithProviders(
        <CreateGameDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreateGame={mockOnCreateGame}
        />,
      );

      const soloButton = screen.getByText('Solo vs. Bot AI').closest('button')!;

      fireEvent.click(soloButton);
      expect(soloButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Switching between format cards maintains proper state', () => {
    it('switches through all options with proper aria-pressed state', () => {
      renderWithProviders(
        <CreateGameDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreateGame={mockOnCreateGame}
        />,
      );

      const soloButton = screen.getByText('Solo vs. Bot AI').closest('button')!;
      const twoPlayersButton = screen.getByText('2 Players').closest('button')!;
      const threePlayersButton = screen.getByText('3 Players').closest('button')!;
      const fourPlayersButton = screen.getByText('4 Players').closest('button')!;

      // Start with 4 Players selected
      expect(fourPlayersButton).toHaveAttribute('aria-pressed', 'true');
      expect(soloButton).toHaveAttribute('aria-pressed', 'false');
      expect(twoPlayersButton).toHaveAttribute('aria-pressed', 'false');
      expect(threePlayersButton).toHaveAttribute('aria-pressed', 'false');

      // Switch through all options
      fireEvent.click(soloButton);
      expect(soloButton).toHaveAttribute('aria-pressed', 'true');
      [twoPlayersButton, threePlayersButton, fourPlayersButton].forEach((btn) => {
        expect(btn).toHaveAttribute('aria-pressed', 'false');
      });

      fireEvent.click(twoPlayersButton);
      expect(twoPlayersButton).toHaveAttribute('aria-pressed', 'true');
      [soloButton, threePlayersButton, fourPlayersButton].forEach((btn) => {
        expect(btn).toHaveAttribute('aria-pressed', 'false');
      });

      fireEvent.click(threePlayersButton);
      expect(threePlayersButton).toHaveAttribute('aria-pressed', 'true');
      [soloButton, twoPlayersButton, fourPlayersButton].forEach((btn) => {
        expect(btn).toHaveAttribute('aria-pressed', 'false');
      });

      fireEvent.click(fourPlayersButton);
      expect(fourPlayersButton).toHaveAttribute('aria-pressed', 'true');
      [soloButton, twoPlayersButton, threePlayersButton].forEach((btn) => {
        expect(btn).toHaveAttribute('aria-pressed', 'false');
      });
    });
  });
});
