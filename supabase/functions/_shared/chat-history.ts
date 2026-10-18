export const HISTORY_PAGE_SIZE = 40;
export function pageOptions(params: URLSearchParams) {
  const number = (name: string, fallback: number, maximum: number) => {
    const value = params.get(name);
    if (value === null) return fallback;
    if (!/^\d+$/.test(value) || Number(value) > maximum) throw new Error(`Invalid ${name}`);
    return Number(value);
  };
  const limit = number('limit', HISTORY_PAGE_SIZE, 100);
  if (limit < 1) throw new Error('Invalid limit');
  return { limit, offset: number('offset', 0, 100000), search: (params.get('q') || '').trim().slice(0, 120) };
}
export function messageCursor(value: string | null) {
  if (!value) return undefined;
  const cursor = JSON.parse(value);
  if (typeof cursor.created_at !== 'string' || !Number.isFinite(Date.parse(cursor.created_at)) || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(cursor.id)) throw new Error('Invalid message cursor');
  return { created_at: new Date(cursor.created_at).toISOString(), id: cursor.id };
}
export function mergeMessages<T extends { id: string; created_at: string }>(...pages: T[][]): T[] {
  const unique = new Map(pages.flat().map(message => [message.id, message]));
  return [...unique.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
