import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { PlayerProvider } from '@/modules/session';
import { TooltipProvider } from '@/components/ui/tooltip';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
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
    <html lang="en" className={`dark ${outfit.variable}`}>
      <body className={`${outfit.className} antialiased font-body`}>
        <PlayerProvider>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </PlayerProvider>
        <Toaster />
      </body>
    </html>
  );
}
