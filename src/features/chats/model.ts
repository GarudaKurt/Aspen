import type { Message } from "./types";

/** Realtime, HTTP responses and retries can arrive in any order. */
export function mergeMessages(
  current: Message[],
  incoming: Message[],
  includeOlder = false,
) {
  const entries = new Map(current.map((message) => [message.id, message]));
  const oldest = current[0]?.seq ?? 0;
  for (const message of incoming) {
    const prior = entries.get(message.id);
    if (!includeOlder && !prior && message.seq < oldest) continue;
    if (
      !prior ||
      timestampOrder(message.updated_at) >= timestampOrder(prior.updated_at)
    )
      entries.set(message.id, message);
  }
  return [...entries.values()].sort((a, b) => a.seq - b.seq);
}
// Preserve PostgreSQL microseconds when comparing HTTP and RPC timestamps.
function timestampOrder(value: string) {
  const fraction = /\.(\d+)/.exec(value)?.[1] ?? "";
  return (
    BigInt(new Date(value).getTime()) * BigInt(1000) +
    BigInt(fraction.padEnd(6, "0").slice(3, 6))
  );
}
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => [...word][0])
      .join("")
      .toUpperCase() || "?"
  );
}
