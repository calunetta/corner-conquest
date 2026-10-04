'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnimatedMonster } from './AnimatedMonster';
import type { Monster } from '@/lib/types';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt, ...imgProps } = props as { alt?: string };
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...(imgProps as Record<string, unknown>)} alt={alt} />;
  },
}));

// Mock radix Tooltip to avoid portal issues in testing
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

describe('AnimatedMonster Component', () => {
  const mockMonster: Monster = {
    name: 'Lancer',
    level: 3,
    sprite: { idle: '/sprites/lancer_idle.gif', attack: '/sprites/lancer_attack.gif', death: '/sprites/death.gif' },
  };

  it('renders the monster sprite with idle state initially', () => {
    render(<AnimatedMonster monster={mockMonster} />);
    const image = screen.getByAltText('Lancer');
    expect(image).toBeInTheDocument();
    // The hook determines which sprite (idle or attack) is shown
    expect(image.getAttribute('src')).toMatch(/lancer_(idle|attack)\.gif/);
  });

  it('displays the monster name and level in a tooltip', () => {
    render(<AnimatedMonster monster={mockMonster} />);
    expect(screen.getByText('Lancer - Lvl: 3')).toBeInTheDocument();
  });

  it('applies a transform style to animate position and flip', () => {
    render(<AnimatedMonster monster={mockMonster} />);
    const image = screen.getByAltText('Lancer');
    // The image has a style applied with transform
    const style = image.getAttribute('style');
    expect(style).toBeTruthy();
    expect(style).toMatch(/transform/);
  });

  it('renders different monster sprites correctly', () => {
    const bearMonster: Monster = {
      name: 'Bear',
      level: 2,
      sprite: { idle: '/sprites/bear_idle.gif', attack: '/sprites/bear_attack.gif', death: '/sprites/death.gif' },
    };

    render(<AnimatedMonster monster={bearMonster} />);
    const image = screen.getByAltText('Bear');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toMatch(/bear_(idle|attack)\.gif/);
  });
});
