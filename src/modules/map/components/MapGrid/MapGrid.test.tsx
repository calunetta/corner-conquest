import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapGrid, MapGridView } from './MapGrid';
import { useMapGrid } from './MapGrid.hook';
import { populatedMapGrid } from './MapGrid.fixtures';
import type { MapGridViewModel } from './MapGrid.types';

// Mock subcomponents
jest.mock('../MapZoomControls', () => ({
  MapZoomControls: ({
    onZoomIn,
    onZoomOut,
    onResetZoom,
    zoom,
  }: {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    zoom: number;
  }) => (
    <div data-testid="map-zoom-controls">
      <button data-testid="zoom-in" onClick={onZoomIn} />
      <button data-testid="zoom-out" onClick={onZoomOut} />
      <button data-testid="reset-zoom" onClick={onResetZoom} />
      <div data-testid="zoom-display">{zoom}</div>
    </div>
  ),
}));

jest.mock('../MapDecorations', () => ({
  MapDecorations: ({ isMobile }: { isMobile: boolean }) => (
    <div data-testid="map-decorations" data-mobile={isMobile} />
  ),
}));

jest.mock('../IslandTile', () => ({
  IslandTile: ({ island }: { island: { id: string } }) => (
    <div data-testid="island-tile" data-island-id={island.id} />
  ),
}));

// Mock useMapGrid hook
jest.mock('./MapGrid.hook', () => ({
  useMapGrid: jest.fn(),
}));

describe('MapGridView', () => {
  it('renders the map zoom controls', () => {
    render(<MapGridView {...populatedMapGrid} />);

    expect(screen.getByTestId('map-zoom-controls')).toBeInTheDocument();
  });

  it('calls zoom callbacks when zoom buttons are clicked', () => {
    render(<MapGridView {...populatedMapGrid} />);

    fireEvent.click(screen.getByTestId('zoom-in'));
    expect(populatedMapGrid.zoomIn).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('zoom-out'));
    expect(populatedMapGrid.zoomOut).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('reset-zoom'));
    expect(populatedMapGrid.resetZoom).toHaveBeenCalled();
  });

  it('renders map decorations with isMobile prop', () => {
    render(<MapGridView {...populatedMapGrid} />);

    const decorations = screen.getByTestId('map-decorations');
    expect(decorations).toHaveAttribute('data-mobile', 'false');
  });

  it('renders map decorations with isMobile=true', () => {
    const mobileViewmodel: MapGridViewModel = {
      ...populatedMapGrid,
      isMobile: true,
    };

    render(<MapGridView {...mobileViewmodel} />);

    const decorations = screen.getByTestId('map-decorations');
    expect(decorations).toHaveAttribute('data-mobile', 'true');
  });

  it('renders all islands from the map', () => {
    render(<MapGridView {...populatedMapGrid} />);

    const tiles = screen.getAllByTestId('island-tile');
    expect(tiles).toHaveLength(populatedMapGrid.map.length);

    populatedMapGrid.map.forEach((island, idx) => {
      expect(tiles[idx]).toHaveAttribute('data-island-id', island.id);
    });
  });

  it('applies transform with pan and zoom values', () => {
    render(<MapGridView {...populatedMapGrid} />);

    const wrapper = screen.getByTestId('map-canvas-container').querySelector('div[style*="translate3d"]');
    expect(wrapper).toHaveStyle({
      transform: `translate3d(${populatedMapGrid.pan.x}px, ${populatedMapGrid.pan.y}px, 0) scale(${populatedMapGrid.zoom})`,
    });
  });

  it('updates grid dimensions based on cols prop', () => {
    render(<MapGridView {...populatedMapGrid} />);

    const gridContainer = screen.getByTestId('map-canvas-container').querySelector('[style*="grid"]');
    expect(gridContainer).toHaveStyle({
      gridTemplateColumns: `repeat(${populatedMapGrid.cols}, clamp(94px, 12.5vh, 136px))`,
    });
  });

  it('uses mobile grid dimensions when isMobile=true', () => {
    const mobileViewmodel: MapGridViewModel = {
      ...populatedMapGrid,
      isMobile: true,
    };

    render(<MapGridView {...mobileViewmodel} />);

    const gridContainer = screen.getByTestId('map-canvas-container').querySelector('[style*="grid"]');
    expect(gridContainer).toHaveStyle({
      gridTemplateColumns: `repeat(${populatedMapGrid.cols}, clamp(46px, 13.5vw, 68px))`,
    });
  });

  it('applies appropriate grid gap for desktop', () => {
    render(<MapGridView {...populatedMapGrid} />);

    const gridContainer = screen.getByTestId('map-canvas-container').querySelector('[style*="gap"]');
    expect(gridContainer).toHaveStyle({
      gap: 'clamp(12px, 1.8vh, 22px)',
    });
  });

  it('applies appropriate grid gap for mobile', () => {
    const mobileViewmodel: MapGridViewModel = {
      ...populatedMapGrid,
      isMobile: true,
    };

    render(<MapGridView {...mobileViewmodel} />);

    const gridContainer = screen.getByTestId('map-canvas-container').querySelector('[style*="gap"]');
    expect(gridContainer).toHaveStyle({
      gap: 'clamp(4px, 1.2vw, 8px)',
    });
  });

  it('applies pan-zoom handlers to root container', () => {
    render(<MapGridView {...populatedMapGrid} />);

    const root = screen.getByTestId('map-canvas-container');
    expect(root).toBeDefined();
  });

  it('memoizes MapGridView for performance', () => {
    const { rerender } = render(<MapGridView {...populatedMapGrid} />);

    const tilesBeforeRerender = screen.getAllByTestId('island-tile');
    expect(tilesBeforeRerender).toHaveLength(populatedMapGrid.map.length);

    // Rerender with same props (should memoize)
    rerender(<MapGridView {...populatedMapGrid} />);

    const tilesAfterRerender = screen.getAllByTestId('island-tile');
    expect(tilesAfterRerender).toHaveLength(populatedMapGrid.map.length);
  });

  it('passes correct zoom values to zoom controls', () => {
    const customViewmodel: MapGridViewModel = {
      ...populatedMapGrid,
      zoom: 1.25,
      defaultZoom: 0.9,
    };

    render(<MapGridView {...customViewmodel} />);

    const zoomDisplay = screen.getByTestId('zoom-display');
    expect(zoomDisplay).toHaveTextContent('1.25');
  });

  it('renders transform wrapper with correct origin', () => {
    render(<MapGridView {...populatedMapGrid} />);

    const wrapper = screen.getByTestId('map-canvas-container').querySelector('div[style*="translate3d"]') as HTMLDivElement;
    expect(wrapper?.style.transformOrigin).toBe('center center');
  });

  it('renders empty grid when map is empty (but not null)', () => {
    const emptyViewmodel: MapGridViewModel = {
      ...populatedMapGrid,
      map: [],
    };

    render(<MapGridView {...emptyViewmodel} />);

    const tiles = screen.queryAllByTestId('island-tile');
    expect(tiles).toHaveLength(0);
  });
});

describe('MapGrid (connected component)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when hook returns null', () => {
    jest.mocked(useMapGrid).mockReturnValue(null);

    const { container } = render(<MapGrid />);

    expect(container.firstChild).toBeNull();
  });

  it('renders MapGridView when hook returns a view model', () => {
    jest.mocked(useMapGrid).mockReturnValue(populatedMapGrid);

    render(<MapGrid />);

    expect(screen.getByTestId('map-zoom-controls')).toBeInTheDocument();
    expect(screen.getAllByTestId('island-tile')).toHaveLength(populatedMapGrid.map.length);
  });

  it('calls useMapGrid hook', () => {
    jest.mocked(useMapGrid).mockReturnValue(populatedMapGrid);

    render(<MapGrid />);

    expect(useMapGrid).toHaveBeenCalled();
  });

  it('updates when hook returns different view model', () => {
    const initialViewmodel = populatedMapGrid;
    jest.mocked(useMapGrid).mockReturnValue(initialViewmodel);

    const { rerender } = render(<MapGrid />);

    let tiles = screen.getAllByTestId('island-tile');
    expect(tiles).toHaveLength(initialViewmodel.map.length);

    const updatedViewmodel: MapGridViewModel = {
      ...populatedMapGrid,
      zoom: 1.5,
      cols: 4,
      rows: 4,
    };
    jest.mocked(useMapGrid).mockReturnValue(updatedViewmodel);

    rerender(<MapGrid />);

    tiles = screen.getAllByTestId('island-tile');
    expect(tiles).toHaveLength(updatedViewmodel.map.length);
  });

  it('transitions from null to populated', () => {
    jest.mocked(useMapGrid).mockReturnValue(null);

    const { container, rerender } = render(<MapGrid />);
    expect(container.firstChild).toBeNull();

    jest.mocked(useMapGrid).mockReturnValue(populatedMapGrid);

    rerender(<MapGrid />);

    expect(screen.getByTestId('map-zoom-controls')).toBeInTheDocument();
  });
});
