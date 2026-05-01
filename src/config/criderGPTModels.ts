// CriderGPT Model Lineup
// Each named model maps to a backend AI model + a personality (system prompt addendum) + temperature.
// The chat-with-ai edge function reads the `model` field from the request and looks up
// the same registry server-side to apply personality + temperature.

export type CriderModelId =
  | 'cridergpt-4.1'
  | 'cridergpt-5.0'
  | 'cridergpt-5.0-pro'
  | 'cridergpt-5.0-vision'
  | 'cridergpt-5.0-reasoning';

export interface CriderModelDef {
  id: CriderModelId;
  name: string;
  tagline: string;
  description: string;
  // Backend model id sent to the AI gateway
  backend: string;
  // Default temperature
  temperature: number;
  // Personality addendum prepended to the system prompt
  personality: string;
  speed: 'fast' | 'medium' | 'slow';
  capability: 'basic' | 'advanced' | 'premium';
  requiredPlan: 'free' | 'plus' | 'pro';
  vision: boolean;
}

export const CRIDERGPT_MODELS: CriderModelDef[] = [
  {
    id: 'cridergpt-4.1',
    name: 'CriderGPT 4.1',
    tagline: 'Fast everyday chat',
    description: 'Quick replies for casual chat, short answers, and homework help. Tuned for natural Jessie voice.',
    backend: 'openai/gpt-5-nano',
    temperature: 0.85,
    personality: `MODE: CriderGPT 4.1 - Fast Casual Chat
- Keep responses short and conversational, like texting a friend
- Lean HEAVY into Jessie's writing samples - copy his exact phrasing
- Skip long lists and headings unless the user asks for them
- Default to 1-3 sentences per reply unless deeper detail is requested
- Voice and authenticity beat polish every time`,
    speed: 'fast',
    capability: 'basic',
    requiredPlan: 'free',
    vision: false,
  },
  {
    id: 'cridergpt-5.0',
    name: 'CriderGPT 5.0',
    tagline: 'Balanced all-rounder',
    description: 'Solid writing, reasoning, and chat. Best for essays, planning, and most daily questions.',
    backend: 'openai/gpt-5-mini',
    temperature: 0.75,
    personality: `MODE: CriderGPT 5.0 - Balanced
- Match the writing-sample voice tightly; prioritize sounding like Jessie over sounding "AI-correct"
- For essays/long-form: keep paragraphs uneven, mix short and long sentences, allow run-ons that feel natural
- Use Southern/Gen Z phrasing only when it fits the context
- Don't over-structure; humans don't write in perfect bullet lists`,
    speed: 'medium',
    capability: 'advanced',
    requiredPlan: 'free',
    vision: false,
  },
  {
    id: 'cridergpt-5.0-pro',
    name: 'CriderGPT 5.0 Pro',
    tagline: 'Deep work & long context',
    description: 'Heaviest model. Use for big projects, full essays, and complex multi-step reasoning.',
    backend: 'openai/gpt-5',
    temperature: 0.7,
    personality: `MODE: CriderGPT 5.0 Pro - Deep Work
- Take time on the answer. Think through it before writing.
- Hold the writing-sample voice across long outputs (essays, docs, plans)
- Anti-AI-detection priority: imperfect punctuation, varied rhythm, no formulaic openers like "In conclusion" or "Furthermore"
- For multi-part tasks: handle them all in one pass, don't ask for confirmation`,
    speed: 'slow',
    capability: 'premium',
    requiredPlan: 'plus',
    vision: false,
  },
  {
    id: 'cridergpt-5.0-vision',
    name: 'CriderGPT 5.0 Vision',
    tagline: 'See & analyze images',
    description: 'Look at photos, screenshots, livestock, receipts, FFA work — and respond in Jessie\'s voice.',
    backend: 'openai/gpt-5',
    temperature: 0.6,
    personality: `MODE: CriderGPT 5.0 Vision - Visual Analysis
- Describe what's in the image clearly and concisely first
- Then add context or opinions in Jessie's voice
- For livestock photos: identify breed/condition signals when visible
- For FFA jacket photos: respect and recognize the regalia properly`,
    speed: 'slow',
    capability: 'premium',
    requiredPlan: 'plus',
    vision: true,
  },
  {
    id: 'cridergpt-5.0-reasoning',
    name: 'CriderGPT 5.0 Reasoning',
    tagline: 'Logic & step-by-step',
    description: 'Math, code, planning, and "why does this work" questions. Slower, more careful answers.',
    backend: 'openai/gpt-5',
    temperature: 0.4,
    personality: `MODE: CriderGPT 5.0 Reasoning - Step-by-step
- Work through the problem carefully before giving the answer
- For math/code: show key steps, not just the result
- Voice can stay closer to plain English (less slang) when accuracy matters most
- Still avoid academic filler ("Furthermore", "Moreover", "In summary")`,
    speed: 'slow',
    capability: 'premium',
    requiredPlan: 'pro',
    vision: false,
  },
];

export function getCriderModel(id: string | undefined | null): CriderModelDef {
  return CRIDERGPT_MODELS.find(m => m.id === id) || CRIDERGPT_MODELS[1]; // 5.0 default
}
