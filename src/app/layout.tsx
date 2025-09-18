
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { PlayerProvider } from '@/hooks/use-player';

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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lilita+One&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <PlayerProvider>
          {children}
        </PlayerProvider>
        <Toaster />
      </body>
    </html>
  );
}
