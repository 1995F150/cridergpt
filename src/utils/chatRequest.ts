/** No automatic generation retries: a timeout does not prove the backend stopped. */
export async function withChatDeadline<T>(request: Promise<T>, milliseconds = 105000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([request, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Request timed out. Backend completion is unknown; reload saved history before retrying.')), milliseconds);
    })]);
  } finally { clearTimeout(timer!); }
}
export async function historyFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try { const response = await fetch(input, { ...init, signal: controller.signal }); const body = await response.arrayBuffer(); return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers }); }
  finally { clearTimeout(timer); }
}
