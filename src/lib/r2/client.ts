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
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
};

let client: S3Client | undefined;

function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 is not configured on the server.");
  }
  return { accountId, bucketName, accessKeyId, secretAccessKey, publicUrl };
}

function getClient() {
  if (!client) {
    const config = getR2Config();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
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
