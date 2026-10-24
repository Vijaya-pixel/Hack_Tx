// Turns "what describes you?" + two answers into an original cartoon character spec.
// The spec is traits only. The frontend draws it in the app's own style (SVG), and an image
// model can be added later. Users never edit the result.
export const COLORS = ['blue', 'orange', 'green', 'purple', 'red', 'teal', 'yellow', 'pink'];
export const HAIR = ['short', 'curly', 'buzz', 'long', 'bun', 'cap', 'none'];
export const ACCESSORIES = ['coffee cup', 'clipboard', 'headphones', 'backpack', 'chef hat',
  'dice', 'book', 'camera', 'guitar', 'sneakers'];
export const MOODS = ['relaxed', 'excited', 'happy', 'cool', 'bold'];
export const POSES = ['waving', 'thinking', 'jumping', 'leaning'];
export const VIBES = ['chill', 'adventure', 'food', 'nightlife', 'outdoors'];

const VIBE_MOOD = { chill: 'relaxed', adventure: 'excited', food: 'happy', nightlife: 'cool', outdoors: 'bold' };
const VIBE_POSE = { chill: 'leaning', adventure: 'jumping', food: 'waving', nightlife: 'leaning', outdoors: 'jumping' };

// keyword -> [accessory, title]
const KEYWORDS = [
  [/\b(plan|organi[sz]|schedule|list|spreadsheet|lead)/i, 'clipboard', 'the planner'],
  [/\b(coffee|latte|espresso|cafe)/i, 'coffee cup', 'the coffee fan'],
  [/\b(music|song|band|playlist|concert)/i, 'headphones', 'the music head'],
  [/\b(hik|camp|outdoor|trail|mountain|climb)/i, 'backpack', 'the trail runner'],
  [/\b(cook|bake|food|eat|foodie|restaurant|chef)/i, 'chef hat', 'the foodie'],
  [/\b(game|board game|poker|dice|puzzle)/i, 'dice', 'the game master'],
  [/\b(read|book|novel|write|writer)/i, 'book', 'the bookworm'],
  [/\b(photo|camera|film|video)/i, 'camera', 'the storyteller'],
  [/\b(guitar|piano|drum|play music)/i, 'guitar', 'the jammer'],
  [/\b(run|gym|sport|soccer|basketball|football|fit)/i, 'sneakers', 'the athlete'],
];

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const pick = (arr, seed) => arr[hash(seed) % arr.length];

// Deterministic fallback: works with no AI at all.
export function fallbackTraits({ name, describe, vibe }) {
  const text = `${describe || ''}`;
  const hit = KEYWORDS.find(([re]) => re.test(text));
  const accessory = hit ? hit[1] : pick(ACCESSORIES, `${name}acc`);
  const title = hit ? hit[2] : 'the wildcard';
  const v = VIBES.includes(vibe) ? vibe : pick(VIBES, `${name}vibe`);
  return {
    color: pick(COLORS, `${name}color`),
    hair: pick(HAIR, `${name}hair`),
    accessory,
    mood: VIBE_MOOD[v],
    pose: VIBE_POSE[v],
    title,
    tagline: `${name}, ${title}. Perfect weekend: ${v}.`,
    source: 'fallback',
  };
}

// The prompt an LLM gets. Guardrail: original characters only.
export function traitPrompt({ name, describe, city, vibe }) {
  return [
    'You design ORIGINAL cartoon characters for a friendship app. Never copy or resemble an existing',
    'character, brand mascot or real person, even if the user asks. Reply with JSON only, no prose.',
    `Allowed values: color ${JSON.stringify(COLORS)}, hair ${JSON.stringify(HAIR)},`,
    `accessory ${JSON.stringify(ACCESSORIES)}, mood ${JSON.stringify(MOODS)}, pose ${JSON.stringify(POSES)}.`,
    'Also return "title" (2-4 words, like "the planner") and "tagline" (max 80 characters).',
    `Person: name=${name}; home=${city}; perfect weekend=${vibe}; about them: ${describe}`,
  ].join('\n');
}

const inSet = (v, set) => set.includes(v);

// Accept an LLM reply only if every field is valid; otherwise null.
export function parseTraits(text) {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    const t = JSON.parse(text.slice(start, end + 1));
    const ok = inSet(t.color, COLORS) && inSet(t.hair, HAIR) && inSet(t.accessory, ACCESSORIES)
      && inSet(t.mood, MOODS) && inSet(t.pose, POSES)
      && typeof t.title === 'string' && t.title.length <= 30
      && typeof t.tagline === 'string' && t.tagline.length <= 100;
    return ok ? { ...t, source: 'ai' } : null;
  } catch { return null; }
}

// llm is optional: { complete(prompt) -> Promise<string> }
export async function makeCharacter(input, llm) {
  if (llm) {
    try {
      const reply = await llm.complete(traitPrompt(input));
      const traits = parseTraits(reply);
      if (traits) return traits;
    } catch { /* fall through to the deterministic version */ }
  }
  return fallbackTraits(input);
}
