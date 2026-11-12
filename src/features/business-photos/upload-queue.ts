/** Bounded concurrency with ordered results; one rejection never stops the queue. */
export async function runUploadQueue<T>(items: readonly T[], worker: (item: T, index: number) => Promise<void>, concurrency = 2): Promise<PromiseSettledResult<void>[]> {
  const results: PromiseSettledResult<void>[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, Math.min(2, Math.floor(concurrency) || 1))) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try { await worker(items[index], index); results[index] = { status: "fulfilled", value: undefined }; }
      catch (reason) { results[index] = { status: "rejected", reason }; }
    }
  }));
  return results;
}
