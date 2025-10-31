import { randomUUID } from "node:crypto";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { storageConfig } from "@/lib/config";

type SignedUploadInput = {
  key: string;
  contentType: string;
  contentLength: number;
  cacheControl?: string;
  expiresInSeconds?: number;
};

const s3Client = new S3Client({
  region: storageConfig.region,
  endpoint: storageConfig.endpoint,
  credentials: {
    accessKeyId: storageConfig.accessKey,
    secretAccessKey: storageConfig.secretKey,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "never",
  checksumValidation: "never",
});

export type OutletAssetKind = "logo" | "banner" | "menu" | "room";

export function buildOutletAssetKey(kind: OutletAssetKind, fileExtension: string) {
  const safeExtension = fileExtension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `outlets/${kind}/${randomUUID()}.${safeExtension}`;
}

export function getPublicUrlForKey(key: string) {
  return `${storageConfig.publicUrlBase}/${storageConfig.bucket}/${key}`;
}

export async function createSignedUploadUrl({
  key,
  contentType,
  contentLength: _contentLength,
  cacheControl = "public, max-age=31536000, immutable",
  expiresInSeconds = 60 * 5,
}: SignedUploadInput) {
  const command = new PutObjectCommand({
    Bucket: storageConfig.bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: cacheControl,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    uploadUrl,
    publicUrl: getPublicUrlForKey(key),
  };
}
