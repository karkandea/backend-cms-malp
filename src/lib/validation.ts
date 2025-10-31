import type { Prisma } from "@prisma/client";
import { OutletStatus, PrismaClient } from "@prisma/client";
import slugify from "slugify";
import { z, type ZodError } from "zod";

import { ValidationErrorResponse, type ValidationIssue } from "@/lib/api-error";

const SLUGIFY_OPTIONS = {
  lower: true,
  strict: true,
  trim: true,
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeSlug(value: string): string {
  const raw = value.trim();
  const slug = slugify(raw, SLUGIFY_OPTIONS).replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!slug) {
    throw new ValidationErrorResponse({
      code: "INVALID_SLUG",
      message: "Slug tidak boleh kosong.",
      field: "slug",
    });
  }
  return slug;
}

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) {
    throw new ValidationErrorResponse({
      code: "INVALID_PHONE_E164",
      message: "Nomor telepon wajib diisi.",
      field: "phone",
    });
  }

  if (!trimmed.startsWith("+")) {
    throw new ValidationErrorResponse({
      code: "INVALID_PHONE_E164",
      message: "Gunakan format E.164, contoh +628123456789.",
      field: "phone",
    });
  }

  const normalized = `+${trimmed
    .slice(1)
    .replace(/[^\d]/g, "")}`;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new ValidationErrorResponse({
      code: "INVALID_PHONE_E164",
      message: "Nomor telepon harus mengikuti format E.164 dan berisi 8-15 digit.",
      field: "phone",
    });
  }

  return normalized;
}

type LatLngKind = "lat" | "lng";

function decimalsCount(value: string) {
  const [, fraction] = value.split(".");
  return fraction ? fraction.length : 0;
}

export function parseLatLng(raw: unknown, kind: LatLngKind): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  const value = typeof raw === "number" ? raw.toString() : String(raw).trim();
  if (value.length === 0) {
    return null;
  }

  if (!/^-?\d+(\.\d+)?$/.test(value)) {
    throw new ValidationErrorResponse({
      code: kind === "lat" ? "INVALID_LAT" : "INVALID_LNG",
      message: `${kind === "lat" ? "Latitude" : "Longitude"} harus berupa angka.`,
      field: kind,
    });
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new ValidationErrorResponse({
      code: kind === "lat" ? "INVALID_LAT" : "INVALID_LNG",
      message: `${kind === "lat" ? "Latitude" : "Longitude"} tidak valid.`,
      field: kind,
    });
  }

  if (Math.abs(numeric) >= 1000) {
    throw new ValidationErrorResponse({
      code: "LAT_LNG_INVALID_UNIT",
      message: "Gunakan derajat, bukan meter. Contoh: lat -6.200000, lng 106.816666.",
      field: kind,
    });
  }

  const limit = kind === "lat" ? 90 : 180;
  if (numeric < -limit || numeric > limit) {
    throw new ValidationErrorResponse({
      code: kind === "lat" ? "OUT_OF_RANGE_LAT" : "OUT_OF_RANGE_LNG",
      message: `${kind === "lat" ? "Latitude" : "Longitude"} harus di antara ${-limit} dan ${limit} derajat`,
      field: kind,
    });
  }

  if (decimalsCount(value) > 6) {
    throw new ValidationErrorResponse({
      code: "PRECISION_EXCEEDED",
      message: `${kind === "lat" ? "Latitude" : "Longitude"} maksimal 6 angka di belakang koma.`,
      field: kind,
    });
  }

  return numeric.toFixed(6);
}

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export async function assertUniqueSlug(prisma: PrismaClientLike, slug: string, outletId?: string) {
  const existing = await prisma.outlet.findFirst({
    where: outletId
      ? {
          slug,
          id: {
            not: outletId,
          },
        }
      : { slug },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new ValidationErrorResponse({
      code: "CONFLICT",
      message: "Slug sudah digunakan, gunakan slug lain.",
      field: "slug",
    });
  }
}

export async function assertActivationRules(prisma: PrismaClientLike, outletId: string) {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: {
      name: true,
      slug: true,
      address: true,
      lat: true,
      lng: true,
      openingHours: {
        select: { id: true },
        take: 1,
      },
      roomCategories: {
        select: {
          id: true,
          images: {
            select: { id: true },
            take: 1,
          },
        },
        take: 1,
      },
      menuImages: {
        select: { id: true },
        take: 1,
      },
      feature: {
        select: {
          wifiMbps: true,
          outletsCount: true,
          wifiLevel: true,
          socketAvailability: true,
          acLevel: true,
          musholaLevel: true,
          toiletLevel: true,
          _count: {
            select: {
              musholaItems: true,
              toiletItems: true,
            },
          },
        },
      },
    },
  });

  if (!outlet) {
    throw new ValidationErrorResponse({
      code: "NOT_FOUND",
      message: "Outlet tidak ditemukan.",
    });
  }

  const missing: string[] = [];

  if (!outlet.name || !outlet.slug || !outlet.address || !outlet.lat || !outlet.lng) {
    missing.push("data umum wajib (nama, slug, alamat, koordinat)");
  }

  if (outlet.openingHours.length === 0) {
    missing.push("jam operasional");
  }

  const hasRoomWithImage =
    outlet.roomCategories.length > 0 && outlet.roomCategories[0]?.images.length > 0;
  const hasMenuImage = outlet.menuImages.length > 0;
  const feature = outlet.feature;
  const hasFeature =
    !!feature &&
    [
      feature.wifiMbps,
      feature.outletsCount,
      feature.wifiLevel,
      feature.socketAvailability,
      feature.acLevel,
      feature.musholaLevel,
      feature.toiletLevel,
      feature._count?.musholaItems,
      feature._count?.toiletItems,
    ].some((value) => value !== null && value !== undefined);

  if (!hasRoomWithImage && !hasMenuImage && !hasFeature) {
    missing.push("minimal satu fasilitas, menu, atau foto ruang");
  }

  if (missing.length > 0) {
    throw new ValidationErrorResponse({
      code: "ACTIVATION_RULE_VIOLATION",
      message: `Outlet belum memenuhi syarat untuk status active (${missing.join(", ")}).`,
    });
  }
}

export function ensureDraftStatus(status?: OutletStatus | null): OutletStatus {
  if (status && status !== OutletStatus.DRAFT) {
    throw new ValidationErrorResponse({
      code: "ACTIVATION_RULE_VIOLATION",
      message: "Outlet baru hanya dapat dibuat dengan status draft.",
      field: "status",
    });
  }
  return OutletStatus.DRAFT;
}

export function formatZodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
    code: issue.code,
  }));
}

export const paginationQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .transform((value) => value.trim())
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
