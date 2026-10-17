import Script from 'next/script';

/**
 * Renders Google Funding Choices' consent script when NEXT_PUBLIC_FUNDING_CHOICES_SCRIPT_SRC is
 * set; renders nothing otherwise (no ads, no CMP, in local/dev/test unless the env var is set).
 * The exact URL is not hardcoded here: it is account-specific and comes from the publisher's
 * own Ad Manager/AdSense "Privacy & messaging" setup.
 */
export function FundingChoicesLoader(): JSX.Element | null {
  const scriptSrc = process.env.NEXT_PUBLIC_FUNDING_CHOICES_SCRIPT_SRC;
  if (!scriptSrc) return null;

  return <Script id="funding-choices" src={scriptSrc} strategy="afterInteractive" />;
}
