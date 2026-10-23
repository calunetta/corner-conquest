import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Checkbox } from './checkbox';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import { Slider } from './slider';
import { Switch } from './switch';

beforeAll(() => {
  // Radix Slider measures its thumb with ResizeObserver, which jsdom does not provide.
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof window.ResizeObserver;
  }
});

describe('Switch', () => {
  it('renders a switch role that reflects the checked state in aria-checked', () => {
    render(<Switch aria-label="Sound" />);

    expect(screen.getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles on click and reports each new value through onCheckedChange', () => {
    const onCheckedChange = jest.fn();
    render(<Switch aria-label="Sound" onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch', { name: 'Sound' });

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
    expect(onCheckedChange).toHaveBeenCalledTimes(2);
  });

  it('renders a native button element, which browsers activate with Space', () => {
    // KNOWN LIMIT: jsdom does not turn a keydown of Space into a click, so the Space path itself
    // is not exercised here; this asserts the element that provides it.
    render(<Switch aria-label="Sound" />);

    expect(screen.getByRole('switch', { name: 'Sound' }).tagName).toBe('BUTTON');
  });

  it('ignores clicks while disabled', () => {
    const onCheckedChange = jest.fn();
    render(<Switch aria-label="Sound" disabled onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch', { name: 'Sound' });

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('forwards the ref to the button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Switch aria-label="Sound" ref={ref} />);

    expect(ref.current).toBe(screen.getByRole('switch', { name: 'Sound' }));
  });
});

describe('Checkbox', () => {
  it('renders a checkbox role with aria-checked false by default', () => {
    render(<Checkbox aria-label="Auto end turn" />);

    expect(screen.getByRole('checkbox', { name: 'Auto end turn' })).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles on click and reports each new value through onCheckedChange', () => {
    const onCheckedChange = jest.fn();
    render(<Checkbox aria-label="Auto end turn" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'Auto end turn' });

    fireEvent.click(box);

    expect(box).toHaveAttribute('aria-checked', 'true');
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(box);

    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it('renders a native button element, which browsers activate with Space', () => {
    // KNOWN LIMIT: as with Switch, jsdom does not synthesize the click that Space produces.
    render(<Checkbox aria-label="Auto end turn" />);

    expect(screen.getByRole('checkbox', { name: 'Auto end turn' }).tagName).toBe('BUTTON');
  });

  it('reports aria-checked="mixed" for the indeterminate state and turns it on when clicked', () => {
    const onCheckedChange = jest.fn();
    render(<Checkbox aria-label="Some items" checked="indeterminate" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'Some items' });

    expect(box).toHaveAttribute('aria-checked', 'mixed');

    fireEvent.click(box);

    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
  });

  it('ignores clicks while disabled', () => {
    const onCheckedChange = jest.fn();
    render(<Checkbox aria-label="Auto end turn" disabled onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'Auto end turn' });

    fireEvent.click(box);

    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe('RadioGroup', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  function renderSpeedGroup(props: { onValueChange?: (value: string) => void; disabledItem?: string } = {}) {
    return render(
      <RadioGroup aria-label="Speed" defaultValue="normal" onValueChange={props.onValueChange}>
        <RadioGroupItem value="slow" aria-label="Slow" />
        <RadioGroupItem value="normal" aria-label="Normal" />
        <RadioGroupItem value="fast" aria-label="Fast" disabled={props.disabledItem === 'fast'} />
      </RadioGroup>,
    );
  }

  it('exposes a radiogroup with one radio per item and marks the default value checked', () => {
    renderSpeedGroup();

    expect(screen.getByRole('radiogroup', { name: 'Speed' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Normal' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Slow' })).toHaveAttribute('aria-checked', 'false');
  });

  it('selects an item on click and reports the value through onValueChange', () => {
    const onValueChange = jest.fn();
    renderSpeedGroup({ onValueChange });

    fireEvent.click(screen.getByRole('radio', { name: 'Fast' }));

    expect(screen.getByRole('radio', { name: 'Fast' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Normal' })).toHaveAttribute('aria-checked', 'false');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('fast');
  });

  it('moves the selection with ArrowDown and ArrowUp', () => {
    jest.useFakeTimers();
    const onValueChange = jest.fn();
    renderSpeedGroup({ onValueChange });
    const normal = screen.getByRole('radio', { name: 'Normal' });

    act(() => normal.focus());
    fireEvent.keyDown(normal, { key: 'ArrowDown' });
    // Radix moves focus in a setTimeout; focusing the next radio is what selects it.
    act(() => jest.runOnlyPendingTimers());

    expect(screen.getByRole('radio', { name: 'Fast' })).toHaveAttribute('aria-checked', 'true');
    expect(onValueChange).toHaveBeenLastCalledWith('fast');

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Fast' }), { key: 'ArrowUp' });
    act(() => jest.runOnlyPendingTimers());

    expect(screen.getByRole('radio', { name: 'Normal' })).toHaveAttribute('aria-checked', 'true');
    expect(onValueChange).toHaveBeenLastCalledWith('normal');
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });

  it('does not select a disabled item with a click or with arrow navigation', () => {
    jest.useFakeTimers();
    const onValueChange = jest.fn();
    renderSpeedGroup({ onValueChange, disabledItem: 'fast' });
    const fast = screen.getByRole('radio', { name: 'Fast' });

    fireEvent.click(fast);

    expect(fast).toHaveAttribute('aria-checked', 'false');
    expect(onValueChange).not.toHaveBeenCalled();

    const normal = screen.getByRole('radio', { name: 'Normal' });
    act(() => normal.focus());
    fireEvent.keyDown(normal, { key: 'ArrowDown' });
    act(() => jest.runOnlyPendingTimers());

    // The group loops, so ArrowDown from the last enabled item wraps to the first and skips the disabled one.
    expect(fast).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Slow' })).toHaveAttribute('aria-checked', 'true');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('slow');
  });
});

describe('Slider', () => {
  function renderVolume(props: { onValueChange?: (value: number[]) => void; disabled?: boolean } = {}) {
    return render(
      <Slider
        aria-label="Volume"
        defaultValue={[50]}
        min={0}
        max={100}
        step={10}
        disabled={props.disabled}
        onValueChange={props.onValueChange}
      />,
    );
  }

  it('renders a slider role with aria-valuenow, aria-valuemin and aria-valuemax', () => {
    renderVolume();
    const thumb = screen.getByRole('slider');

    expect(thumb).toHaveAttribute('aria-valuenow', '50');
    expect(thumb).toHaveAttribute('aria-valuemin', '0');
    expect(thumb).toHaveAttribute('aria-valuemax', '100');
  });

  it('steps by the step size with ArrowRight and ArrowLeft and reports each value', () => {
    const onValueChange = jest.fn();
    renderVolume({ onValueChange });
    const thumb = screen.getByRole('slider');

    fireEvent.keyDown(thumb, { key: 'ArrowRight' });

    expect(thumb).toHaveAttribute('aria-valuenow', '60');
    expect(onValueChange).toHaveBeenLastCalledWith([60]);

    fireEvent.keyDown(thumb, { key: 'ArrowLeft' });

    expect(thumb).toHaveAttribute('aria-valuenow', '50');
    expect(onValueChange).toHaveBeenLastCalledWith([50]);
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });

  it('does not give the slider role element an accessible name from aria-label on the root', () => {
    // KNOWN BUG: Radix puts aria-label on the root span (no role), so the role="slider" thumb
    // is unnamed and screen readers announce "slider" with no label. Fix: pass the label to the
    // thumb (for example through a Slider wrapper prop). This assertion changes when that is fixed.
    renderVolume();

    expect(screen.queryByRole('slider', { name: 'Volume' })).not.toBeInTheDocument();
    expect(screen.getByRole('slider')).not.toHaveAttribute('aria-label');
  });

  it('jumps to the minimum with Home and to the maximum with End', () => {
    renderVolume();
    const thumb = screen.getByRole('slider');

    fireEvent.keyDown(thumb, { key: 'Home' });

    expect(thumb).toHaveAttribute('aria-valuenow', '0');

    fireEvent.keyDown(thumb, { key: 'End' });

    expect(thumb).toHaveAttribute('aria-valuenow', '100');
  });

  it('ignores keyboard input while disabled', () => {
    const onValueChange = jest.fn();
    renderVolume({ onValueChange, disabled: true });
    const thumb = screen.getByRole('slider');

    fireEvent.keyDown(thumb, { key: 'ArrowRight' });

    expect(thumb).toHaveAttribute('aria-valuenow', '50');
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('Separator', () => {
  it('is exposed as a separator without aria-orientation when horizontal, the ARIA default', () => {
    render(<Separator orientation="horizontal" decorative={false} />);

    const separator = screen.getByRole('separator');
    expect(separator).not.toHaveAttribute('aria-orientation');
  });

  it('marks a vertical separator with aria-orientation="vertical"', () => {
    render(<Separator orientation="vertical" decorative={false} />);

    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('is hidden from assistive tech when decorative, so it has no separator role', () => {
    render(<Separator orientation="vertical" data-testid="rule" />);

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    expect(screen.getByTestId('rule')).toHaveAttribute('role', 'none');
  });
});

describe('ScrollArea', () => {
  it('renders its children inside the scroll viewport', () => {
    const { container } = render(
      <ScrollArea>
        <p>Turn log entry</p>
      </ScrollArea>,
    );

    const viewport = container.querySelector('[data-radix-scroll-area-viewport]');
    expect(viewport).not.toBeNull();
    expect(viewport).toContainElement(screen.getByText('Turn log entry'));
  });
});

describe('Avatar', () => {
  it('shows the fallback text when no image is available', () => {
    render(
      <Avatar>
        <AvatarFallback>CL</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByText('CL')).toBeInTheDocument();
  });

  it('keeps the fallback while an image src is still loading and does not crash in jsdom', () => {
    // jsdom never finishes loading images, so the image stays in the "loading" state and the
    // fallback remains the visible content.
    render(
      <Avatar>
        <AvatarImage src="/tiny-swords/avatar.png" alt="Player portrait" />
        <AvatarFallback>CL</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByText('CL')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Player portrait' })).not.toBeInTheDocument();
  });
});
