// Native CriderGPT transport only. No gateway, corpus answer or provider fallback.
export class NativeAPIError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}
export type NativeConfig = { base: string; key: string };
export type NativeModel = { id: string; name: string; type: string; experimental: boolean; web_search_supported?: boolean; vision_assist_supported?: boolean };
export function nativeConfig(base: string, key: string): NativeConfig {
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !key) {
    throw new NativeAPIError('Native server connection is not configured securely.', 503);
  }
  return { base: url.href.replace(/\/+$/, ''), key };
}
export async function nativeRequest(config: NativeConfig, path: string, body?: unknown, fetcher: typeof fetch = fetch) {
  const response = await fetcher(config.base + path, {
    method: body === undefined ? 'GET' : 'POST', redirect: 'error',
    headers: { Authorization: `Bearer ${config.key}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(path === '/v1/chat' ? 115000 : 15000),
  });
  const reader = response.body?.getReader();
  if (!reader) throw new NativeAPIError('Native server returned no response.');
  const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    bytes += value.length;
    if (bytes > 3200000) { await reader.cancel(); throw new NativeAPIError('Native response exceeded its size limit.'); }
    chunks.push(value);
  }
  const data = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  let result: any;
  try { result = JSON.parse(new TextDecoder().decode(data)); }
  catch { throw new NativeAPIError('Native server returned an unreadable or interrupted response.'); }
  if (!response.ok) throw new NativeAPIError(
    typeof result.error?.message === 'string' ? result.error.message.slice(0, 300) : 'Native model request failed; no fallback was used.',
    [400, 413, 422, 429, 503, 504].includes(response.status) ? response.status : 502,
  );
  return { status: response.status, data: result };
}
export async function nativeModels(config: NativeConfig, fetcher: typeof fetch = fetch): Promise<NativeModel[]> {
  const { data } = await nativeRequest(config, '/v1/models', undefined, fetcher);
  if (!Array.isArray(data.models)) throw new NativeAPIError('Native model catalog is invalid.');
  return data.models.filter((model: any) => model?.type === 'text' && model.available !== false &&
    typeof model.id === 'string' && /^[\w.-]{1,160}$/.test(model.id) && typeof model.name === 'string')
    .map((model: any) => ({ id: model.id, name: model.name.slice(0, 160), type: 'text', experimental: model.experimental !== false, web_search_supported: model.web_search_supported === true, vision_assist_supported: model.vision_assist_supported === true }));
}
export function nativeMessages(message: unknown, history: unknown = []) {
  if (typeof message !== 'string' || !message.trim() || message.length > 6000) throw new NativeAPIError('Native messages must contain 1–6000 characters.', 400);
  if (!Array.isArray(history)) throw new NativeAPIError('Invalid native conversation history.', 400);
  const turns = history.filter((turn: any) => ['user', 'assistant'].includes(turn?.role) && typeof turn.content === 'string' && turn.content.length > 0 && turn.content.length <= 6000);
  if (turns.at(-1)?.role === 'user' && turns.at(-1)?.content === message) turns.pop();
  const pairs: Array<Array<{ role: string; content: string }>> = [];
  for (let i = 0; i < turns.length - 1; i++) {
    if (turns[i].role === 'user' && turns[i + 1].role === 'assistant') pairs.push([turns[i], turns[++i]]);
  }
  const retained = pairs.slice(-8); const latest = { role: 'user', content: message };
  while (retained.length && new TextEncoder().encode(JSON.stringify([...retained.flat(), latest])).length > 29000) retained.shift();
  const result = [...retained.flat(), latest].map(({ role, content }) => ({ role, content }));
  if (new TextEncoder().encode(JSON.stringify(result)).length > 29000) throw new NativeAPIError('The native message is too large.', 413);
  return result;
}
const bytesTo64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const from64 = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function signingKey(secret: string) { return crypto.subtle.importKey('raw', new TextEncoder().encode('CriderGPT image jobs\n' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
export async function signImageJob(key: string, userId: string, id: string, now = Date.now()) {
  if (!/^[\w-]{16,100}$/.test(id)) throw new NativeAPIError('Invalid image job identifier.');
  const body = bytesTo64(new TextEncoder().encode(JSON.stringify({ sub: userId, id, exp: now + 14 * 60000 })));
  return body + '.' + bytesTo64(new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(key), new TextEncoder().encode(body))));
}
export async function verifyImageJob(key: string, userId: string, token: unknown, now = Date.now()) {
  try {
    if (typeof token !== 'string' || token.length > 1500) throw Error();
    const [body, signature, extra] = token.split('.'); if (extra || !body || !signature) throw Error();
    if (!await crypto.subtle.verify('HMAC', await signingKey(key), from64(signature), new TextEncoder().encode(body))) throw Error();
    const value = JSON.parse(new TextDecoder().decode(from64(body)));
    if (value.sub !== userId || !Number.isFinite(value.exp) || value.exp < now || !/^[\w-]{16,100}$/.test(value.id)) throw Error();
    return value.id as string;
  } catch { throw new NativeAPIError('Image job is expired or does not belong to this account.', 403); }
}
export async function startNativeChat(config: NativeConfig, userId: string, body: any, fetcher: typeof fetch = fetch) {
  const id = String(body.model || '').replace(/^native:/, '');
  const models = await nativeModels(config, fetcher);
  if (!models.some(model => model.id === id)) throw new NativeAPIError('Selected native checkpoint is unavailable; no fallback was used.', 422);
  const image = body.imageData || body.image_base64;
  if (body.image_url) throw new NativeAPIError('Upload image bytes; remote image URLs are not fetched by the local helper.', 422);
  if (image || body.mode === 'image_recognize') {
    if (!models.find(model => model.id === id)?.vision_assist_supported) throw new NativeAPIError('Local vision assistance is not enabled on this server.', 503);
    if (typeof image !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length > 4194404) throw new NativeAPIError('Upload one PNG, JPEG or WebP image, at most 3 MiB.', 400);
    if (typeof body.message !== 'string' || body.message.length > 500) throw new NativeAPIError('Use an image question of at most 500 characters.', 400);
  }
  const { status, data } = await nativeRequest(config, '/v1/chat', { model: id, messages: nativeMessages(body.message, body.conversation_history), ...(image ? {image_base64:image} : {}), routing: image ? 'text' : body.mode === 'image_generate' ? 'image' : 'auto', web_fallback: 'source_summary' }, fetcher);
  if (status === 202) {
    if (data.type !== 'image_job' || data.model !== 'stable-diffusion-1.5') throw new NativeAPIError('Unexpected native job response.');
    return { type: 'image_job', model: data.model, requested_model: id, source: 'native_image', request_id: data.request_id, job_token: await signImageJob(config.key, userId, data.id) };
  }
  if (data.model !== id || typeof data.response !== 'string' || !data.response.trim()) throw new NativeAPIError('Selected native checkpoint identity or response could not be verified.');
  // Return documented, non-secret fields only. Preserve pipeline/source-summary identity.
  return { type: 'text', response: data.response, model: data.model, requested_model: id, source: data.source, answer_origin: data.answer_origin || 'selected_model', experimental: true, request_id: data.request_id, inference_request_id: data.inference_request_id, sources: Array.isArray(data.sources) ? data.sources.slice(0, 3) : [], finish_reason: data.finish_reason, model_finish_reason: data.model_finish_reason, incomplete: data.incomplete === true, vision_assisted: data.vision_assisted === true, vision_helper: data.vision_helper, vision_revision: data.vision_revision, vision_latency_ms: data.vision_latency_ms, generated_tokens: data.generated_tokens, input_tokens: data.input_tokens, latency_ms: data.latency_ms, streaming_status: 'not_enabled' };
}
export async function pollNativeImage(config: NativeConfig, userId: string, token: unknown, fetcher: typeof fetch = fetch) {
  const id = await verifyImageJob(config.key, userId, token);
  const { data } = await nativeRequest(config, '/v1/images/jobs/' + encodeURIComponent(id), undefined, fetcher);
  if (data.model !== 'stable-diffusion-1.5') throw new NativeAPIError('Image model identity mismatch.');
  if (data.status === 'failed') throw new NativeAPIError('Selected image model failed; no fallback was used.', 503);
  if (data.status !== 'completed') return { status: 'running' };
  const png = data.data?.[0]?.b64_json;
  if (typeof png !== 'string' || png.length > 3000000 || !/^[A-Za-z0-9+/]+=*$/.test(png) || !png.startsWith('iVBORw0KGgo')) throw new NativeAPIError('Image server returned an invalid PNG.');
  return { status: 'completed', type: 'image', model: data.model, source: 'stable_diffusion_vulkan', response: 'Generated image.', image_url: 'data:image/png;base64,' + png, latency_ms: data.latency_ms, finish_reason: 'image_complete', incomplete: false };
}
