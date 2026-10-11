import { render } from '@testing-library/react';
import { GoogleIcon } from './GoogleIcon';

describe('GoogleIcon', () => {
  it('renders an svg element', () => {
    const { container } = render(<GoogleIcon />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('is hidden from assistive technology so the surrounding text carries the name', () => {
    const { container } = render(<GoogleIcon />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no accessible name of its own', () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector('svg');

    expect(svg).not.toHaveAttribute('role');
    expect(svg).not.toHaveAttribute('aria-label');
    expect(svg).not.toHaveAttribute('aria-labelledby');
    expect(container.querySelector('title')).toBeNull();
  });

  it('applies the className it is given to the svg', () => {
    const { container } = render(<GoogleIcon className="custom-icon-size" />);

    expect(container.querySelector('svg')).toHaveClass('custom-icon-size');
  });
});
