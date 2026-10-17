'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Monster } from '@/lib/types';
import { MonsterIcons } from './IslandTile.monsters';
import { styles } from './IslandTile.styles';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imgProps } = props as { alt?: string };
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...(imgProps as Record<string, unknown>)} alt={alt} />;
  },
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

const makeMonster = (name: string): Monster => ({
  name: name as Monster['name'],
  level: 1,
  sprite: { idle: `/sprites/${name}_idle.gif`, attack: `/sprites/${name}_attack.gif`, death: '/sprites/death.gif' },
});

const slotOf = (name: string) => screen.getByAltText(name).closest(`.${styles.monsterStack.split(' ')[0]} > div`) as HTMLElement;

describe('MonsterIcons slots', () => {
  it('uses the full-height single slot for exactly one monster', () => {
    render(<MonsterIcons monsters={[makeMonster('Bear')]} background={null} />);
    expect(slotOf('Bear')).toHaveClass(...styles.monsterSlotSingle.split(' '));
  });

  it('uses the half-height slot for both monsters when there are two', () => {
    render(<MonsterIcons monsters={[makeMonster('Bear'), makeMonster('Wolf')]} background={null} />);
    for (const name of ['Bear', 'Wolf']) {
      const slot = slotOf(name);
      expect(slot).toHaveClass(...styles.monsterSlot.split(' '));
      expect(slot).not.toHaveClass(...styles.monsterSlotSingle.split(' '));
    }
  });
});
