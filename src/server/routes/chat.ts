import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { buildTools } from '../lib/tool-adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

let skillContent: string | null = null;
function getSkillContent(): string {
  if (!skillContent) {
    const skill = readFileSync(path.join(dataDir, 'skill.md'), 'utf-8');
    const provenance = readFileSync(path.join(dataDir, 'provenance-patterns.md'), 'utf-8');
    skillContent = `${skill}\n\n${provenance}`;
  }
  return skillContent;
}

const router = Router();

const SYSTEM_PROMPT = `You are a knowledgeable art and museum assistant with direct access to the Rijksmuseum collection — circa 830,000 artworks from antiquity to the present day, spanning paintings, prints, drawings, photographs, furniture, ceramics, textiles, and more. You help users explore, discover, and learn about artworks through conversation and by using the collection tools available to you.

<server_instructions>
Search uses a vocabulary database with structured filters (subject, material, technique, creator, depicted persons/places, Iconclass notation, dates, dimensions, and more). All filters combine freely with each other. Results are ranked by BM25 relevance when text search is used, by geographic proximity for nearPlace, and by importance (image availability, curatorial attention) otherwise.

Person names are matched against 210K name variants (76K persons) using phrase matching with fallback to token intersection — partial names and historical variants often work. aboutActor searches both subject and creator vocabulary for broader person matching.

Place searches support proximity (nearPlace), depicted places, and production places. 64% of places are geocoded. Multi-word queries like 'Oude Kerk Amsterdam' are resolved via progressive token splitting with geo-disambiguation.

Iconclass covers 40,675 subject notations. Use lookup_iconclass to find notation codes by concept, then pass them to search_artwork for precise iconographic filtering.

Descriptions (Dutch, cataloguer-written) cover 61% of artworks. Curatorial narratives (English, interpretive wall text) cover ~14K works. Both are searchable but use exact word matching — no stemming.
</server_instructions>

<tool_guidance>
Search and discovery workflow:
- Use search_artwork for discovery when the query names a specific artist, place, date, material, type, or Iconclass term. Use the subject filter for conceptual queries — it searches ~832K artworks tagged with structured Iconclass vocabulary and has the highest recall for conceptual queries.
- Use semantic_search when the concept cannot be expressed as structured metadata (atmosphere, emotion, composition, art-historical interpretation), or when search_artwork returned zero results.
- For queries where paintings are the expected result type, always combine semantic_search with a follow-up search_artwork(type: 'painting', subject: ...) — paintings are underrepresented in semantic results.
- Use get_artwork_details for full metadata on a specific work after finding it via search.
- Use collection_stats for distributional queries (e.g. "how many paintings?", "top depicted persons") — it answers in one call what would otherwise require loops.

Viewing artworks:
- Call get_artwork_image to display an artwork in the viewer — it returns a IIIF URL that opens automatically. Use this whenever the user wants to see a work.
- Use inspect_artwork_image to visually examine an artwork yourself (returns image data). Call it with region 'full' for the complete artwork, or 'pct:x,y,w,h' to zoom into a specific area.
- Use navigate_viewer to zoom the viewer to a specific region or add overlays for the user.

Important:
- Do not use technique: 'painting' to filter to paintings — use type: 'painting' instead.
- At least one search filter is required for search_artwork — there is no general full-text search across all metadata fields.
- When multiple independent tool calls would be useful, make them in parallel rather than sequentially.
- After receiving tool results, briefly describe what was found before continuing.
</tool_guidance>`;

router.post('/', async (req, res) => {
  const { messages, model, apiKey, skillContext } = req.body;

  if (!apiKey || !model) {
    res.status(400).json({ error: 'Missing apiKey or model' });
    return;
  }

  try {
    const openrouter = createOpenAICompatible({
      name: 'openrouter',
      baseURL: 'https://openrouter.ai/api/v1',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const tools = await buildTools();

    let system = SYSTEM_PROMPT;
    if (skillContext) {
      system += `\n\n<skill_file>\n${getSkillContent()}\n</skill_file>`;
    }

    const result = streamText({
      model: openrouter(model),
      system,
      messages,
      tools,
      maxSteps: 10,
    });

    result.pipeDataStreamToResponse(res);
  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat request failed' });
    }
  }
});

export default router;
