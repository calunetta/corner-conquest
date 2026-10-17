import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Terms of Service · Corner Conquest',
};

const headingClass = 'text-xl font-semibold';
const bodyClass = 'space-y-2 text-sm leading-relaxed text-muted-foreground';

export default function TermsOfServicePage(): JSX.Element {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/"
          className="inline-block rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to Corner Conquest
        </Link>
        <Card>
          <CardContent className="space-y-6 p-6">
            <h1 className="text-3xl font-bold">Terms of Service</h1>

            <p
              role="note"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-foreground"
            >
              DRAFT — pending lawyer review. This is not legal advice.
            </p>

            <section className="space-y-2">
              <h2 className={headingClass}>Acceptance of terms</h2>
              <div className={bodyClass}>
                <p>
                  By accessing or playing Corner Conquest you agree to these terms. If you do not
                  agree, do not use the service.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>The service</h2>
              <div className={bodyClass}>
                <p>
                  Corner Conquest is a free-to-play multiplayer strategy game. Features, including
                  non-personalized ads and an optional ad-free purchase, may be added later and will
                  be reflected here before launch.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Accounts</h2>
              <div className={bodyClass}>
                <p>
                  You sign in with Google through Firebase Authentication. You are responsible for
                  all activity under your account.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Minors</h2>
              <div className={bodyClass}>
                <p>
                  Players may be under 16. Players should have a parent or guardian&rsquo;s
                  permission to use the service.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Acceptable use</h2>
              <div className={bodyClass}>
                <p>
                  Do not cheat, abuse other players, or disrupt other players&rsquo; matches.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Disclaimer of warranties</h2>
              <div className={bodyClass}>
                <p>
                  The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;,
                  without warranties of any kind. We do not guarantee uptime or uninterrupted
                  access.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Limitation of liability</h2>
              <div className={bodyClass}>
                <p>
                  To the extent permitted by law, the operator is not liable for indirect,
                  incidental or consequential damages arising from your use of the service.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Changes to these terms</h2>
              <div className={bodyClass}>
                <p>
                  We may update these terms. Continued use of the service after a change means you
                  accept the updated terms.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Governing law</h2>
              <div className={bodyClass}>
                <p className="break-words font-medium text-foreground">
                  [Governing law / jurisdiction placeholder]
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Contact</h2>
              <div className={bodyClass}>
                <p className="break-words font-medium text-foreground">
                  [Contact email placeholder]
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
