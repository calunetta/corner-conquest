import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Privacy Policy · Corner Conquest',
};

const headingClass = 'text-xl font-semibold';
const bodyClass = 'space-y-2 text-sm leading-relaxed text-muted-foreground';

export default function PrivacyPolicyPage(): JSX.Element {
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
            <h1 className="text-3xl font-bold">Privacy Policy</h1>

            <p
              role="note"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-foreground"
            >
              DRAFT — pending lawyer review. This is not legal advice.
            </p>

            <section className="space-y-2">
              <h2 className={headingClass}>Who we are</h2>
              <div className={bodyClass}>
                <p>The operator of Corner Conquest is:</p>
                <p className="break-words font-medium text-foreground">
                  [Operator legal name and address placeholder]
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Data we collect</h2>
              <div className={bodyClass}>
                <p>
                  When you sign in with Google, Firebase Authentication gives us your account
                  identifier (uid) and your display name (displayName).
                </p>
                <p>
                  We store game state in Firestore: your in-game choices and your match history. We
                  do not collect payment data or precise location data in this phase.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Processors</h2>
              <div className={bodyClass}>
                <p>
                  We use Google and Firebase to run the service: Firebase Authentication,
                  Firestore, and Firebase Hosting or an equivalent hosting service. These providers
                  process your data on our behalf.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Advertising cookies and consent</h2>
              <div className={bodyClass}>
                <p>
                  Ads are not yet enabled. The feature is switched off by default. When ads are
                  enabled, ad cookies and any choice about personalized ads are governed by consent
                  you give through Google Funding Choices, a Consent Management Platform certified
                  under the IAB Transparency and Consent Framework (TCF). We do not use a custom
                  consent banner.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Minors</h2>
              <div className={bodyClass}>
                <p>
                  Players may be under 16. Players under 16 are never served personalized ads, in
                  line with child-directed ad settings.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Retention</h2>
              <div className={bodyClass}>
                <p>
                  We keep your data while your account is active. Deletion removes it (see
                  &ldquo;Your rights and deletion&rdquo; below).
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className={headingClass}>Your rights and deletion</h2>
              <div className={bodyClass}>
                <p className="break-words font-medium text-foreground">
                  [Deletion mechanism placeholder — see
                  docs/ai/tasks/2026-10-18-ads-consent-legal/roadmap.md Phase 0 for the planned
                  account-deletion feature]
                </p>
                <p>
                  Self-service account deletion is planned but is not available yet. Until it
                  ships, you can request deletion of your data using the contact below.
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
