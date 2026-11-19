import "server-only";
import sharp from "sharp";
import { validateBusinessImageUpload, safeOriginalImageFilename } from "./validate";

/** Lossless encoding only: originals win on ties, unsupported colour depth or animation. */
let running = 0;
const waiting: Array<() => void> = [];
export async function optimizeBusinessImage(bytes: Uint8Array, filename: string, type: string) {
  if (running >= 2) {
    if (waiting.length >= 4) throw new Error("Image processing is busy. Retry this photo.");
    await new Promise<void>((resolve) => waiting.push(resolve));
  } else running++;
  try { return await optimize(bytes, filename, type); }
  finally { const next = waiting.shift(); if (next) next(); else running--; }
}

async function optimize(bytes: Uint8Array, filename: string, type: string) {
  const validated = await validateBusinessImageUpload(bytes, filename, type);
  const original = { ...validated, bytes, originalBytes: bytes.byteLength, savedBytes: 0 };
  if (type === "image/webp") return original;
  const options = { failOn: "error" as const, limitInputPixels: 24_000_000 };
  const metadata = await sharp(bytes, options).metadata();
  // Preserve high-bit-depth, animated and non-RGB originals rather than flattening them.
  if ((metadata.pages ?? 1) > 1 || metadata.depth !== "uchar" || !["srgb", "rgb"].includes(metadata.space)
    || metadata.width! > 16383 || metadata.height! > 16383) return original;
  try {
    const output = await sharp(bytes, options).keepIccProfile()
      .withExif({ IFD0: { Orientation: String(metadata.orientation ?? 1) } })
      .webp({ lossless: true, effort: 4 }).timeout({ seconds: 20 }).toBuffer();
    if (output.byteLength >= bytes.byteLength) return { ...original, candidateBytes: output.byteLength };
    return { bytes: output, contentType: "image/webp" as const, extension: ".webp",
      filename: safeOriginalImageFilename(filename, "image/webp"), originalBytes: bytes.byteLength,
      savedBytes: bytes.byteLength - output.byteLength, candidateBytes: output.byteLength };
  } catch {
    // Do not change the chosen format on a transient failure: retries must
    // produce the same immutable object key after an uncertain storage write.
    throw new Error("Image optimization could not finish. Retry this photo.");
  }
}
