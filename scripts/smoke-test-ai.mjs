#!/usr/bin/env node

const timeoutMs = Number(process.env.AI_SMOKE_TIMEOUT_MS || 150000);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function withoutEndpointSuffix(raw) {
  return raw.replace(/\/+$/, '').replace(/(?:\/api)?\/chat(?:-with-ai)?$/, '');
}

function endpoint(raw, path) {
  const base = withoutEndpointSuffix(raw);
  return `${base}${path}`;
}

function safeUrl(raw) {
  try {
    const url = new URL(raw);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '<invalid-url>';
  }
}

function jsonShape(body, name) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error(`${name} returned a non-object JSON body`);
  }
  return body;
}

async function requestJson(name, url, options = {}) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    const latencyMs = Date.now() - started;
    console.log(JSON.stringify({
      test: name,
      url: safeUrl(url),
      status: response.status,
      latency_ms: latencyMs,
      json: !!body,
      body_bytes: Buffer.byteLength(text),
    }));
    if (!response.ok) {
      throw new Error(`${name} failed with HTTP ${response.status}`);
    }
    return jsonShape(body, name);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const engineBase = required('CRIDERGPT_ENGINE_URL');
  const engineKey = required('CRIDERGPT_ENGINE_API_KEY');
  const supabaseUrl = required('SUPABASE_URL').replace(/\/+$/, '');
  const supabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!supabaseKey) throw new Error('Missing required environment variable: SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY');

  const engineHeaders = { 'X-API-Key': engineKey };
  const health = await requestJson(
    'engine-health',
    process.env.CRIDERGPT_ENGINE_HEALTH_URL?.trim() || endpoint(engineBase, '/health'),
    { headers: engineHeaders },
  );
  if (health.ready !== true || health.status !== 'online') {
    throw new Error('Engine health is not ready/online');
  }

  const engineChat = await requestJson(
    'engine-chat',
    process.env.CRIDERGPT_ENGINE_CHAT_URL?.trim() || endpoint(engineBase, '/chat'),
    {
      method: 'POST',
      headers: { ...engineHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Reply with exactly: CRIDERGPT_ENGINE_OK',
        conversation_history: [],
        model: null,
        temperature: 0,
        max_tokens: 32,
      }),
    },
  );
  if (typeof engineChat.response !== 'string' || !engineChat.response.trim()) {
    throw new Error('Engine chat response is missing generated text');
  }
  if (typeof engineChat.model !== 'string' || !engineChat.model.trim()) {
    throw new Error('Engine chat response is missing model metadata');
  }

  const functionUrl = process.env.SUPABASE_FUNCTION_URL?.trim() || `${supabaseUrl}/functions/v1/chat-with-ai`;
  const supabaseHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${(process.env.SUPABASE_ACCESS_TOKEN || supabaseKey).trim()}`,
    'Content-Type': 'application/json',
  };
  const backendChat = await requestJson(
    'supabase-chat-with-ai',
    functionUrl,
    {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({
        message: 'Reply with exactly: CRIDERGPT_BACKEND_OK',
        conversation_history: [],
      }),
    },
  );
  if (typeof backendChat.response !== 'string' || !backendChat.response.trim()) {
    throw new Error('Supabase chat response is missing generated text');
  }
  if (typeof backendChat.source !== 'string' || !backendChat.source.trim()) {
    throw new Error('Supabase chat response is missing source metadata');
  }

  console.log(JSON.stringify({
    result: 'PASS',
    engine_model: engineChat.model,
    engine_response_chars: engineChat.response.length,
    backend_source: backendChat.source,
    backend_response_chars: backendChat.response.length,
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({ result: 'FAIL', error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
