import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PixelButton } from './PixelButton';
import type { PixelButtonSize, PixelButtonVariant } from './PixelButton.types';

const PNG_FILE_NAME = /([^/]+\.png)/;

/** Sorted, de-duplicated sheet file names drawn by every element under `container` (art layers only). */
function getDrawnSheetFiles(container: HTMLElement): string[] {
  const images = Array.from(container.querySelectorAll<HTMLElement>('*'))
    .map((element) => element.style.backgroundImage)
    .filter((image) => image !== '');
  const files = images.map((image) => PNG_FILE_NAME.exec(image)?.[1] ?? image);
  return [...new Set(files)].sort();
}

describe('PixelButton', () => {
  it('renders a native button with its label and type="button"', () => {
    render(<PixelButton>Move</PixelButton>);

    const button = screen.getByRole('button', { name: 'Move' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toBeEnabled();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<PixelButton onClick={onClick}>Move</PixelButton>);

    fireEvent.click(screen.getByRole('button', { name: 'Move' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('hover and press do not swallow a click', () => {
    const onClick = jest.fn();
    render(<PixelButton onClick={onClick}>Move</PixelButton>);
    const button = screen.getByRole('button', { name: 'Move' });

    fireEvent.pointerEnter(button);
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('passes className through to the button element', () => {
    render(<PixelButton className="test-extra-class">Move</PixelButton>);

    expect(screen.getByRole('button', { name: 'Move' })).toHaveClass('test-extra-class');
  });

  describe('visual state', () => {
    const getVisual = (button: HTMLElement) => button.getAttribute('data-visual');

    it('starts regular', () => {
      render(<PixelButton>Move</PixelButton>);

      expect(getVisual(screen.getByRole('button', { name: 'Move' }))).toBe('regular');
    });

    it('goes hover on pointer enter, pressed on pointer down, hover on pointer up', () => {
      render(<PixelButton>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.pointerEnter(button);
      expect(getVisual(button)).toBe('hover');
      fireEvent.pointerDown(button);
      expect(getVisual(button)).toBe('pressed');
      fireEvent.pointerUp(button);
      expect(getVisual(button)).toBe('hover');
    });

    it('returns to regular on pointer leave', () => {
      render(<PixelButton>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.pointerEnter(button);
      fireEvent.pointerLeave(button);

      expect(getVisual(button)).toBe('regular');
    });

    it('returns to regular on pointer cancel during a press', () => {
      render(<PixelButton>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.pointerEnter(button);
      fireEvent.pointerDown(button);
      fireEvent.pointerCancel(button);

      expect(getVisual(button)).toBe('regular');
    });

    it('stays disabled for pointer events when disabled', () => {
      render(<PixelButton disabled>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.pointerEnter(button);
      fireEvent.pointerDown(button);
      fireEvent.pointerUp(button);

      expect(getVisual(button)).toBe('disabled');
    });

    it('is disabled visually while loading and stays so on pointer events', () => {
      render(<PixelButton loading>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });
      expect(getVisual(button)).toBe('disabled');

      fireEvent.pointerEnter(button);
      fireEvent.pointerDown(button);

      expect(getVisual(button)).toBe('disabled');
    });
  });

  describe('disabled', () => {
    it('is disabled and does not call onClick on click', () => {
      const onClick = jest.fn();
      render(<PixelButton disabled onClick={onClick}>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      expect(button).toBeDisabled();
      fireEvent.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });

    // jsdom does not turn Enter into a click, so this checks only that no handler fires on keydown.
    it('does not call onClick on Enter keydown', () => {
      const onClick = jest.fn();
      render(<PixelButton disabled onClick={onClick}>Move</PixelButton>);

      fireEvent.keyDown(screen.getByRole('button', { name: 'Move' }), { key: 'Enter' });

      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not call onClick after a pointer press', () => {
      const onClick = jest.fn();
      render(<PixelButton disabled onClick={onClick}>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.pointerEnter(button);
      fireEvent.pointerDown(button);
      fireEvent.pointerUp(button);
      fireEvent.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('loading', () => {
    it('is disabled, marked aria-busy and keeps the label in the DOM', () => {
      render(<PixelButton loading>Move</PixelButton>);

      const button = screen.getByRole('button', { name: 'Move' });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Move')).toBeInTheDocument();
    });

    it('shows the three-dot loading text', () => {
      render(<PixelButton loading>Move</PixelButton>);

      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('does not call onClick on click', () => {
      const onClick = jest.fn();
      render(<PixelButton loading onClick={onClick}>Move</PixelButton>);

      fireEvent.click(screen.getByRole('button', { name: 'Move' }));

      expect(onClick).not.toHaveBeenCalled();
    });

    it('has no aria-busy and no loading text when not loading', () => {
      render(<PixelButton>Move</PixelButton>);

      const button = screen.getByRole('button', { name: 'Move' });
      expect(button).not.toHaveAttribute('aria-busy');
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });
  });

  describe('icon sizes', () => {
    it.each(['icon-round', 'icon-square'] as const)(
      '%s takes its accessible name from aria-label',
      (size) => {
        render(<PixelButton size={size} aria-label="Close" />);

        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      },
    );
  });

  // The art is drawn with CSS backgrounds; the file names are the observable proof of which sheets a size and variant show.
  describe('art', () => {
    it.each<[PixelButtonVariant, PixelButtonSize, string[]]>([
      ['primary', 'default', ['Button_Blue_3Slides.png', 'Button_Blue_3Slides_Pressed.png', 'Button_Disable_3Slides.png', 'Button_Hover_3Slides.png']],
      ['danger', 'default', ['Button_Red_3Slides.png', 'Button_Red_3Slides_Pressed.png', 'Button_Disable_3Slides.png', 'Button_Hover_3Slides.png']],
      ['primary', 'large', ['Button_Blue_9Slides.png', 'Button_Blue_9Slides_Pressed.png', 'Button_Disable_9Slides.png', 'Button_Hover_9Slides.png']],
      ['danger', 'large', ['Button_Red_9Slides.png', 'Button_Red_9Slides_Pressed.png', 'Button_Disable_9Slides.png', 'Button_Hover_9Slides.png']],
      ['primary', 'icon-round', ['SmallBlueRoundButton_Pressed.png', 'SmallBlueRoundButton_Regular.png']],
      ['primary', 'icon-square', ['SmallBlueSquareButton_Pressed.png', 'SmallBlueSquareButton_Regular.png']],
      ['danger', 'icon-round', ['SmallRedRoundButton_Pressed.png', 'SmallRedRoundButton_Regular.png']],
      ['danger', 'icon-square', ['SmallRedSquareButton_Pressed.png', 'SmallRedSquareButton_Regular.png']],
    ])('%s variant at %s size draws exactly these sheets', (variant, size, expectedFiles) => {
      const { container } = render(
        <PixelButton variant={variant} size={size} aria-label="Move" />,
      );

      expect(getDrawnSheetFiles(container)).toEqual([...expectedFiles].sort());
    });
  });

  describe('forwarded ref', () => {
    it('ref object points at the button element', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<PixelButton ref={ref}>Move</PixelButton>);

      expect(ref.current).toBe(screen.getByRole('button', { name: 'Move' }));
    });

    it('ref callback receives the button element on mount', () => {
      const ref = jest.fn();
      render(<PixelButton ref={ref}>Move</PixelButton>);

      expect(ref).toHaveBeenCalledWith(screen.getByRole('button', { name: 'Move' }));
    });
  });

  describe('variant attribute', () => {
    it.each<PixelButtonVariant>(['primary', 'danger', 'neutral'])(
      'exposes data-variant=%s on the button element',
      (variant) => {
        render(<PixelButton variant={variant}>Move</PixelButton>);

        expect(screen.getByRole('button', { name: 'Move' })).toHaveAttribute('data-variant', variant);
      },
    );

    it('defaults to primary', () => {
      render(<PixelButton>Move</PixelButton>);

      expect(screen.getByRole('button', { name: 'Move' })).toHaveAttribute('data-variant', 'primary');
    });
  });

  describe('consumer handlers', () => {
    it('calls the consumer onPointerEnter once and still shows hover', () => {
      const onPointerEnter = jest.fn();
      render(<PixelButton onPointerEnter={onPointerEnter}>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.pointerEnter(button);

      expect(onPointerEnter).toHaveBeenCalledTimes(1);
      expect(button).toHaveAttribute('data-visual', 'hover');
    });

    it('calls the consumer onPointerLeave and still returns to regular', () => {
      const onPointerLeave = jest.fn();
      render(<PixelButton onPointerLeave={onPointerLeave}>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.pointerEnter(button);
      fireEvent.pointerLeave(button);

      expect(onPointerLeave).toHaveBeenCalledTimes(1);
      expect(button).toHaveAttribute('data-visual', 'regular');
    });

    it('calls the consumer onBlur and still clears hover', () => {
      const onBlur = jest.fn();
      render(<PixelButton onBlur={onBlur}>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.pointerEnter(button);
      fireEvent.blur(button);

      expect(onBlur).toHaveBeenCalledTimes(1);
      expect(button).toHaveAttribute('data-visual', 'regular');
    });

    it('calls the consumer onKeyDown with the event and still shows pressed for Enter', () => {
      const onKeyDown = jest.fn();
      render(<PixelButton onKeyDown={onKeyDown}>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.keyDown(button, { key: 'Enter' });

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'Enter' }));
      expect(button).toHaveAttribute('data-visual', 'pressed');
    });

    it('passes onKeyUp through to the DOM button', () => {
      const onKeyUp = jest.fn();
      render(<PixelButton onKeyUp={onKeyUp}>Move</PixelButton>);

      fireEvent.keyUp(screen.getByRole('button', { name: 'Move' }), { key: 'Enter' });

      expect(onKeyUp).toHaveBeenCalledTimes(1);
      expect(onKeyUp).toHaveBeenCalledWith(expect.objectContaining({ key: 'Enter' }));
    });

    // React only suppresses mouse click and mouse down/up/enter on disabled elements; pointer, key and blur reach the consumer.
    it('still calls the consumer onPointerEnter on a disabled button, and the visual stays disabled', () => {
      const onPointerEnter = jest.fn();
      render(<PixelButton disabled onPointerEnter={onPointerEnter}>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.pointerEnter(button);

      expect(onPointerEnter).toHaveBeenCalledTimes(1);
      expect(button).toHaveAttribute('data-visual', 'disabled');
    });
  });

  describe('neutral variant', () => {
    it('shows the neutral visual on hover like the other variants', () => {
      render(<PixelButton variant="neutral">Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.pointerEnter(button);

      expect(button).toHaveAttribute('data-visual', 'hover');
    });

    it.each<[PixelButtonSize, string[]]>([
      ['default', ['Button_Disable_3Slides.png', 'Button_Hover_3Slides.png']],
      ['large', ['Button_Disable_9Slides.png', 'Button_Hover_9Slides.png']],
    ])('%s size draws only the hover plate and the disable plate', (size, expectedFiles) => {
      const { container } = render(<PixelButton variant="neutral" size={size}>Move</PixelButton>);

      expect(getDrawnSheetFiles(container)).toEqual([...expectedFiles].sort());
    });

    it('draws the blue round icon files for a neutral round icon button', () => {
      const { container } = render(<PixelButton variant="neutral" size="icon-round" aria-label="Close" />);

      expect(getDrawnSheetFiles(container)).toEqual([
        'SmallBlueRoundButton_Pressed.png',
        'SmallBlueRoundButton_Regular.png',
      ]);
    });

    it('is disabled and reports the disabled visual when disabled', () => {
      const onClick = jest.fn();
      render(<PixelButton variant="neutral" disabled onClick={onClick}>Move</PixelButton>);
      const button = screen.getByRole('button', { name: 'Move' });

      fireEvent.click(button);

      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('data-visual', 'disabled');
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
