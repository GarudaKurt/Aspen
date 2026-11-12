export const MAX_BUSINESS_PHOTOS = 12;
// Shared build-time policy. The database enforces the 20 MiB safety ceiling.
const configuredMiB = Number(process.env.NEXT_PUBLIC_MAX_PHOTO_MIB ?? 15);
export const MAX_PHOTO_BYTES = (Number.isInteger(configuredMiB) && configuredMiB >= 1 && configuredMiB <= 20 ? configuredMiB : 15) * 1024 * 1024;
export const PHOTO_SIZE_LABEL = `${MAX_PHOTO_BYTES / 1024 / 1024} MiB`;
// Compatibility endpoints still proxy bytes through Vercel. New clients use R2.
export const MAX_PROXY_PHOTO_BYTES = 4 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type BusinessPhoto = { id: string; url: string; name: string; isCover: boolean };

export function validateBusinessPhoto(file: { size: number; type: string; name?: string }) {
  if (!PHOTO_TYPES.some((type) => type === file.type)) return "Choose a JPEG, PNG, or WebP image.";
  if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) return `Each photo must be between 1 byte and ${PHOTO_SIZE_LABEL}.`;
  if (file.name !== undefined) {
    const extensions: Record<string, RegExp> = { "image/jpeg": /\.(jpe?g)$/i, "image/png": /\.png$/i, "image/webp": /\.webp$/i };
    if (!extensions[file.type]?.test(file.name)) return "The file extension must match its JPEG, PNG, or WebP format.";
  }
  return null;
}
