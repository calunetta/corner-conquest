import { IconOverridesConflictError, listIconUploads, saveIconOverrides, uploadIconImage } from './IconEditor.service';

const mockFetch = jest.fn();

// jsdom has no Response global; the service only reads ok, status and json(), so a stub is enough.
function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

function emptyResponse(status: number): Response {
  return { ok: status >= 200 && status < 300, status } as unknown as Response;
}

describe('IconEditor.service', () => {
  beforeEach(() => {
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('listIconUploads', () => {
    it('GETs the uploads route and returns the images list', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ images: ['/sprites/icon-overrides/a-1.png'] }));

      await expect(listIconUploads()).resolves.toEqual(['/sprites/icon-overrides/a-1.png']);
      expect(mockFetch).toHaveBeenCalledWith('/api/icon-editor/uploads');
    });

    it('throws with the status code when the response is not ok', async () => {
      mockFetch.mockResolvedValue(emptyResponse(404));

      await expect(listIconUploads()).rejects.toThrow('Failed to list icon uploads: 404');
    });
  });

  describe('uploadIconImage', () => {
    it('POSTs multipart form data with iconId and file, and returns the stored path', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ path: '/sprites/icon-overrides/swords-1.png' }));
      const file = new File(['png'], 'sword.png', { type: 'image/png' });

      await expect(uploadIconImage('swords', file)).resolves.toBe('/sprites/icon-overrides/swords-1.png');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/icon-editor/uploads');
      expect(init.method).toBe('POST');
      const sent = init.body as FormData;
      expect(sent.get('iconId')).toBe('swords');
      expect((sent.get('file') as File).name).toBe('sword.png');
    });

    it('throws with the status code when the response is not ok', async () => {
      mockFetch.mockResolvedValue(emptyResponse(400));

      await expect(uploadIconImage('swords', new File(['x'], 'a.svg'))).rejects.toThrow(
        'Failed to upload icon image: 400',
      );
    });
  });

  describe('saveIconOverrides', () => {
    it('POSTs the overrides and the sha the editor loaded, and returns the new sha', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ ok: true, sha: 'next-sha' }));

      await expect(saveIconOverrides({ swords: { rotation: 90 } }, 'old-sha')).resolves.toEqual({ ok: true, sha: 'next-sha' });

      expect(mockFetch).toHaveBeenCalledWith('/api/icon-editor/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: { swords: { rotation: 90 } }, baseSha: 'old-sha' }),
      });
    });

    it('throws IconOverridesConflictError with the newer overrides on a 409', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ overrides: { swords: { rotation: 10 } }, sha: 'live-sha' }, 409));

      const error = await saveIconOverrides({}, 'stale').catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(IconOverridesConflictError);
      expect((error as IconOverridesConflictError).newer).toEqual({ overrides: { swords: { rotation: 10 } }, sha: 'live-sha' });
    });

    it('throws with the status code when the response is not ok', async () => {
      mockFetch.mockResolvedValue(emptyResponse(500));

      await expect(saveIconOverrides({}, 'sha')).rejects.toThrow('Failed to save icon overrides: 500');
    });
  });
});
