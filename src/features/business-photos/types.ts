export const MAX_BUSINESS_PHOTOS = 12;
// Leave room for multipart headers under Vercel's 4.5 MB request limit.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type BusinessPhoto = { id: string; url: string; name: string; isCover: boolean };

export function validateBusinessPhoto(file: { size: number; type: string }) {
  if (!PHOTO_TYPES.some((type) => type === file.type)) return "Choose a JPEG, PNG, or WebP image.";
  if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) return "Each photo must be between 1 byte and 4 MB.";
  return null;
}
