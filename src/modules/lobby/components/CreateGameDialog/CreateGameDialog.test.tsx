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
});
