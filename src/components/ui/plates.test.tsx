import { createRef } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Badge, badgeVariants } from './badge';
import type { BadgeProps } from './badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { Progress } from './progress';
import { Textarea } from './textarea';
import type { PanelVariant } from '@/modules/pixel-ui';

const PNG_FILE_NAME = /([^/]+\.png)/;

/** Sprite sheet file names drawn by the art layer (`aria-hidden`) under `container`. */
function getDrawnSheetFiles(container: HTMLElement): string[] {
  const art = container.querySelector<HTMLElement>('[aria-hidden="true"]');
  if (!art) return [];
  const images = Array.from(art.querySelectorAll<HTMLElement>('*'))
    .map((cell) => cell.style.backgroundImage)
    .filter((image) => image !== '');
  return [...new Set(images.map((image) => PNG_FILE_NAME.exec(image)?.[1] ?? image))].sort();
}

describe('Card', () => {
  describe('default plate', () => {
    it('renders header, title, description, content and footer text', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Game settings</CardTitle>
            <CardDescription>Pick the island size</CardDescription>
          </CardHeader>
          <CardContent>Small island</CardContent>
          <CardFooter>Confirm</CardFooter>
        </Card>,
      );

      expect(screen.getByRole('heading', { name: 'Game settings' })).toBeInTheDocument();
      expect(screen.getByText('Pick the island size')).toBeInTheDocument();
      expect(screen.getByText('Small island')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('renders CardTitle as a heading and CardDescription as paragraph text', () => {
      render(
        <>
          <CardTitle>Players</CardTitle>
          <CardDescription>Up to four seats</CardDescription>
        </>,
      );

      expect(screen.getByRole('heading', { level: 3, name: 'Players' })).toBeInTheDocument();
      expect(screen.getByText('Up to four seats').tagName).toBe('P');
    });

    it('draws no sprite art (the flat plate is CSS only)', () => {
      const { container } = render(<Card>Plain</Card>);

      expect(getDrawnSheetFiles(container)).toEqual([]);
    });

    it('forwards the ref to the plain plate element', () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Card ref={ref} data-testid="plate">
          Body
        </Card>,
      );

      expect(ref.current).toBe(screen.getByTestId('plate'));
    });

    it('passes className to the plain plate', () => {
      // Unavoidable class assertion: Card has no role or accessible name to query.
      render(
        <Card className="custom-plate" data-testid="plate">
          Body
        </Card>,
      );

      expect(screen.getByTestId('plate')).toHaveClass('custom-plate');
    });
  });

  describe('frame prop (sprite frame through PixelPanel)', () => {
    it.each<[PanelVariant, string]>([
      ['paper', 'RegularPaper.png'],
      ['special', 'SpecialPaper.png'],
      ['carved', 'Carved_9Slides.png'],
    ])('frame "%s" draws the %s art sheet', (frame, sheetFile) => {
      const { container } = render(<Card frame={frame}>Body</Card>);

      expect(getDrawnSheetFiles(container)).toContain(sheetFile);
    });

    it.each<PanelVariant>(['paper', 'special', 'carved'])(
      'frame "%s" still renders the children',
      (frame) => {
        render(
          <Card frame={frame} data-testid="framed">
            <p>Inside the frame</p>
          </Card>,
        );

        expect(within(screen.getByTestId('framed')).getByText('Inside the frame')).toBeVisible();
      },
    );

    it('passes className to the frame root', () => {
      // Unavoidable class assertion: PixelPanel sends className to the frame, not to a role-bearing element.
      render(
        <Card frame="paper" className="custom-frame" data-testid="framed">
          Body
        </Card>,
      );

      expect(screen.getByTestId('framed')).toHaveClass('custom-frame');
    });
  });
});

describe('Input', () => {
  it('renders a textbox', () => {
    render(<Input aria-label="Game name" />);

    expect(screen.getByRole('textbox', { name: 'Game name' })).toBeInTheDocument();
  });

  it('calls onChange with the typed value', () => {
    const onChange = jest.fn();
    render(<Input aria-label="Game name" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Game name' }), {
      target: { value: 'Atlantis' },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: 'Game name' })).toHaveValue('Atlantis');
  });

  it('is disabled when the disabled prop is set', () => {
    render(<Input aria-label="Game name" disabled />);

    expect(screen.getByRole('textbox', { name: 'Game name' })).toBeDisabled();
  });

  it('passes type through (password inputs have no textbox role)', () => {
    render(<Input aria-label="Password" type="password" />);

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('passes type through to a textbox-role input', () => {
    render(<Input aria-label="Contact" type="email" />);

    expect(screen.getByRole('textbox', { name: 'Contact' })).toHaveAttribute('type', 'email');
  });

  it('shows the placeholder', () => {
    render(<Input aria-label="Game name" placeholder="My island" />);

    expect(screen.getByPlaceholderText('My island')).toBe(screen.getByRole('textbox', { name: 'Game name' }));
  });

  it('passes aria-invalid through and keeps the error message associated', () => {
    render(
      <>
        <Input aria-label="Game name" aria-invalid="true" aria-describedby="name-error" />
        <p id="name-error">Name is required</p>
      </>,
    );

    const input = screen.getByRole('textbox', { name: 'Game name' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Name is required');
  });

  it('forwards the ref to the input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input aria-label="Game name" ref={ref} />);

    expect(ref.current).toBe(screen.getByRole('textbox', { name: 'Game name' }));
  });
});

describe('Textarea', () => {
  it('renders a textbox that is a textarea element', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea aria-label="Notes" ref={ref} />);

    expect(screen.getByRole('textbox', { name: 'Notes' })).toBe(ref.current);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('calls onChange with the typed value', () => {
    const onChange = jest.fn();
    render(<Textarea aria-label="Notes" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Notes' }), {
      target: { value: 'Build a harbour' },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('Build a harbour');
  });

  it('is disabled when the disabled prop is set', () => {
    render(<Textarea aria-label="Notes" disabled />);

    expect(screen.getByRole('textbox', { name: 'Notes' })).toBeDisabled();
  });

  it('shows the placeholder', () => {
    render(<Textarea aria-label="Notes" placeholder="Describe the island" />);

    expect(screen.getByPlaceholderText('Describe the island')).toBe(
      screen.getByRole('textbox', { name: 'Notes' }),
    );
  });

  it('passes aria-invalid through', () => {
    render(<Textarea aria-label="Notes" aria-invalid="true" />);

    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('forwards the ref to the textarea element', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea aria-label="Notes" ref={ref} />);

    expect(ref.current).toBe(screen.getByRole('textbox', { name: 'Notes' }));
  });
});

describe('Label', () => {
  it('activates the input associated through htmlFor when the label is clicked', () => {
    // jsdom does not move focus on label activation (browsers do), so focus is checked in ui-verify.
    const onClick = jest.fn();
    render(
      <>
        <Label htmlFor="game-name">Game name</Label>
        <Input id="game-name" onClick={onClick} />
      </>,
    );

    fireEvent.click(screen.getByText('Game name'));

    expect(screen.getByLabelText('Game name')).toBe(screen.getByRole('textbox'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('gives the input its accessible name through htmlFor', () => {
    render(
      <>
        <Label htmlFor="game-name">Game name</Label>
        <Input id="game-name" />
      </>,
    );

    expect(screen.getByRole('textbox', { name: 'Game name' })).toBeInTheDocument();
  });
});

describe('Badge', () => {
  it.each<[NonNullable<BadgeProps['variant']>, string]>([
    ['default', 'Bot'],
    ['secondary', '3'],
    ['destructive', '00:12'],
    ['outline', 'Waiting'],
  ])('variant "%s" renders its text "%s"', (variant, text) => {
    render(<Badge variant={variant}>{text}</Badge>);

    expect(screen.getByText(text)).toBeVisible();
  });

  it('renders the default variant when no variant is given', () => {
    render(<Badge>Bot</Badge>);

    expect(screen.getByText('Bot')).toBeVisible();
  });

  it('passes className through to the badge', () => {
    // Unavoidable class assertion: Badge is a non-interactive div with no role or name.
    render(<Badge className="custom-chip">Bot</Badge>);

    expect(screen.getByText('Bot')).toHaveClass('custom-chip');
  });

  it('badgeVariants returns a class string, and no argument resolves to the default variant', () => {
    expect(typeof badgeVariants()).toBe('string');
    expect(badgeVariants()).toBe(badgeVariants({ variant: 'default' }));
  });

  it.each<NonNullable<BadgeProps['variant']>>(['secondary', 'destructive', 'outline'])(
    'badgeVariants gives "%s" a class string that differs from the default',
    (variant) => {
      // Class-string comparison only: the strings are the only output of badgeVariants.
      expect(badgeVariants({ variant })).not.toBe(badgeVariants());
    },
  );
});

describe('Progress', () => {
  function getIndicator(progressbar: HTMLElement): HTMLElement {
    // The indicator has no role; it is the only child of the progressbar root.
    const indicator = progressbar.firstElementChild;
    if (!(indicator instanceof HTMLElement)) throw new Error('progress indicator not found');
    return indicator;
  }

  it('renders a progressbar whose aria-valuenow is the value', () => {
    render(<Progress aria-label="Island progress" value={40} />);

    const progressbar = screen.getByRole('progressbar', { name: 'Island progress' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '40');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  // The component writes `-${100 - value}%`, so value 100 is written as "-0%" (same position as 0%).
  it.each<[number, string]>([
    [0, 'translateX(-100%)'],
    [50, 'translateX(-50%)'],
    [100, 'translateX(-0%)'],
  ])('value %i moves the indicator to %s', (value, transform) => {
    render(<Progress aria-label="Island progress" value={value} />);

    const indicator = getIndicator(screen.getByRole('progressbar', { name: 'Island progress' }));
    expect(indicator.style.transform).toBe(transform);
  });

  it('treats an omitted value as 0 (determinate, aria-valuenow 0, indicator at -100%)', () => {
    render(<Progress aria-label="Island progress" />);

    const progressbar = screen.getByRole('progressbar', { name: 'Island progress' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    expect(getIndicator(progressbar).style.transform).toBe('translateX(-100%)');
  });

  it('clamps a value above 100 to 100 in aria-valuenow and in the indicator', () => {
    render(<Progress aria-label="Island progress" value={150} />);

    const progressbar = screen.getByRole('progressbar', { name: 'Island progress' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    expect(getIndicator(progressbar).style.transform).toBe('translateX(-0%)');
  });

  it('clamps a value below 0 to 0 in aria-valuenow and in the indicator', () => {
    render(<Progress aria-label="Island progress" value={-20} />);

    const progressbar = screen.getByRole('progressbar', { name: 'Island progress' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    expect(getIndicator(progressbar).style.transform).toBe('translateX(-100%)');
  });
});
