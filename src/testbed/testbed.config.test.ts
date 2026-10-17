import type { ComponentPreview } from './testbed.types';
import { isPreviewVisible } from './testbed.config';

const preview = (devTool?: boolean): ComponentPreview => ({ slug: 'x', title: 'X', group: 'G', devTool, states: [] });

describe('isPreviewVisible', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, configurable: true });
  });

  function setNodeEnv(value: string) {
    Object.defineProperty(process.env, 'NODE_ENV', { value, configurable: true });
  }

  it('shows every preview in development', () => {
    setNodeEnv('development');

    expect(isPreviewVisible(preview())).toBe(true);
  });

  it('hides component previews in a production build', () => {
    setNodeEnv('production');

    expect(isPreviewVisible(preview())).toBe(false);
  });

  it('keeps dev tools visible in a production build', () => {
    setNodeEnv('production');

    expect(isPreviewVisible(preview(true))).toBe(true);
  });

  it('hides an unknown slug in production', () => {
    setNodeEnv('production');

    expect(isPreviewVisible(undefined)).toBe(false);
  });
});
