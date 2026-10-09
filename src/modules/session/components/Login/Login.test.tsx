import { render, screen, fireEvent, within } from '@testing-library/react';
import { LoginView } from './Login';
import type { LoginViewProps } from './Login.types';
import { accountLoginProps, guestLoginProps, loadingLoginProps } from './Login.fixtures';

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

const GUEST_COPY = /enter your commander name to enter the lobby/i;
const ACCOUNT_COPY = 'Choose your permanent commander name — this cannot be changed later.';

function renderLogin(overrides: Partial<LoginViewProps> = {}) {
  return render(<LoginView {...guestLoginProps} {...overrides} />);
}

function getNameInput() {
  return screen.getByRole('textbox', { name: /commander name/i });
}

function getEnterLobbyButton() {
  return screen.getByRole('button', { name: /enter lobby/i });
}

describe('LoginView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mode: loading', () => {
    it('shows a loading status and no name input while Firebase Auth resolves', () => {
      render(<LoginView {...loadingLoginProps} />);

      expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /commander name/i })).not.toBeInTheDocument();
    });

    it('shows no Google button and no Enter Lobby button', () => {
      render(<LoginView {...loadingLoginProps} />);

      expect(screen.queryByRole('button', { name: /sign in with google/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /enter lobby/i })).not.toBeInTheDocument();
    });

    it('shows the title but neither mode description', () => {
      render(<LoginView {...loadingLoginProps} />);

      expect(screen.getByText('Welcome to Corner Conquest')).toBeInTheDocument();
      expect(screen.queryByText(GUEST_COPY)).not.toBeInTheDocument();
      expect(screen.queryByText(ACCOUNT_COPY)).not.toBeInTheDocument();
    });
  });

  describe('mode: guest', () => {
    it('shows the Google sign-in button, the "or" divider, and the name form', () => {
      renderLogin();

      expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled();
      expect(screen.getByText('or')).toBeInTheDocument();
      expect(getNameInput()).toBeInTheDocument();
      expect(getEnterLobbyButton()).toBeInTheDocument();
    });

    it('shows the guest description and no loading status', () => {
      renderLogin();

      expect(screen.getByText(GUEST_COPY)).toBeInTheDocument();
      expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
    });

    it('calls onGoogleSignIn when the Google button is clicked', () => {
      const onGoogleSignIn = jest.fn();
      renderLogin({ onGoogleSignIn });

      fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));

      expect(onGoogleSignIn).toHaveBeenCalledTimes(1);
    });

    it('disables the Google button while isLoading is true', () => {
      renderLogin({ isLoading: true, name: 'Alice' });

      expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeDisabled();
    });
  });

  describe('mode: account', () => {
    it('shows the permanent-name copy instead of the guest copy', () => {
      render(<LoginView {...accountLoginProps} />);

      expect(screen.getByText(ACCOUNT_COPY)).toBeInTheDocument();
      expect(screen.queryByText(GUEST_COPY)).not.toBeInTheDocument();
    });

    it('shows the name form and Enter Lobby but no Google button or divider', () => {
      render(<LoginView {...accountLoginProps} name="Alice" />);

      expect(getNameInput()).toBeInTheDocument();
      expect(getEnterLobbyButton()).toBeEnabled();
      expect(screen.queryByRole('button', { name: /sign in with google/i })).not.toBeInTheDocument();
      expect(screen.queryByText('or')).not.toBeInTheDocument();
    });

    it('shows no loading status', () => {
      render(<LoginView {...accountLoginProps} />);

      expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
    });
  });

  describe('name input', () => {
    it('has the username id and the placeholder "Your Name"', () => {
      renderLogin();

      expect(getNameInput()).toHaveAttribute('id', 'username');
      expect(screen.getByPlaceholderText('Your Name')).toBe(getNameInput());
    });

    it('is associated with the "Commander Name" label', () => {
      renderLogin();

      expect(screen.getByLabelText('Commander Name')).toBe(getNameInput());
    });

    it('shows the current name value', () => {
      renderLogin({ name: 'Alice' });

      expect(getNameInput()).toHaveValue('Alice');
    });

    it('sets data-hydrated="true" when isHydrated is true', () => {
      renderLogin({ isHydrated: true });

      expect(getNameInput()).toHaveAttribute('data-hydrated', 'true');
    });

    it('has no data-hydrated attribute when isHydrated is false', () => {
      renderLogin({ isHydrated: false });

      expect(getNameInput()).not.toHaveAttribute('data-hydrated');
    });

    it('calls onNameChange with the new value when typing', () => {
      const onNameChange = jest.fn();
      renderLogin({ onNameChange });

      fireEvent.change(getNameInput(), { target: { value: 'TestName' } });

      expect(onNameChange).toHaveBeenCalledWith('TestName');
    });

    it('calls onNameKeyDown when a key is pressed', () => {
      const onNameKeyDown = jest.fn();
      renderLogin({ onNameKeyDown });

      fireEvent.keyDown(getNameInput(), { key: 'Enter' });

      expect(onNameKeyDown).toHaveBeenCalledTimes(1);
    });
  });

  describe('Enter Lobby button', () => {
    it('is enabled when the name is not blank and isLoading is false', () => {
      renderLogin({ name: 'Alice', isLoading: false });

      expect(getEnterLobbyButton()).toBeEnabled();
    });

    it('is disabled when the name is empty', () => {
      renderLogin({ name: '' });

      expect(getEnterLobbyButton()).toBeDisabled();
    });

    it('is disabled when the name is only whitespace', () => {
      renderLogin({ name: '   ' });

      expect(getEnterLobbyButton()).toBeDisabled();
    });

    it('is disabled while isLoading is true', () => {
      renderLogin({ name: 'Alice', isLoading: true });

      expect(getEnterLobbyButton()).toBeDisabled();
    });

    it('calls onSubmit when clicked', () => {
      const onSubmit = jest.fn();
      renderLogin({ name: 'Alice', onSubmit });

      fireEvent.click(getEnterLobbyButton());

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('error dialog', () => {
    const errorDialog = {
      open: true,
      title: 'Sign-In Failed',
      description: 'Could not sign in with Google. Please try again.',
    };

    it('renders the title and description passed in errorDialog', () => {
      renderLogin({ errorDialog });

      const dialog = screen.getByRole('alertdialog');
      expect(within(dialog).getByText('Sign-In Failed')).toBeInTheDocument();
      expect(within(dialog).getByText('Could not sign in with Google. Please try again.')).toBeInTheDocument();
    });

    it('does not hardcode the "Username Taken" title', () => {
      renderLogin({ errorDialog });

      expect(screen.queryByText('Username Taken')).not.toBeInTheDocument();
    });

    it('renders the username-taken copy when errorDialog carries it', () => {
      renderLogin({
        errorDialog: {
          open: true,
          title: 'Username Taken',
          description: 'This username is already in use. Please choose a different one.',
        },
      });

      expect(screen.getByRole('alertdialog')).toHaveTextContent('Username Taken');
      expect(screen.getByRole('alertdialog')).toHaveTextContent(/this username is already in use/i);
    });

    it('renders no alert dialog when errorDialog.open is false', () => {
      renderLogin({ errorDialog: { ...errorDialog, open: false } });

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('calls onErrorDialogOpenChange(false) when OK is clicked', () => {
      const onErrorDialogOpenChange = jest.fn();
      renderLogin({ errorDialog, onErrorDialogOpenChange });

      fireEvent.click(screen.getByRole('button', { name: 'OK' }));

      expect(onErrorDialogOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('page content', () => {
    it('renders the welcome title and the "Commander Name" label', () => {
      renderLogin();

      expect(screen.getByText('Welcome to Corner Conquest')).toBeInTheDocument();
      expect(screen.getByText('Commander Name')).toBeInTheDocument();
    });
  });
});
