export interface ArtworkMeta {
  title: string;
  creator?: string;
  date?: string;
  objectNumber?: string;
  license?: string;
  physicalDimensions?: string;
  collectionUrl?: string;
  fullUrl?: string;
  width?: number;
  height?: number;
}

export interface ViewerState {
  iiifUrl: string | null;
  meta: ArtworkMeta | null;
  pendingNavigation: NavigationCommand | null;
  selectedRegion: string | null; // pct:x,y,w,h from interactive selection
}

export interface NavigationCommand {
  region?: string; // pct:x,y,w,h
  overlays?: Overlay[];
}

export interface Overlay {
  region: string; // pct:x,y,w,h
  label?: string;
  color?: string;
}

export interface AvailableModel {
  id: string;
  label: string;
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
  { id: 'mistralai/mistral-large-2512', label: 'Mistral Large 3' },
];

export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';

const REGION_RE = /pct:([\d.]+),([\d.]+),([\d.]+),([\d.]+)/;

export function parseRegion(region: string): { x: number; y: number; w: number; h: number } | null {
  const m = region.match(REGION_RE);
  if (!m) return null;
  const [, x, y, w, h] = m.map(Number);
  return { x: x / 100, y: y / 100, w: w / 100, h: h / 100 };
}
