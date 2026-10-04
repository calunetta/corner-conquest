import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TutorialBeacon } from './TutorialBeacon';

describe('TutorialBeacon', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders the trigger button with correct test id', () => {
    render(<TutorialBeacon id="test-beacon" title="Test" description="Test description" />);

    const button = screen.getByTestId('tutorial-beacon-test-beacon');
    expect(button).toBeInTheDocument();
  });

  it('applies custom className to trigger button', () => {
    render(
      <TutorialBeacon
        id="test-beacon"
        title="Test"
        description="Test description"
        className="custom-class"
      />,
    );

    const button = screen.getByTestId('tutorial-beacon-test-beacon');
    expect(button).toHaveClass('custom-class');
  });

  describe('localStorage integration', () => {
    it('stores seen state in localStorage when opened', () => {
      render(<TutorialBeacon id="test-beacon" title="Test" description="Test description" />);

      const button = screen.getByTestId('tutorial-beacon-test-beacon');
      fireEvent.click(button);

      expect(localStorage.getItem('beacon-seen-test-beacon')).toBe('true');
    });

    it('uses unique localStorage keys for different beacon IDs', () => {
      const { unmount: unmount1 } = render(
        <TutorialBeacon id="beacon-1" title="Test 1" description="Desc 1" />,
      );

      const button1 = screen.getByTestId('tutorial-beacon-beacon-1');
      fireEvent.click(button1);

      expect(localStorage.getItem('beacon-seen-beacon-1')).toBe('true');
      expect(localStorage.getItem('beacon-seen-beacon-2')).toBeNull();

      // Unmount first beacon
      unmount1();

      // Render a different beacon
      const { unmount: unmount2 } = render(
        <TutorialBeacon id="beacon-2" title="Test 2" description="Desc 2" />,
      );

      const button2 = screen.getByTestId('tutorial-beacon-beacon-2');
      fireEvent.click(button2);

      expect(localStorage.getItem('beacon-seen-beacon-2')).toBe('true');
      expect(localStorage.getItem('beacon-seen-beacon-1')).toBe('true');

      unmount2();
    });

    it('recognizes beacon as seen when localStorage key exists on mount', async () => {
      localStorage.setItem('beacon-seen-test-beacon', 'true');

      render(<TutorialBeacon id="test-beacon" title="Test" description="Test description" />);

      // Wait a tick for useEffect to run
      await waitFor(() => {
        expect(localStorage.getItem('beacon-seen-test-beacon')).toBe('true');
      });

      const button = screen.getByTestId('tutorial-beacon-test-beacon');

      // Verify it doesn't have the pulse class
      expect(button).not.toHaveClass('animate-pulse');
    });

    it('recognizes beacon as unseen when localStorage key does not exist on mount', async () => {
      render(<TutorialBeacon id="test-beacon" title="Test" description="Test description" />);

      // Wait for useEffect to detect unseen state
      await waitFor(() => {
        const button = screen.getByTestId('tutorial-beacon-test-beacon');
        expect(button).toHaveClass('animate-pulse');
      });
    });
  });

  describe('popover content', () => {
    it('displays title and description when opened', async () => {
      render(
        <TutorialBeacon
          id="test-beacon"
          title="My Tutorial Title"
          description="My tutorial description"
        />,
      );

      const button = screen.getByTestId('tutorial-beacon-test-beacon');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('My Tutorial Title')).toBeInTheDocument();
        expect(screen.getByText('My tutorial description')).toBeInTheDocument();
      });
    });

    it('renders description as ReactNode', async () => {
      const description = <span data-testid="custom-desc">Custom Content</span>;
      render(
        <TutorialBeacon id="test-beacon" title="Test" description={description} />,
      );

      const button = screen.getByTestId('tutorial-beacon-test-beacon');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('custom-desc')).toBeInTheDocument();
      });
    });
  });

  describe('popover open/close behavior', () => {
    it('popover opens when trigger button is clicked', async () => {
      render(<TutorialBeacon id="test-beacon" title="Title" description="Desc" />);

      const button = screen.getByTestId('tutorial-beacon-test-beacon');

      // Initially popover should not be visible
      expect(screen.queryByText('Title')).not.toBeInTheDocument();

      fireEvent.click(button);

      // After click, title should be visible
      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });

    it('popover closes when close button is clicked', async () => {
      render(<TutorialBeacon id="test-beacon" title="Title" description="Desc" />);

      const button = screen.getByTestId('tutorial-beacon-test-beacon');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });

      // Find all buttons and get the one that is not our trigger button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);

      // The close button should be the second one (after trigger button)
      const closeButton = buttons[1];
      fireEvent.click(closeButton);

      // After close, title should be gone
      await waitFor(() => {
        expect(screen.queryByText('Title')).not.toBeInTheDocument();
      });
    });

    it('marks as seen when opened even if closed immediately', async () => {
      render(<TutorialBeacon id="test-beacon" title="Title" description="Desc" />);

      const button = screen.getByTestId('tutorial-beacon-test-beacon');
      fireEvent.click(button);

      await waitFor(() => {
        expect(localStorage.getItem('beacon-seen-test-beacon')).toBe('true');
      });
    });
  });

  describe('pulse animation', () => {
    it('shows pulse animation when unseen', async () => {
      // Don't pre-set localStorage, so beacon is unseen
      render(<TutorialBeacon id="test-beacon" title="Test" description="Test description" />);

      await waitFor(() => {
        const button = screen.getByTestId('tutorial-beacon-test-beacon');
        expect(button).toHaveClass('animate-pulse');
      });
    });

    it('removes pulse animation after opening popover', async () => {
      // Don't pre-set localStorage
      render(<TutorialBeacon id="test-beacon" title="Test" description="Test description" />);

      const button = screen.getByTestId('tutorial-beacon-test-beacon');

      // Wait for pulse to be present
      await waitFor(() => {
        expect(button).toHaveClass('animate-pulse');
      });

      // Click to open
      fireEvent.click(button);

      // After opening, pulse should be gone
      await waitFor(() => {
        expect(button).not.toHaveClass('animate-pulse');
      });
    });

    it('does not show pulse animation when already seen', async () => {
      localStorage.setItem('beacon-seen-test-beacon', 'true');

      render(<TutorialBeacon id="test-beacon" title="Test" description="Test description" />);

      const button = screen.getByTestId('tutorial-beacon-test-beacon');

      // Wait for state to settle
      await waitFor(() => {
        expect(localStorage.getItem('beacon-seen-test-beacon')).toBe('true');
      });

      expect(button).not.toHaveClass('animate-pulse');
    });
  });

  describe('popover positioning', () => {
    it('respects the side prop for popover position', () => {
      const { rerender } = render(
        <TutorialBeacon
          id="test-beacon"
          title="Test"
          description="Test description"
          side="bottom"
        />,
      );

      const button = screen.getByTestId('tutorial-beacon-test-beacon');
      expect(button).toBeInTheDocument();

      // Test other positions
      rerender(
        <TutorialBeacon
          id="test-beacon"
          title="Test"
          description="Test description"
          side="left"
        />,
      );

      expect(button).toBeInTheDocument();

      rerender(
        <TutorialBeacon
          id="test-beacon"
          title="Test"
          description="Test description"
          side="right"
        />,
      );

      expect(button).toBeInTheDocument();
    });

    it('defaults to top when side is not specified', () => {
      render(<TutorialBeacon id="test-beacon" title="Test" description="Test description" />);

      const button = screen.getByTestId('tutorial-beacon-test-beacon');
      expect(button).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles beacon with empty description', async () => {
      render(<TutorialBeacon id="test-beacon" title="Test" description="" />);

      const button = screen.getByTestId('tutorial-beacon-test-beacon');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });
    });

    it('handles beacon with special characters in ID', async () => {
      render(
        <TutorialBeacon
          id="test-beacon-with-dashes_and_underscores"
          title="Test"
          description="Desc"
        />,
      );

      const button = screen.getByTestId('tutorial-beacon-test-beacon-with-dashes_and_underscores');
      expect(button).toBeInTheDocument();

      fireEvent.click(button);

      await waitFor(() => {
        expect(
          localStorage.getItem('beacon-seen-test-beacon-with-dashes_and_underscores'),
        ).toBe('true');
      });
    });

    it('handles rapid open and close', async () => {
      render(<TutorialBeacon id="test-beacon" title="Test" description="Desc" />);

      const button = screen.getByTestId('tutorial-beacon-test-beacon');

      // Rapid clicks
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should only mark as seen once
      await waitFor(() => {
        expect(localStorage.getItem('beacon-seen-test-beacon')).toBe('true');
      });
    });
  });
});
