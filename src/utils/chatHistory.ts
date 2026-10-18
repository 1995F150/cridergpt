export { mergeMessages } from '../../supabase/functions/_shared/chat-history';
export function selectionKey(userId: string) { return `cridergpt:conversation:v6:${userId}`; }
export function recordedModel(result: Record<string, unknown>) {
  const fields = ['model', 'source', 'request_id', 'finish_reason', 'incomplete', 'experimental', 'tokens_used'];
  return Object.fromEntries(fields.filter(key => result[key] !== undefined).map(key => [key, result[key]]));
}
