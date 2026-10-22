
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{ts,tsx}',
    './src/testbed/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'water-pattern': "url('/sprites/water.png')",
        'terrain': "url('/sprites/terrain.png')",
        'terrain-neutral': "url('/sprites/terrain-neutral.png')",
      },
      fontFamily: {
        body: ['var(--font-pixelify)', 'var(--font-outfit)', 'Outfit', 'sans-serif'],
        headline: ['var(--font-pixelify)', 'var(--font-outfit)', 'Outfit', 'sans-serif'],
        pixel: ['var(--font-pixelify)', 'var(--font-outfit)', 'Outfit', 'sans-serif'],
        readable: ['var(--font-outfit)', 'Outfit', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        ink: 'hsl(var(--ink))',
        paper: 'hsl(var(--paper))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'cloud-drift': {
          '0%': { transform: 'translateX(0)', opacity: '0' },
          '15%, 85%': { opacity: '1' },
          '100%': { transform: 'translateX(60px)', opacity: '0' },
        },
        'card-play': {
          '0%': { opacity: '0', transform: 'translateY(40px) scale(0.85)' },
          '27%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
            filter: 'drop-shadow(0 0 0 hsl(var(--primary) / 0))',
          },
          '50%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
            filter: 'drop-shadow(0 0 24px hsl(var(--primary) / 0.8))',
          },
          '73%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
            filter: 'drop-shadow(0 0 0 hsl(var(--primary) / 0))',
          },
          '100%': { opacity: '0', transform: 'translateY(-20px) scale(1.08)' },
        },
        'card-play-vignette': {
          '0%': { opacity: '0' },
          '27%': { opacity: '1' },
          '73%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'card-play-fade': {
          '0%': { opacity: '0' },
          '15%': { opacity: '1' },
          '85%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'gradient-shift': 'gradient-shift 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'cloud-drift': 'cloud-drift linear forwards',
        'card-play': 'card-play 1100ms ease-out forwards',
        'card-play-vignette': 'card-play-vignette 1100ms linear forwards',
        'card-play-fade': 'card-play-fade 1000ms linear forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
