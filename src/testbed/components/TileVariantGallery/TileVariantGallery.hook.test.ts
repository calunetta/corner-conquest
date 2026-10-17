import { act, renderHook, waitFor } from '@testing-library/react';
import { DEFAULT_TILE_VARIANTS_CONFIG } from '@/modules/map/components/TileVariants/TileVariants.config';
import { deleteVariant, loadConfig } from '../TileVariantEditor/TileVariantEditor.api';
import { useTileVariantGallery } from './TileVariantGallery.hook';

jest.mock('../TileVariantEditor/TileVariantEditor.api', () => ({
  loadConfig: jest.fn(),
  deleteVariant: jest.fn(),
}));

const loadConfigMock = loadConfig as jest.MockedFunction<typeof loadConfig>;
const deleteVariantMock = deleteVariant as jest.MockedFunction<typeof deleteVariant>;

const snapshot = { config: DEFAULT_TILE_VARIANTS_CONFIG, sha: 'sha-0' };
const deletable = DEFAULT_TILE_VARIANTS_CONFIG.variants.find((variant) => !variant.id.startsWith('default-'));
if (!deletable) throw new Error('the default config needs at least one non-default variant');

beforeEach(() => {
  loadConfigMock.mockReset().mockResolvedValue({ ok: true, value: snapshot });
  deleteVariantMock.mockReset();
});

describe('useTileVariantGallery', () => {
  it('loads the saved config and groups it', async () => {
    const { result } = renderHook(() => useTileVariantGallery());

    await waitFor(() => expect(result.current.config).not.toBeNull());

    expect(result.current.totalCount).toBe(DEFAULT_TILE_VARIANTS_CONFIG.variants.length);
    expect(result.current.groups.flatMap((group) => group.variants)).toHaveLength(result.current.totalCount);
  });

  it('shows the load error when the config cannot be read', async () => {
    loadConfigMock.mockResolvedValue({ ok: false, message: 'Dev tools login required.' });

    const { result } = renderHook(() => useTileVariantGallery());

    await waitFor(() => expect(result.current.loadError).toBe('Dev tools login required.'));
  });

  it('does not open the confirmation without a selection', async () => {
    const { result } = renderHook(() => useTileVariantGallery());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    act(() => result.current.openConfirm());

    expect(result.current.isConfirming).toBe(false);
  });

  it('deletes each selected variant with the sha from the last delete, then reports and reloads', async () => {
    deleteVariantMock.mockResolvedValue({ ok: true, value: { config: DEFAULT_TILE_VARIANTS_CONFIG, sha: 'sha-1', pullRequestUrl: null } });
    const { result } = renderHook(() => useTileVariantGallery());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    act(() => result.current.toggleVariant(deletable.id));
    act(() => result.current.openConfirm());
    expect(result.current.isConfirming).toBe(true);
    await act(() => result.current.confirmDelete());

    expect(deleteVariantMock).toHaveBeenCalledWith(deletable.id, 'sha-0');
    expect(result.current.notice).toBe('Deleted 1 of 1.');
    expect(result.current.failures).toEqual([]);
    expect(result.current.selectedCount).toBe(0);
    expect(loadConfigMock).toHaveBeenCalledTimes(2);
  });

  it('keeps a failed id selected and shows why it failed', async () => {
    deleteVariantMock.mockResolvedValue({ ok: false, message: 'No variant called "x".' });
    const { result } = renderHook(() => useTileVariantGallery());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    act(() => result.current.toggleVariant(deletable.id));
    await act(() => result.current.confirmDelete());

    expect(result.current.failures).toEqual([{ id: deletable.id, message: 'No variant called "x".' }]);
    expect([...result.current.selected]).toEqual([deletable.id]);
  });
});
