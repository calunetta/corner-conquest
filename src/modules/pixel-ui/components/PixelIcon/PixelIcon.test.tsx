import { render, screen } from '@testing-library/react';
import { PixelIcon } from './PixelIcon';
import type { PixelIconName } from './PixelIcon.types';

describe('PixelIcon', () => {
  it('is hidden from assistive technology when no label is given', () => {
    const { container } = render(<PixelIcon name="gold" />);

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('is exposed as a named image when a label is given', () => {
    render(<PixelIcon name="gold" label="Gold" />);

    expect(screen.getByRole('img', { name: 'Gold' })).toBeInTheDocument();
  });

  it('is not hidden from assistive technology when a label is given', () => {
    const { container } = render(<PixelIcon name="gold" label="Gold" />);

    expect(container.firstChild).not.toHaveAttribute('aria-hidden');
  });

  it('draws the large icon at 64 px by default', () => {
    const { container } = render(<PixelIcon name="gold" />);

    expect(container.firstChild).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('draws the large icon at 64 px when size is lg', () => {
    const { container } = render(<PixelIcon name="gold" size="lg" />);

    expect(container.firstChild).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('draws the small icon at 32 px when size is sm', () => {
    const { container } = render(<PixelIcon name="gold" size="sm" />);

    expect(container.firstChild).toHaveStyle({ width: '32px', height: '32px' });
  });

  it('draws the colour sheet for a colour name', () => {
    const { container } = render(<PixelIcon name="food" label="Food" />);

    expect((container.firstChild as HTMLElement).style.backgroundImage).toContain('Icon_04.png');
  });

  it('draws the Pressed sheet for a grey icon in the pressed state', () => {
    const { container } = render(<PixelIcon name="grey-plus" state="pressed" label="Add" />);

    expect((container.firstChild as HTMLElement).style.backgroundImage).toContain('Pressed_08.png');
  });

  it('draws the Disable sheet for a grey icon in the disabled state', () => {
    const { container } = render(<PixelIcon name="grey-plus" state="disabled" label="Add" />);

    expect((container.firstChild as HTMLElement).style.backgroundImage).toContain('Disable_08.png');
  });

  it('draws the Regular sheet for a grey icon in the default state', () => {
    const { container } = render(<PixelIcon name="grey-plus" label="Add" />);

    expect((container.firstChild as HTMLElement).style.backgroundImage).toContain('Regular_08.png');
  });

  it('renders nothing for a name it does not know', () => {
    const { container } = render(<PixelIcon name={'unknown' as PixelIconName} label="?" />);

    expect(container.firstChild).toBeNull();
  });

  it('passes className to the icon element', () => {
    const { container } = render(<PixelIcon name="gold" className="test-extra-class" />);

    expect(container.firstChild).toHaveClass('test-extra-class');
  });
});
