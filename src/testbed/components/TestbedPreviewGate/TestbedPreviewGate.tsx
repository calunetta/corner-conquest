'use client';

import { DevToolsLocked } from '../DevToolsLocked';
import { PreviewStage } from '../PreviewStage';
import { findPreview } from '../../registry';
import { isPreviewVisible } from '../../testbed.config';

interface TestbedPreviewGateProps {
  slug: string;
  stateName?: string;
  /** Whether this browser has entered the dev tools password. Read on the server. */
  isUnlocked: boolean;
  /** Whether the server has a dev tools password set. */
  isConfigured: boolean;
}

/**
 * Decides what a /testbed/<slug> visit shows. Runs in the browser because the preview registry
 * imports client-only modules, which a server component cannot load.
 */
export function TestbedPreviewGate({ slug, stateName, isUnlocked, isConfigured }: TestbedPreviewGateProps) {
  const preview = findPreview(slug);

  if (!isPreviewVisible(preview)) {
    return <p role="status">This preview is not available.</p>;
  }

  if (preview?.devTool && !isUnlocked) {
    return <DevToolsLocked isConfigured={isConfigured} />;
  }

  return <PreviewStage slug={slug} stateName={stateName} />;
}
