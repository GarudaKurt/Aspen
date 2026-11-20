export async function chatQuery<T>(
  query: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined) params.set(key, String(value));
  const response = await fetch(`/api/chats?${params}`, {
    cache: "no-store",
    signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not load messages.");
  return data as T;
}
