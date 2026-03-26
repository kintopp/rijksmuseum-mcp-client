import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ViewerState, NavigationCommand, ArtworkMeta } from '../lib/types.js';

interface ViewerStore extends ViewerState {
  openArtwork: (iiifUrl: string, meta: ArtworkMeta) => void;
  navigate: (cmd: NavigationCommand) => void;
  clearNavigation: () => void;
  selectRegion: (region: string) => void;
  clearSelectedRegion: () => void;
}

const ViewerContext = createContext<ViewerStore | null>(null);

export const ViewerProvider = ViewerContext.Provider;

export function useViewerStoreProvider(): ViewerStore {
  const [state, setState] = useState<ViewerState>({
    iiifUrl: null,
    meta: null,
    pendingNavigation: null,
    selectedRegion: null,
  });

  const openArtwork = useCallback((iiifUrl: string, meta: ArtworkMeta) => {
    setState((prev) =>
      prev.iiifUrl === iiifUrl ? prev : { iiifUrl, meta, pendingNavigation: null, selectedRegion: null },
    );
  }, []);

  const navigate = useCallback((cmd: NavigationCommand) => {
    setState((prev) => ({ ...prev, pendingNavigation: cmd }));
  }, []);

  const clearNavigation = useCallback(() => {
    setState((prev) => (prev.pendingNavigation === null ? prev : { ...prev, pendingNavigation: null }));
  }, []);

  const selectRegion = useCallback((region: string) => {
    setState((prev) => ({ ...prev, selectedRegion: region }));
  }, []);

  const clearSelectedRegion = useCallback(() => {
    setState((prev) => (prev.selectedRegion === null ? prev : { ...prev, selectedRegion: null }));
  }, []);

  return useMemo(
    () => ({ ...state, openArtwork, navigate, clearNavigation, selectRegion, clearSelectedRegion }),
    [state, openArtwork, navigate, clearNavigation, selectRegion, clearSelectedRegion],
  );
}

export function useViewerStore(): ViewerStore {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error('useViewerStore must be used within ViewerProvider');
  return ctx;
}
