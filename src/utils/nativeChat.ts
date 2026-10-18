import { withChatDeadline } from '@/utils/chatRequest';
import { supabase } from '@/integrations/supabase/client';
export type NativeChatResult = {
  response: string; imageUrl?: string; source?: string; generated_tokens?: number;
  model?: string; requested_model?: string; request_id?: string; answer_origin?: string;
  finish_reason?: string; incomplete?: boolean; sources?: Array<{ id: number; title: string; url: string }>;
  [key: string]: unknown;
};
async function invoke(name: string, body: unknown) {
  const { data, error } = await withChatDeadline(supabase.functions.invoke(name, { body }), name === 'chat-with-ai' ? 105000 : 20000);
  if (error) {
    let message = 'Native request failed; no other model was substituted.';
    if ('context' in error && error.context instanceof Response) {
      try { const failure = await error.context.json(); if (typeof failure.error === 'string') message = failure.error; } catch { /* interrupted response */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function generateNativeResponse(message: string, model: string, history: Array<{ role: string; content: string }>, imageData?: string): Promise<NativeChatResult> {
  const result = await invoke('chat-with-ai', { model, message, conversation_history: history, imageData });
  if (result.type !== 'image_job') {
    if (typeof result.response !== 'string' || !result.response.trim()) throw new Error('Native server returned no answer.');
    return result;
  }
  const deadline = Date.now() + 190000;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const job = await invoke('cridergpt-ubuntu-api', { action: 'native_image_job', job_token: result.job_token });
    if (job.status === 'completed') return { ...job, imageUrl: job.image_url, request_id: result.request_id, requested_model: result.requested_model, answer_origin: 'image_model' };
  }
  throw new Error('Image generation did not complete in time. No replacement model was used.');
}
export function nativeMessageMetadata(result: NativeChatResult) {
  const fields = ['model','requested_model','source','answer_origin','request_id','inference_request_id','finish_reason','model_finish_reason','incomplete','generated_tokens','input_tokens','latency_ms','streaming_status','experimental','context_history_received','context_history_used','context_trimmed'];
  return Object.fromEntries([['provider', 'cridergpt_native'], ...fields.map(key => [key, result[key]]), ['sources', result.sources || []]].filter(([,value]) => value !== undefined));
}
