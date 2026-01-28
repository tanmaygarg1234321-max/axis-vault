type InvokeOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  /** Override the default Authorization Bearer token (defaults to publishable key). */
  authToken?: string;
  method?: string;
  signal?: AbortSignal;
};

/**
 * Minimal edge-function invoker that guarantees custom headers (like x-admin-token)
 * are actually sent, bypassing any client SDK header overrides.
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<T> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!baseUrl || !publishableKey) {
    throw new Error("Backend environment is not configured");
  }

  const {
    body,
    headers,
    authToken,
    method = "POST",
    signal,
  } = options;

  const res = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
      Authorization: `Bearer ${authToken ?? publishableKey}`,
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const text = await res.text();
  const data = text ? (safeJsonParse(text) as T) : (undefined as unknown as T);

  if (!res.ok) {
    const msg =
      // common patterns
      (data as any)?.error ||
      (data as any)?.message ||
      text ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return { message: input };
  }
}
