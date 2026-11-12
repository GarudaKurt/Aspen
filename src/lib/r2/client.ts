import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Config = {
  endpoint: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
};

let client: S3Client | undefined;

function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint = process.env.R2_ENDPOINT?.replace(/\/$/, "") ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
  const bucketName = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!endpoint || !bucketName || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 is not configured on the server.");
  }
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".r2.cloudflarestorage.com") || url.pathname !== "/") {
    throw new Error("R2_ENDPOINT must be the account S3 endpoint, without a bucket path.");
  }
  return { endpoint, bucketName, accessKeyId, secretAccessKey, publicUrl };
}

function getClient() {
  if (!client) {
    const config = getR2Config();
    client = new S3Client({
      region: "auto",
      requestChecksumCalculation: "WHEN_REQUIRED",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return client;
}

export function getR2BucketName() {
  return getR2Config().bucketName;
}

export function getR2PublicUrl(objectKey: string) {
  const publicUrl = getR2Config().publicUrl;
  return publicUrl ? `${publicUrl}/${objectKey}` : undefined;
}

export async function createR2UploadUrl(
  objectKey: string,
  contentType: string,
  expiresIn = 600,
) {
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: objectKey,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), command, { expiresIn });
}

export async function createR2DownloadUrl(objectKey: string, expiresIn = 300) {
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: objectKey,
  });
  return getSignedUrl(getClient(), command, { expiresIn });
}

export async function readR2Object(objectKey: string) {
  const response = await getClient().send(
    new GetObjectCommand({ Bucket: getR2BucketName(), Key: objectKey }),
  );
  if (!response.Body) throw new Error("The uploaded object has no content.");
  const bytes = await response.Body.transformToByteArray();
  return {
    bytes,
    contentType: response.ContentType ?? "",
    contentLength: Number(response.ContentLength ?? bytes.byteLength),
  };
}

export async function headR2Object(objectKey: string) {
  return getClient().send(
    new HeadObjectCommand({ Bucket: getR2BucketName(), Key: objectKey }),
  );
}

export async function deleteR2Object(objectKey: string) {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: objectKey }),
  );
}

export async function putR2Photo(objectKey: string, bytes: Uint8Array, contentType: string) {
  await getClient().send(new PutObjectCommand({
    Bucket: getR2BucketName(), Key: objectKey, Body: bytes, ContentType: contentType,
    CacheControl: "private, max-age=300", ContentDisposition: "inline",
  }));
}

function getStagingBucket() {
  const bucket = process.env.R2_UPLOAD_BUCKET_NAME;
  if (!bucket || bucket === getR2BucketName()) {
    throw new Error("Configure a separate private R2_UPLOAD_BUCKET_NAME for photo uploads.");
  }
  return bucket;
}

export async function createPhotoStagingUrl(key: string, contentType: string, byteSize: number) {
  return getSignedUrl(getClient(), new PutObjectCommand({ Bucket: getStagingBucket(), Key: key, ContentType: contentType, ContentLength: byteSize }), {
    expiresIn: 600, signableHeaders: new Set(["content-type", "content-length"]),
  });
}

/** Stop before buffering an oversized object, including when Content-Length lies. */
export async function readStagedPhoto(key: string, expectedBytes: number) {
  const Bucket = getStagingBucket();
  const head = await getClient().send(new HeadObjectCommand({ Bucket, Key: key }));
  if (head.ContentLength !== expectedBytes || !head.ETag) throw new Error("Uploaded image size does not match the upload ticket.");
  const response = await getClient().send(new GetObjectCommand({ Bucket, Key: key, IfMatch: head.ETag }));
  if (!response.Body) throw new Error("The uploaded image is empty.");
  const reader = response.Body.transformToWebStream().getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > expectedBytes) throw new Error("Uploaded image exceeds its allowed size.");
      chunks.push(value);
    }
    if (total !== expectedBytes) throw new Error("The uploaded image is incomplete.");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  return Buffer.concat(chunks, total);
}

export async function deleteStagedPhoto(key: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: getStagingBucket(), Key: key }));
}

export async function finalizedPhotoMatches(key: string, byteSize: number, sha256: string) {
  try {
    const object = await headR2Object(key);
    if (object.ContentLength !== byteSize || object.Metadata?.sha256 !== sha256) throw new Error("The upload ID is already associated with a different image.");
    return true;
  } catch (cause) {
    if ((cause as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
    throw cause;
  }
}

/** Only validated original bytes reach the final bucket. Never overwrite a final key. */
export async function putValidatedPhoto(key: string, bytes: Uint8Array, contentType: string, sha256: string) {
  try {
    await getClient().send(new PutObjectCommand({
      Bucket: getR2BucketName(), Key: key, Body: bytes, ContentType: contentType,
      IfNoneMatch: "*", Metadata: { sha256 }, CacheControl: "private, max-age=300", ContentDisposition: "inline",
    }));
  } catch (cause) {
    if ((cause as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 412) throw cause;
    if (!(await finalizedPhotoMatches(key, bytes.byteLength, sha256))) throw cause;
  }
}
