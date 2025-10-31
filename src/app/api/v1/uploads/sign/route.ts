import { NextResponse } from "next/server";
import { z } from "zod";

import { mapPrismaSchemaError } from "@/lib/errors";
import { failure, success } from "@/lib/response";
import { formatZodIssues } from "@/lib/validation";
import { storageConfig } from "@/lib/config";
import { buildOutletAssetKey, createSignedUploadUrl, type OutletAssetKind } from "@/lib/storage";

const MAX_SIZES: Record<OutletAssetKind, number> = {
  logo: 1 * 1024 * 1024, // 1 MB
  banner: 3 * 1024 * 1024, // 3 MB
  menu: 3 * 1024 * 1024, // 3 MB
  room: 5 * 1024 * 1024, // 5 MB
};

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);

const requestSchema = z.object({
  kind: z.enum(["logo", "banner", "menu", "room"]),
  contentType: z.string().min(1),
  contentLength: z.number().int().positive(),
  originalName: z.string().min(1).max(255).optional(),
});

function getExtensionFromContentType(contentType: string) {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    default:
      return null;
  }
}

export async function POST(request: Request) {
  const payload = await request
    .json()
    .catch(() => null);

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Permintaan tidak valid.", {
        issues: formatZodIssues(parsed.error),
      }),
      { status: 400 },
    );
  }

  const { kind, contentLength, contentType, originalName } = parsed.data;

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      failure("UNSUPPORTED_TYPE", "Format file tidak didukung. Gunakan PNG atau JPG."),
      { status: 400 },
    );
  }

  const maxSize = MAX_SIZES[kind];
  if (contentLength > maxSize) {
    return NextResponse.json(
      failure("FILE_TOO_LARGE", `Ukuran file melebihi batas ${Math.floor(maxSize / (1024 * 1024))} MB.`),
      { status: 400 },
    );
  }

  const extensionFromType = getExtensionFromContentType(contentType);
  const extensionFromName = originalName?.split(".").pop();
  const extension = (extensionFromType ?? extensionFromName ?? "bin").toLowerCase();

  try {
    const key = buildOutletAssetKey(kind, extension);
    const { uploadUrl, publicUrl } = await createSignedUploadUrl({
      key,
      contentType,
      contentLength,
    });

    return NextResponse.json(
      success({
        uploadUrl,
        publicUrl,
        storageKey: key,
        bucket: storageConfig.bucket,
        key,
      }),
    );
  } catch (error) {
    const schemaError = mapPrismaSchemaError(error);
    if (schemaError) {
      return NextResponse.json(
        failure("SERVICE_UNAVAILABLE", schemaError.message),
        { status: 503 },
      );
    }

    console.error("[uploads:sign]", error);
    return NextResponse.json(failure("INTERNAL_ERROR", "Tidak dapat membuat URL unggah."), {
      status: 500,
    });
  }
}
