import { cookies } from 'next/headers';
import { configuredDevToolsPassword, DEV_TOOLS_COOKIE, isDevToolsSessionValue } from '@/lib/dev-tools/session';
import { TestbedPreviewGate } from '@/testbed/components/TestbedPreviewGate';

interface TestbedPreviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ state?: string | string[] }>;
}

export default async function TestbedPreviewPage({ params, searchParams }: TestbedPreviewPageProps) {
  const { slug } = await params;
  const { state } = await searchParams;
  const session = (await cookies()).get(DEV_TOOLS_COOKIE)?.value;

  return (
    <TestbedPreviewGate
      slug={slug}
      stateName={typeof state === 'string' ? state : undefined}
      isUnlocked={isDevToolsSessionValue(session)}
      isConfigured={configuredDevToolsPassword() !== null}
    />
  );
}
