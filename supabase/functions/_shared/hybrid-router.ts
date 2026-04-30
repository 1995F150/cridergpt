// Hybrid local-first router for CriderGPT.
// Decides whether a request should be served by the user's local Ollama
// (via the home-server agent / Cloudflare tunnel) or fall back to the cloud.
//
// Returns:
//   { route: 'local' | 'cloud', reason: string, model?: string, endpoint?: string }
//
// Pure function — caller does the actual fetch. This file has zero side
// effects so it can be reused from chat-with-ai, the public API, etc.

export type RouteDecision = {
  route: 'local' | 'cloud';
  reason: string;
  model?: string;
  endpoint?: string;
  settings?: HybridSettings;
};

export type HybridSettings = {
  enabled: boolean;
  local_endpoint: string | null;
  local_model: string;
  prefer_local_for: string[];
  cloud_fallback: boolean;
  max_local_latency_ms: number;
};

export type ClassifyInput = {
  message: string;
  has_image?: boolean;
  has_tools?: boolean;
  expected_tokens?: number;
};

// Cheap keyword classifier — no AI call. Buckets the prompt into
// 'casual' | 'simple' | 'classification' | 'summary' | 'reasoning' | 'creative' | 'code' | 'vision'
export function classifyTask(input: ClassifyInput): string {
  if (input.has_image) return 'vision';
  if (input.has_tools) return 'reasoning'; // tool calling = let cloud handle it
  const m = input.message.toLowerCase().trim();
  const words = m.split(/\s+/).filter(Boolean).length;

  if (/\b(summari[sz]e|tl;?dr|shorten|brief)\b/.test(m)) return 'summary';
  if (/\b(classify|categor|tag|label|sentiment)\b/.test(m)) return 'classification';
  if (/\b(write|generate|essay|story|poem|caption|tweet|post)\b/.test(m)) return 'creative';
  if (/\b(code|function|bug|fix|refactor|sql|typescript|python|kotlin)\b/.test(m)) return 'code';
  if (/\b(why|how|explain|reason|analy[sz]e|compare|trade-?off)\b/.test(m)) return 'reasoning';

  // Short, casual = local
  if (words <= 25) return 'casual';
  if (words <= 60) return 'simple';
  return 'reasoning';
}

export function decideRoute(
  input: ClassifyInput,
  settings: HybridSettings | null,
): RouteDecision {
  if (!settings || !settings.enabled || !settings.local_endpoint) {
    return { route: 'cloud', reason: 'router_disabled_or_unconfigured' };
  }
  if (input.has_image) {
    return { route: 'cloud', reason: 'vision_unsupported_locally', settings };
  }
  const task = classifyTask(input);
  const preferLocal = settings.prefer_local_for.includes(task);
  if (!preferLocal) {
    return { route: 'cloud', reason: `task_${task}_prefers_cloud`, settings };
  }
  return {
    route: 'local',
    reason: `task_${task}_local`,
    model: settings.local_model,
    endpoint: settings.local_endpoint,
    settings,
  };
}

// Call a local Ollama-compatible /api/chat endpoint with the OpenAI-style
// messages array. Returns OpenAI-shaped { choices: [{ message: { content }}] }
// so the caller doesn't need to special-case the response shape.
export async function callLocalOllama(
  endpoint: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts: { temperature?: number; max_tokens?: number; timeout_ms?: number } = {},
): Promise<{ ok: boolean; data?: any; error?: string; latency_ms: number }> {
  const t0 = Date.now();
  const url = endpoint.replace(/\/$/, '') + '/api/chat';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: opts.temperature ?? 0.7,
          num_predict: opts.max_tokens ?? 1024,
        },
      }),
      signal: AbortSignal.timeout(opts.timeout_ms ?? 30000),
    });
    const latency = Date.now() - t0;
    if (!res.ok) {
      return { ok: false, error: `local ${res.status}`, latency_ms: latency };
    }
    const json = await res.json();
    const content = json?.message?.content ?? json?.response ?? '';
    return {
      ok: true,
      latency_ms: latency,
      data: {
        choices: [{ message: { role: 'assistant', content } }],
        usage: { total_tokens: json?.eval_count ?? 0 },
        _local: true,
        _model: model,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      latency_ms: Date.now() - t0,
    };
  }
}
