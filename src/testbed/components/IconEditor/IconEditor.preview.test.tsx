import { fireEvent, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { iconEditorPreview } from './IconEditor.preview';
import { listIconUploads, saveIconOverrides, uploadIconImage } from './IconEditor.service';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

jest.mock('./IconEditor.service', () => ({
  listIconUploads: jest.fn(),
  saveIconOverrides: jest.fn(),
  uploadIconImage: jest.fn(),
}));

// Radix Slider measures its thumb with ResizeObserver, which jsdom does not provide.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

// jsdom does not provide structuredClone, which the hook uses to copy the overrides config.
// The config is plain JSON, so a JSON round-trip is an exact stand-in here.
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
}

const UPLOADED_PATH = '/sprites/icon-overrides/swords-1700000000000.png';

describe('iconEditorPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listIconUploads as jest.Mock).mockResolvedValue([]);
    (saveIconOverrides as jest.Mock).mockResolvedValue(undefined);
    (uploadIconImage as jest.Mock).mockResolvedValue(UPLOADED_PATH);
  });

  it('sends the picked file to the upload route and shows the returned image', async () => {
    const { container } = render(<>{iconEditorPreview.states[0].render()}</>);
    const file = new File(['pixels'], 'my-sword.png', { type: 'image/png' });

    // The editor shows a loading state until the uploads list resolves.
    await waitFor(() => expect(container.querySelector('input[type="file"]')).toBeInTheDocument());
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });

    await waitFor(() => expect(uploadIconImage).toHaveBeenCalledWith(expect.any(String), file));
    await waitFor(() =>
      expect(container.querySelector(`img[src="${UPLOADED_PATH}"]`)).toBeInTheDocument(),
    );
  });
});
