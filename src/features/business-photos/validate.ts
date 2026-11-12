import "server-only";
import sharp from "sharp";
import { detectMediaType } from "@/features/media/validation";
import { MAX_PHOTO_BYTES, PHOTO_SIZE_LABEL } from "./types";

const MAX_INPUT_PIXELS = 24_000_000;

const imageFormats = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
} as const;

export type SupportedBusinessPhotoType = keyof typeof imageFormats;

export class BusinessPhotoValidationError extends Error {
  constructor(message = `Choose a valid JPEG, PNG, or WebP image up to ${PHOTO_SIZE_LABEL}.`) {
    super(message);
  }
}

function isSupportedType(type: string): type is SupportedBusinessPhotoType {
  return type in imageFormats;
}

function extensionOf(filename: string) {
  const normalized = filename.replace(/\\/g, "/").split("/").at(-1) ?? "";
  const match = /\.[a-z0-9]+$/i.exec(normalized);
  return match?.[0].toLowerCase() ?? "";
}

/**
 * Produces safe metadata only. Object paths never include a user supplied name.
 */
export function safeOriginalImageFilename(filename: string, type: SupportedBusinessPhotoType) {
  const rawName = filename.replace(/\\/g, "/").split("/").at(-1) ?? "";
  const baseName = rawName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9._ -]/gi, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240) || "business-photo";
  const extension = extensionOf(rawName);
  const safeExtension = imageFormats[type].includes(extension as never) ? extension : imageFormats[type][0];
  return `${baseName}${safeExtension}`.slice(0, 255);
}

export function imageExtensionFor(type: SupportedBusinessPhotoType) {
  return imageFormats[type][0];
}

/**
 * Verifies the declared type, magic bytes, filename extension, and a full image
 * decode. The original bytes are intentionally returned untouched: this module
 * validates uploads; it never resizes, recompresses, rotates, or converts them.
 */
export async function validateBusinessImageUpload(bytes: Uint8Array, filename: string, declaredType: string) {
  if (!bytes.byteLength || bytes.byteLength > MAX_PHOTO_BYTES) throw new BusinessPhotoValidationError();
  if (!isSupportedType(declaredType)) throw new BusinessPhotoValidationError();
  if (!imageFormats[declaredType].includes(extensionOf(filename) as never)) {
    throw new BusinessPhotoValidationError("The file extension does not match its image format.");
  }
  if (detectMediaType(bytes) !== declaredType) {
    throw new BusinessPhotoValidationError("The file contents do not match its image format.");
  }

  try {
    const image = sharp(bytes, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS });
    const metadata = await image.metadata();
    const expectedFormat = declaredType === "image/jpeg" ? "jpeg" : declaredType.slice("image/".length);
    if (!metadata.width || !metadata.height || metadata.format !== expectedFormat) throw new Error("Invalid dimensions or format");
    // Force a complete decode. Its transient output is discarded, while the
    // exact original byte stream is what is uploaded to R2.
    await image.toBuffer();
  } catch {
    throw new BusinessPhotoValidationError("The image file is corrupted or could not be decoded.");
  }

  return {
    contentType: declaredType,
    extension: imageExtensionFor(declaredType),
    filename: safeOriginalImageFilename(filename, declaredType),
  };
}
