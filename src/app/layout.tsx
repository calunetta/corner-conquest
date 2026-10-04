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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
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
