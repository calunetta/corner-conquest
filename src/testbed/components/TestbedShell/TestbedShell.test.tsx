import { render, screen } from '@testing-library/react';
import { TestbedShell } from './TestbedShell';

jest.mock('next/navigation', () => ({
  usePathname: () => '/testbed',
}));

describe('TestbedShell', () => {
  it('renders exactly one main element', () => {
    render(
      <TestbedShell>
        <div data-testid="child" />
      </TestbedShell>
    );

    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
  });

  it('renders exactly one nav element outside main', () => {
    render(
      <TestbedShell>
        <div data-testid="child" />
      </TestbedShell>
    );

    const navs = screen.getAllByRole('navigation', { name: 'Components' });
    expect(navs).toHaveLength(1);

    const nav = navs[0];
    const main = screen.getByRole('main');

    // Verify nav is outside main (nav and main are siblings)
    expect(nav.parentElement).toBe(main.parentElement);
    expect(nav.nextElementSibling).toBe(main);
  });

  it('renders children inside main', () => {
    render(
      <TestbedShell>
        <div data-testid="child" />
      </TestbedShell>
    );

    const main = screen.getByRole('main');
    const child = screen.getByTestId('child');

    expect(main).toContainElement(child);
  });

  it('renders sidebar before main in document order', () => {
    const { container } = render(
      <TestbedShell>
        <div data-testid="child" />
      </TestbedShell>
    );

    const nav = screen.getByRole('navigation', { name: 'Components' });
    const main = screen.getByRole('main');

    // Get the text content positions to verify order
    const navIndex = Array.from(container.querySelectorAll('nav, main')).indexOf(nav);
    const mainIndex = Array.from(container.querySelectorAll('nav, main')).indexOf(main);

    expect(navIndex).toBeLessThan(mainIndex);
  });

  it('passes children to main correctly', () => {
    render(
      <TestbedShell>
        <div data-testid="child-one" />
        <div data-testid="child-two" />
      </TestbedShell>
    );

    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByTestId('child-one'));
    expect(main).toContainElement(screen.getByTestId('child-two'));
  });
});
