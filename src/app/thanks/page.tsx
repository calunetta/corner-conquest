import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Thanks · Corner Conquest',
};

const PACK_URL = 'https://pixelfrog-assets.itch.io/tiny-swords';
const CREATOR_URL = 'https://pixelfrog-assets.itch.io';

const linkClass =
  'rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function ThanksPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/" className={`inline-block text-sm ${linkClass}`}>
          Back to Corner Conquest
        </Link>
        <Card>
          <CardContent className="space-y-6 p-6">
            <h1 className="text-3xl font-bold">Thanks</h1>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Tiny Swords by Pixel Frog</h2>
              <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                <p>
                  Corner Conquest&apos;s look comes from the Tiny Swords asset pack, made by{' '}
                  <a href={CREATOR_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Pixel Frog
                  </a>
                  . The pack offers units, buildings, resources, terrain tiles, decorations and UI
                  elements in a charming pixel-art style, and it made this game possible.
                </p>
                <p>
                  Thank you, Pixel Frog, for sharing it so generously. If you like the art, visit{' '}
                  <a href={PACK_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Tiny Swords on itch.io
                  </a>{' '}
                  and support the creator.
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
