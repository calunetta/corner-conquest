import type { Metadata } from 'next';
import { Lato, MedievalSharp, Patrick_Hand } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { PlayerProvider } from '@/modules/session';
import { FundingChoicesLoader } from '@/modules/consent';
import { TooltipProvider } from '@/components/ui/tooltip';

// Readable text (logs, card body, inputs, digits): Patrick Hand, then Lato (latin + latin-ext).
const patrickHand = Patrick_Hand({
  subsets: ['latin'],
  variable: '--font-patrick',
  display: 'swap',
  weight: '400',
});

const lato = Lato({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-lato',
  display: 'swap',
  weight: ['400', '700'],
});

// Institutional text (game name, titles, ribbons, buttons).
const medievalSharp = MedievalSharp({
  subsets: ['latin'],
  variable: '--font-medieval',
  display: 'swap',
  weight: '400',
});

export const metadata: Metadata = {
  title: 'Corner Conquest',
  description: 'A game of strategy and conquest.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${patrickHand.variable} ${lato.variable} ${medievalSharp.variable}`}>
      <body className="antialiased font-body">
        <PlayerProvider>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </PlayerProvider>
        <FundingChoicesLoader />
        <Toaster />
      </body>
    </html>
  );
}
