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

export interface CuratedModel {
  id: string;
  label: string;
  tier: 'free' | 'budget' | 'mid' | 'premium';
}

export const CURATED_MODELS: CuratedModel[] = [
  // Free
  { id: 'openrouter/free', label: 'Free Models Router', tier: 'free' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B (free)', tier: 'free' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 Next 80B (free)', tier: 'free' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small 3.1 (free)', tier: 'free' },
  { id: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder (free)', tier: 'free' },
  // Budget
  { id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 Mini', tier: 'budget' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 'budget' },
  { id: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', tier: 'budget' },
  { id: 'mistralai/mistral-small-2603', label: 'Mistral Small', tier: 'budget' },
  { id: 'qwen/qwen3.5-122b-a10b', label: 'Qwen3.5 122B', tier: 'budget' },
  // Mid-tier
  { id: 'openai/gpt-5.4', label: 'GPT-5.4', tier: 'mid' },
  { id: 'openai/gpt-5.1', label: 'GPT-5.1', tier: 'mid' },
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6', tier: 'mid' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'mid' },
  { id: 'mistralai/mistral-large-2512', label: 'Mistral Large', tier: 'mid' },
  // Premium
  { id: 'anthropic/claude-opus-4.6', label: 'Claude Opus 4.6', tier: 'premium' },
  { id: 'openai/gpt-5.4-pro', label: 'GPT-5.4 Pro', tier: 'premium' },
];

export const DEFAULT_MODEL = 'openrouter/free';

const REGION_RE = /pct:([\d.]+),([\d.]+),([\d.]+),([\d.]+)/;

export function parseRegion(region: string): { x: number; y: number; w: number; h: number } | null {
  const m = region.match(REGION_RE);
  if (!m) return null;
  const [, x, y, w, h] = m.map(Number);
  return { x: x / 100, y: y / 100, w: w / 100, h: h / 100 };
}
