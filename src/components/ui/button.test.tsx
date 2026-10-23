import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button, buttonVariants } from './button';
import type { ButtonSize, ButtonVariant } from './button';

const PNG_FILE_NAME = /([^/]+\.png)/;

/** Sorted, de-duplicated sprite sheet file names drawn under `container` (art layers only). */
function getDrawnSheetFiles(container: HTMLElement): string[] {
  const images = Array.from(container.querySelectorAll<HTMLElement>('*'))
    .map((element) => element.style.backgroundImage)
    .filter((image) => image !== '');
  const files = images.map((image) => PNG_FILE_NAME.exec(image)?.[1] ?? image);
  return [...new Set(files)].sort();
}

function isSpriteButton(button: HTMLElement): boolean {
  return button.hasAttribute('data-variant');
}

describe('Button', () => {
  describe('sprite tier (default and lg sizes on primary-like variants)', () => {
    it.each<[ButtonVariant, string]>([
      ['default', 'primary'],
      ['destructive', 'danger'],
      ['outline', 'neutral'],
      ['secondary', 'neutral'],
    ])('variant "%s" renders the PixelButton art with data-variant "%s"', (variant, pixelVariant) => {
      render(<Button variant={variant}>Confirm</Button>);

      const button = screen.getByRole('button', { name: 'Confirm' });
      expect(button).toHaveAttribute('data-variant', pixelVariant);
      expect(button).toHaveAttribute('data-visual', 'regular');
    });

    it('default size draws the 3-slice blue sheet for the primary variant', () => {
      const { container } = render(<Button>Confirm</Button>);

      expect(getDrawnSheetFiles(container)).toContain('Button_Blue_3Slides.png');
    });

    it('lg size draws the same art as default (only the width differs, and width is not checked in jsdom)', () => {
      const { container: defaultContainer } = render(<Button>Confirm</Button>);
      const defaultFiles = getDrawnSheetFiles(defaultContainer);
      const { container: lgContainer } = render(<Button size="lg">Confirm</Button>);

      expect(getDrawnSheetFiles(lgContainer)).toEqual(defaultFiles);
      expect(lgContainer.querySelector('button')).toHaveAttribute('data-variant', 'primary');
    });

    it('destructive draws the red sheet and no blue sheet', () => {
      const { container } = render(<Button variant="destructive">Leave</Button>);

      const files = getDrawnSheetFiles(container);
      expect(files).toContain('Button_Red_3Slides.png');
      expect(files.some((file) => file.includes('Blue'))).toBe(false);
    });

    it.each<ButtonVariant>(['outline', 'secondary'])(
      'neutral variant "%s" draws the neutral hover plate and no blue or red sheet',
      (variant) => {
        const { container } = render(<Button variant={variant}>Cancel</Button>);

        const files = getDrawnSheetFiles(container);
        expect(files).toContain('Button_Hover_3Slides.png');
        expect(files.some((file) => file.includes('Blue') || file.includes('Red'))).toBe(false);
      },
    );

    it('renders a native button with type="button" by default', () => {
      render(<Button>Confirm</Button>);

      expect(screen.getByRole('button', { name: 'Confirm' })).toHaveAttribute('type', 'button');
    });

    it('passes an explicit type through', () => {
      render(<Button type="submit">Save</Button>);

      expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
    });

    // KNOWN LIMIT: jsdom does not load Tailwind CSS, so the SPRITE_LOCK classes that
    // neutralise caller colour, border and height cannot be checked by computed style.
    // This is the one unavoidable class assertion in this file.
    it('keeps caller layout classes and applies the sprite lock class', () => {
      render(<Button className="w-full bg-red-500">Confirm</Button>);

      const button = screen.getByRole('button', { name: 'Confirm' });
      expect(button).toHaveClass('w-full');
      expect(button).toHaveClass('!h-16');
    });
  });

  describe('plain tier (ghost, link, sm, icon, plate)', () => {
    it.each<[ButtonVariant, ButtonSize]>([
      ['ghost', 'default'],
      ['link', 'default'],
      ['default', 'sm'],
      ['default', 'icon'],
      ['default', 'plate'],
      ['destructive', 'sm'],
      ['ghost', 'lg'],
    ])('variant "%s" size "%s" renders a plain button with no sprite art', (variant, size) => {
      const { container } = render(
        <Button variant={variant} size={size} aria-label="Action">
          Label
        </Button>,
      );

      const button = screen.getByRole('button', { name: 'Action' });
      expect(button.tagName).toBe('BUTTON');
      expect(isSpriteButton(button)).toBe(false);
      expect(getDrawnSheetFiles(container)).toEqual([]);
    });

    it('renders the label as plain text', () => {
      render(<Button variant="ghost">Settings</Button>);

      expect(screen.getByRole('button', { name: 'Settings' })).toHaveTextContent('Settings');
    });

    it('keeps caller layout classes on the plain button', () => {
      render(
        <Button variant="ghost" className="w-full">
          Settings
        </Button>,
      );

      expect(screen.getByRole('button', { name: 'Settings' })).toHaveClass('w-full');
    });
  });

  describe('asChild', () => {
    it('renders the child element instead of a button', () => {
      render(
        <Button asChild>
          <a href="#settings">Open</a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: 'Open' });
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '#settings');
    });

    it('draws no sprite art even for a sprite-size variant', () => {
      const { container } = render(
        <Button asChild variant="destructive" size="lg">
          <a href="#leave">Leave</a>
        </Button>,
      );

      expect(screen.getByRole('link', { name: 'Leave' })).not.toHaveAttribute('data-variant');
      expect(getDrawnSheetFiles(container)).toEqual([]);
    });

    it('forwards the ref to the child element', () => {
      const ref = createRef<HTMLButtonElement>();
      render(
        <Button asChild ref={ref}>
          <a href="#open">Open</a>
        </Button>,
      );

      expect(ref.current).toBe(screen.getByRole('link', { name: 'Open' }));
    });

    it('calls the child onClick through the Slot', () => {
      const onChildClick = jest.fn();
      render(
        <Button asChild>
          <a href="#open" onClick={onChildClick}>
            Open
          </a>
        </Button>,
      );

      fireEvent.click(screen.getByRole('link', { name: 'Open' }));

      expect(onChildClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('ref and displayName', () => {
    it('forwards the ref to the button element in the sprite tier', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Confirm</Button>);

      expect(ref.current).toBe(screen.getByRole('button', { name: 'Confirm' }));
    });

    it('forwards the ref to the button element in the plain tier', () => {
      const ref = createRef<HTMLButtonElement>();
      render(
        <Button ref={ref} variant="ghost">
          Settings
        </Button>,
      );

      expect(ref.current).toBe(screen.getByRole('button', { name: 'Settings' }));
    });

    it('has the displayName "Button"', () => {
      expect(Button.displayName).toBe('Button');
    });
  });

  describe('click and disabled behaviour', () => {
    it('calls onClick once when an enabled sprite button is clicked', () => {
      const onClick = jest.fn();
      render(<Button onClick={onClick}>Confirm</Button>);

      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick once when an enabled plain button is clicked', () => {
      const onClick = jest.fn();
      render(
        <Button variant="ghost" onClick={onClick}>
          Settings
        </Button>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick on a disabled sprite button', () => {
      const onClick = jest.fn();
      render(
        <Button disabled onClick={onClick}>
          Confirm
        </Button>,
      );

      const button = screen.getByRole('button', { name: 'Confirm' });
      expect(button).toBeDisabled();
      fireEvent.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not call onClick on a disabled plain button', () => {
      const onClick = jest.fn();
      render(
        <Button variant="ghost" disabled onClick={onClick}>
          Settings
        </Button>,
      );

      const button = screen.getByRole('button', { name: 'Settings' });
      expect(button).toBeDisabled();
      fireEvent.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('buttonVariants', () => {
    it('is still exported and returns a class string', () => {
      const classes = buttonVariants({ variant: 'ghost', size: 'sm' });

      expect(typeof classes).toBe('string');
      expect(classes.length).toBeGreaterThan(0);
    });

    it('appends the caller className to the returned string', () => {
      expect(buttonVariants({ className: 'caller-extra' })).toContain('caller-extra');
    });
  });
});
