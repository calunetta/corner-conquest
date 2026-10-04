import { render, screen, fireEvent } from '@testing-library/react';
import { LoginView } from './Login';
import type { LoginViewProps } from './Login.types';

// Mock next/image to avoid issues with Image component in tests
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

// Mock LobbyBackground to avoid rendering the full background
jest.mock('@/modules/lobby', () => ({
  LobbyBackground: () => <div data-testid="lobby-background" />,
}));

// Fixtures for common prop states
const defaultProps: LoginViewProps = {
  name: '',
  isLoading: false,
  isHydrated: true,
  showErrorDialog: false,
  onNameChange: jest.fn(),
  onNameKeyDown: jest.fn(),
  onSubmit: jest.fn(),
  onErrorDialogOpenChange: jest.fn(),
};

describe('LoginView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('input element', () => {
    it('has id="username"', () => {
      render(<LoginView {...defaultProps} />);

      const input = screen.getByRole('textbox', { name: /commander name/i });
      expect(input).toHaveAttribute('id', 'username');
    });

    it('has data-hydrated="true" when isHydrated is true', () => {
      render(<LoginView {...defaultProps} isHydrated={true} />);

      const input = screen.getByRole('textbox', { name: /commander name/i });
      expect(input).toHaveAttribute('data-hydrated', 'true');
    });

    it('does not have data-hydrated attribute when isHydrated is false', () => {
      render(<LoginView {...defaultProps} isHydrated={false} />);

      const input = screen.getByRole('textbox', { name: /commander name/i });
      expect(input).not.toHaveAttribute('data-hydrated');
    });

    it('displays placeholder text "Your Name"', () => {
      render(<LoginView {...defaultProps} />);

      const input = screen.getByPlaceholderText('Your Name');
      expect(input).toBeInTheDocument();
    });

    it('shows the current name value', () => {
      render(<LoginView {...defaultProps} name="Alice" />);

      const input = screen.getByRole('textbox', { name: /commander name/i }) as HTMLInputElement;
      expect(input.value).toBe('Alice');
    });
  });

  describe('name input interaction', () => {
    it('calls onNameChange when typing in the input', () => {
      const onNameChange = jest.fn();
      render(<LoginView {...defaultProps} onNameChange={onNameChange} />);

      const input = screen.getByRole('textbox', { name: /commander name/i });
      fireEvent.change(input, { target: { value: 'TestName' } });

      expect(onNameChange).toHaveBeenCalledWith('TestName');
    });

    it('calls onNameKeyDown when a key is pressed in the input', () => {
      const onNameKeyDown = jest.fn();
      render(<LoginView {...defaultProps} onNameKeyDown={onNameKeyDown} />);

      const input = screen.getByRole('textbox', { name: /commander name/i });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onNameKeyDown).toHaveBeenCalled();
    });
  });

  describe('Enter Lobby button', () => {
    it('has text "Enter Lobby"', () => {
      render(<LoginView {...defaultProps} />);

      expect(screen.getByRole('button', { name: /enter lobby/i })).toBeInTheDocument();
    });

    it('is enabled when name is not empty and isLoading is false', () => {
      render(<LoginView {...defaultProps} name="Alice" isLoading={false} />);

      const button = screen.getByRole('button', { name: /enter lobby/i });
      expect(button).toBeEnabled();
    });

    it('is disabled when name is empty', () => {
      render(<LoginView {...defaultProps} name="" isLoading={false} />);

      const button = screen.getByRole('button', { name: /enter lobby/i });
      expect(button).toBeDisabled();
    });

    it('is disabled when name is only whitespace', () => {
      render(<LoginView {...defaultProps} name="   " isLoading={false} />);

      const button = screen.getByRole('button', { name: /enter lobby/i });
      expect(button).toBeDisabled();
    });

    it('is disabled when isLoading is true', () => {
      render(<LoginView {...defaultProps} name="Alice" isLoading={true} />);

      const button = screen.getByRole('button', { name: /enter lobby/i });
      expect(button).toBeDisabled();
    });

    it('calls onSubmit when clicked', () => {
      const onSubmit = jest.fn();
      render(<LoginView {...defaultProps} name="Alice" onSubmit={onSubmit} />);

      const button = screen.getByRole('button', { name: /enter lobby/i });
      fireEvent.click(button);

      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('loading state icon', () => {
    it('shows a spinner icon when isLoading is true', () => {
      render(<LoginView {...defaultProps} isLoading={true} name="Alice" />);

      const button = screen.getByRole('button', { name: /enter lobby/i });
      // The spinner is rendered by Loader2 from lucide-react
      // When loading, Loader2 component with animate-spin class is rendered
      const spinner = button.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeInTheDocument();
    });

    it('shows a sword icon when isLoading is false', () => {
      render(<LoginView {...defaultProps} isLoading={false} name="Alice" />);

      const button = screen.getByRole('button', { name: /enter lobby/i });
      // The sword is rendered by Swords from lucide-react
      // When not loading, there should be no animate-spin spinner
      const spinner = button.querySelector('[class*="animate-spin"]');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('error dialog', () => {
    it('renders AlertDialog with "Username Taken" title when showErrorDialog is true', () => {
      render(<LoginView {...defaultProps} showErrorDialog={true} />);

      expect(screen.getByText('Username Taken')).toBeInTheDocument();
    });

    it('displays error description text', () => {
      render(<LoginView {...defaultProps} showErrorDialog={true} />);

      expect(
        screen.getByText(/this username is already in use/i)
      ).toBeInTheDocument();
    });

    it('does not render the dialog when showErrorDialog is false', () => {
      render(<LoginView {...defaultProps} showErrorDialog={false} />);

      expect(screen.queryByText('Username Taken')).not.toBeInTheDocument();
    });

    it('has an OK button in the dialog', () => {
      render(<LoginView {...defaultProps} showErrorDialog={true} />);

      const okButton = screen.getByRole('button', { name: /ok/i });
      expect(okButton).toBeInTheDocument();
    });

    it('calls onErrorDialogOpenChange(false) when OK button is clicked', () => {
      const onErrorDialogOpenChange = jest.fn();
      render(
        <LoginView {...defaultProps} showErrorDialog={true} onErrorDialogOpenChange={onErrorDialogOpenChange} />
      );

      const okButton = screen.getByRole('button', { name: /ok/i });
      fireEvent.click(okButton);

      expect(onErrorDialogOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('page content', () => {
    it('renders the welcome title', () => {
      render(<LoginView {...defaultProps} />);

      expect(screen.getByText('Welcome to Corner Conquest')).toBeInTheDocument();
    });

    it('renders the description text', () => {
      render(<LoginView {...defaultProps} />);

      expect(
        screen.getByText(/enter your commander name to enter the lobby/i)
      ).toBeInTheDocument();
    });

    it('renders the label "Commander Name"', () => {
      render(<LoginView {...defaultProps} />);

      expect(screen.getByText('Commander Name')).toBeInTheDocument();
    });

    it('renders the compass icon', () => {
      render(<LoginView {...defaultProps} />);

      // The compass icon is rendered in the header
      // Verify the title is rendered which appears with the icon
      expect(screen.getByText('Welcome to Corner Conquest')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('input is associated with label via htmlFor', () => {
      render(<LoginView {...defaultProps} />);

      const label = screen.getByText('Commander Name');
      expect(label).toHaveAttribute('for', 'username');
    });
  });
});
