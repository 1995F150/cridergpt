import { NativeAPIError, nativeRequest, type NativeConfig } from './native-api.ts';

// callerId must come from auth.getUser(), never a body field or user_metadata.
export async function nativeAudio(config: NativeConfig, callerId: string, input: Record<string, unknown>, fetcher: typeof fetch = fetch) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(callerId)) throw new NativeAPIError('Verified voice identity required.', 401);
  const operation = input.operation;
  let path: string; let body: unknown;
  if (operation === 'catalog') path = '/v1/audio/voices';
  else if (operation === 'transcribe') {
    if (typeof input.audio !== 'string' || input.audio.length > 2796212 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.audio)) throw new NativeAPIError('Use bounded base64 audio.', 400);
    path = '/v1/audio/jobs'; body = { operation, audio: input.audio };
  } else if (operation === 'speech') {
    if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 300 || typeof input.voice_id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(input.voice_id)) throw new NativeAPIError('Select an available voice and 1–300 speech characters.', 400);
    path = '/v1/audio/jobs'; body = { operation, text: input.text, voice_id: input.voice_id };
  } else if (operation === 'job' || operation === 'cancel') {
    if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/.test(input.id)) throw new NativeAPIError('Invalid audio job ID.', 400);
    path = '/v1/audio/jobs/' + input.id + (operation === 'cancel' ? '/cancel' : '');
    if (operation === 'cancel') body = {};
  } else throw new NativeAPIError('Unsupported audio operation.', 400);
  return (await nativeRequest(config, path, body, fetcher, callerId)).data;
}
