import { renderHook } from '@testing-library/react';
import { useMapGrid } from './MapGrid.hook';
import { useGameBoard } from '@/modules/game-board';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useMapPanZoom, DEFAULT_DESKTOP_ZOOM } from './MapGrid.pan-zoom.hook';
import type { GameBoardContextType } from '@/modules/game-board';
import type { UseMapPanZoomResult } from './MapGrid.pan-zoom.hook';
import { IslandType, type Island } from '@/lib/types';
import { buildGameState } from '../../board-context.fixtures';

jest.mock('@/modules/game-board', () => ({
  useGameBoard: jest.fn(),
}));

jest.mock('@/hooks/use-is-mobile', () => ({
  useIsMobile: jest.fn(),
}));

jest.mock('./MapGrid.pan-zoom.hook', () => ({
  useMapPanZoom: jest.fn(),
  DEFAULT_DESKTOP_ZOOM: 0.85,
}));

describe('useMapGrid', () => {
  const mockPanZoomState: UseMapPanZoomResult = {
    zoom: 0.85,
    pan: { x: 0, y: 0 },
    defaultZoom: 0.85,
    isDragging: false,
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    resetZoom: jest.fn(),
    handlers: {
      onMouseDown: jest.fn(),
      onMouseMove: jest.fn(),
      onMouseUp: jest.fn(),
      onMouseLeave: jest.fn(),
      onWheel: jest.fn(),
      onTouchStart: jest.fn(),
      onTouchMove: jest.fn(),
      onTouchEnd: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.mocked(useIsMobile).mockReturnValue(false);
    jest.mocked(useMapPanZoom).mockReturnValue(mockPanZoomState);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when gameState.map is empty', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: [] }),
    } as GameBoardContextType);

    const { result } = renderHook(() => useMapGrid());

    expect(result.current).toBeNull();
  });

  it('returns null when gameState.map is null', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: null as unknown as Island[] }),
    } as GameBoardContextType);

    const { result } = renderHook(() => useMapGrid());

    expect(result.current).toBeNull();
  });

  it('returns view model for non-empty map', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: [island] }),
    } as GameBoardContextType);

    const { result } = renderHook(() => useMapGrid());

    expect(result.current).not.toBeNull();
    expect(result.current!.map).toEqual([island]);
  });

  it('computes grid dimensions correctly', () => {
    const islands: Island[] = [
      {
        id: '0-0',
        x: 0,
        y: 0,
        type: IslandType.Empty,
        resources: [],
        occupants: [],
      },
      {
        id: '2-3',
        x: 2,
        y: 3,
        type: IslandType.Base,
        owner: 0,
        resources: [],
        occupants: [],
      },
    ];

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: islands }),
    } as GameBoardContextType);

    const { result } = renderHook(() => useMapGrid());

    // Max x=2, max y=3, so cols=3, rows=4
    expect(result.current!.cols).toBe(3);
    expect(result.current!.rows).toBe(4);
  });

  it('includes isMobile in view model', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: [island] }),
    } as GameBoardContextType);
    jest.mocked(useIsMobile).mockReturnValue(true);

    const { result } = renderHook(() => useMapGrid());

    expect(result.current!.isMobile).toBe(true);
  });

  it('includes pan-zoom state and handlers', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: [island] }),
    } as GameBoardContextType);

    const { result } = renderHook(() => useMapGrid());

    expect(result.current!.zoom).toBe(mockPanZoomState.zoom);
    expect(result.current!.pan).toEqual(mockPanZoomState.pan);
    expect(result.current!.defaultZoom).toBe(mockPanZoomState.defaultZoom);
    expect(result.current!.zoomIn).toBe(mockPanZoomState.zoomIn);
    expect(result.current!.zoomOut).toBe(mockPanZoomState.zoomOut);
    expect(result.current!.resetZoom).toBe(mockPanZoomState.resetZoom);
    expect(result.current!.handlers).toEqual(mockPanZoomState.handlers);
  });

  it('passes initialZoom and isMobile to useMapPanZoom', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: [island] }),
    } as GameBoardContextType);
    jest.mocked(useIsMobile).mockReturnValue(true);

    renderHook(() => useMapGrid());

    expect(useMapPanZoom).toHaveBeenCalledWith({
      initialZoom: DEFAULT_DESKTOP_ZOOM,
      isMobile: true,
    });
  });

  it('does NOT include isDragging in returned view model', () => {
    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: [island] }),
    } as GameBoardContextType);

    const { result } = renderHook(() => useMapGrid());

    // isDragging should not be in the returned shape (per Decisions in plan.md)
    expect(result.current!).not.toHaveProperty('isDragging');
  });

  it('updates when map prop changes', () => {
    const island1: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    const island2: Island = {
      id: '1-1',
      x: 1,
      y: 1,
      type: IslandType.Base,
      owner: 0,
      resources: [],
      occupants: [],
    };

    const { result, rerender } = renderHook(() => useMapGrid());

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: [island1] }),
    } as GameBoardContextType);

    rerender();

    expect(result.current!.map).toEqual([island1]);
    expect(result.current!.cols).toBe(1);
    expect(result.current!.rows).toBe(1);

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: [island1, island2] }),
    } as GameBoardContextType);

    rerender();

    expect(result.current!.map).toEqual([island1, island2]);
    expect(result.current!.cols).toBe(2);
    expect(result.current!.rows).toBe(2);
  });

  it('transitions from null to populated correctly', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: [] }),
    } as GameBoardContextType);

    const { result, rerender } = renderHook(() => useMapGrid());

    expect(result.current).toBeNull();

    const island: Island = {
      id: '0-0',
      x: 0,
      y: 0,
      type: IslandType.Empty,
      resources: [],
      occupants: [],
    };

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: buildGameState({ map: [island] }),
    } as GameBoardContextType);

    rerender();

    expect(result.current).not.toBeNull();
    expect(result.current!.map).toEqual([island]);
  });
});
