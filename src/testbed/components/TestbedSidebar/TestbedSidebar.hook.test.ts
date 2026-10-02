import { renderHook } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import type { ComponentPreview } from '../../testbed.types';
import { useTestbedSidebar } from './TestbedSidebar.hook';

jest.mock('next/navigation');

jest.mock('../../registry', () => {
  const mPreviews: ComponentPreview[] = [
    {
      slug: 'foo',
      title: 'Foo Component',
      group: 'Test Group',
      states: [
        { name: 'Default', render: () => null },
        { name: 'Active', render: () => null },
      ],
    },
    {
      slug: 'bar',
      title: 'Bar Component',
      group: 'Another Group',
      states: [{ name: 'Default', render: () => null }],
    },
  ];
  return {
    previews: mPreviews,
  };
});

describe('useTestbedSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns grouped previews and current pathname', () => {
    jest.mocked(usePathname).mockReturnValue('/testbed/foo');

    const { result } = renderHook(() => useTestbedSidebar());

    expect(result.current.groups).toHaveLength(2);
    expect(result.current.groups.map((g) => g.name)).toEqual(['Another Group', 'Test Group']);
    expect(result.current.pathname).toBe('/testbed/foo');
  });

  it('groups previews correctly regardless of pathname', () => {
    jest.mocked(usePathname).mockReturnValue('/testbed');

    const { result } = renderHook(() => useTestbedSidebar());

    expect(result.current.groups).toMatchObject([
      {
        name: 'Another Group',
        previews: [{ slug: 'bar', title: 'Bar Component' }],
      },
      {
        name: 'Test Group',
        previews: [{ slug: 'foo', title: 'Foo Component' }],
      },
    ]);
    expect(result.current.pathname).toBe('/testbed');
  });

  it('updates pathname on rerender', () => {
    jest.mocked(usePathname).mockReturnValue('/testbed/foo');

    const { result, rerender } = renderHook(() => useTestbedSidebar());

    expect(result.current.pathname).toBe('/testbed/foo');

    jest.mocked(usePathname).mockReturnValue('/testbed/bar');
    rerender();

    expect(result.current.pathname).toBe('/testbed/bar');
  });
});
