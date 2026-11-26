import { create } from "zustand";
import { z } from "zod";

const optionsSchema = z.array(z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(200),
  type: z.string().max(100).nullish(),
})).max(5000);

type Entry = { options: z.infer<typeof optionsSchema>; expires: number };
export const useLocationOptions = create<{ entries: Record<string, Entry> }>(() => ({ entries: {} }));
const pending = new Map<string, Promise<void>>();

export function loadLocationOptions(url: string): Promise<void> {
  const entry = useLocationOptions.getState().entries[url];
  if (entry && entry.expires > Date.now()) return Promise.resolve();
  const active = pending.get(url);
  if (active) return active;
  const request = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error("Unable to load locations.");
    const parsed = optionsSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("Location data could not be read.");
    const now = Date.now();
    useLocationOptions.setState(({ entries }) => {
      const recent = Object.entries(entries).filter(([key, item]) => key !== url && item.expires > now).slice(-23);
      return { entries: { ...Object.fromEntries(recent), [url]: { options: parsed.data, expires: now + 3600000 } } };
    });
  }).finally(() => pending.delete(url));
  pending.set(url, request);
  return request;
}
