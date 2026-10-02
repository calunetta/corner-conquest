import { PreviewStage } from '@/testbed/components/PreviewStage';

interface TestbedPreviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ state?: string | string[] }>;
}

export default async function TestbedPreviewPage({ params, searchParams }: TestbedPreviewPageProps) {
  const { slug } = await params;
  const { state } = await searchParams;

  return <PreviewStage slug={slug} stateName={typeof state === 'string' ? state : undefined} />;
}
