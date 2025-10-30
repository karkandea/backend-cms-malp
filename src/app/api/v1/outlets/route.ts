import { NextResponse } from "next/server";
import { OutletStatus, PriceTier } from "@prisma/client";
import { z } from "zod";

import { ApiErrorResponse, ValidationErrorResponse } from "@/lib/api-error";
import { requireCmsSession } from "@/lib/auth/session";
import { mapPrismaSchemaError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { failure, success } from "@/lib/response";
import {
  assertUniqueSlug,
  ensureDraftStatus,
  formatZodIssues,
  normalizePhone,
  normalizeSlug,
  paginationQuerySchema,
  parseLatLng,
} from "@/lib/validation";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format waktu harus HH:MM");

const createOutletSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama outlet minimal 2 karakter.")
      .max(100, "Nama outlet maksimal 100 karakter."),
    slug: z
      .string()
      .trim()
      .min(2, "Slug minimal 2 karakter.")
      .max(100, "Slug maksimal 100 karakter.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya boleh huruf kecil, angka, dan strip (-)."),
    phone: z
      .string()
      .trim()
      .max(30, "Nomor telepon maksimal 30 karakter.")
      .optional()
      .transform((value) => (value === undefined || value.length === 0 ? undefined : value)),
    address: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value === undefined || value.length === 0 ? undefined : value)),
    priceTier: z.nativeEnum(PriceTier),
    cityId: z.string().cuid("Kota tidak valid."),
    lat: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) =>
        value === undefined || value === null || value === "" ? undefined : value,
      ),
    lng: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) =>
        value === undefined || value === null || value === "" ? undefined : value,
      ),
    logoUrl: z.string().url("URL logo tidak valid."),
    bannerUrl: z.string().url("URL banner tidak valid."),
    openHour: timeSchema,
    closeHour: timeSchema,
    status: z.nativeEnum(OutletStatus).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.address && data.address.length > 0 && data.address.length < 5) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Alamat minimal 5 karakter.",
      });
    }

    if (data.openHour >= data.closeHour) {
      ctx.addIssue({
        code: "custom",
        path: ["closeHour"],
        message: "Jam tutup harus setelah jam buka.",
      });
    }
  });

function timeOfDay(time: string) {
  const [hour, minute] = time.split(":").map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSearch = searchParams.get("search");
  const parsedQuery = paginationQuerySchema.safeParse({
    search: rawSearch && rawSearch.trim().length > 0 ? rawSearch : undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Parameter tidak valid.", {
        issues: formatZodIssues(parsedQuery.error),
      }),
      { status: 400 },
    );
  }

  const { search, page, pageSize } = parsedQuery.data;

  const where = search
    ? {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            city: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        ],
      }
    : undefined;

  try {
    const [total, items] = await Promise.all([
      prisma.outlet.count({ where }),
      prisma.outlet.findMany({
        where,
        include: {
          city: true,
        },
        orderBy: {
          name: "asc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json(
      success({
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          city: item.city?.name ?? "-",
          status: item.status,
          logoUrl: item.logoUrl,
        })),
        total,
        page,
        pageSize,
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

    console.error("[outlets:get]", error);
    return NextResponse.json(failure("INTERNAL_ERROR", "Terjadi kesalahan saat mengambil data outlet."), {
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  const session = await requireCmsSession();
  if (!session) {
    return NextResponse.json(
      failure("UNAUTHORIZED", "Silakan masuk terlebih dahulu."),
      { status: 401 },
    );
  }

  const payload = await request
    .json()
    .catch(() => null);

  const parsed = createOutletSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Input tidak valid.", {
        issues: formatZodIssues(parsed.error),
      }),
      { status: 400 },
    );
  }

  const {
    name,
    slug,
    phone,
    address,
    lat,
    lng,
    priceTier,
    cityId,
    logoUrl,
    bannerUrl,
    openHour,
    closeHour,
    status,
  } = parsed.data;

  try {
    const normalizedName = name.trim();
    const normalizedSlug = normalizeSlug(slug);
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    const normalizedAddress = address?.trim() ?? null;
    const normalizedLat = parseLatLng(lat, "lat");
    const normalizedLng = parseLatLng(lng, "lng");
    const outletStatus = ensureDraftStatus(status ?? OutletStatus.DRAFT);

    await assertUniqueSlug(prisma, normalizedSlug);

    const outlet = await prisma.$transaction(async (tx) => {
      const created = await tx.outlet.create({
        data: {
          name: normalizedName,
          slug: normalizedSlug,
          phone: normalizedPhone,
          address: normalizedAddress,
          lat: normalizedLat,
          lng: normalizedLng,
          priceTier,
          status: outletStatus,
          cityId,
          logoUrl,
          bannerUrl,
          createdById: session.userId,
          updatedById: session.userId,
        },
      });

      await tx.openingHour.upsert({
        where: {
          outletId_day: {
            outletId: created.id,
            day: 1,
          },
        },
        update: {
          open: timeOfDay(openHour),
          close: timeOfDay(closeHour),
        },
        create: {
          outletId: created.id,
          day: 1,
          open: timeOfDay(openHour),
          close: timeOfDay(closeHour),
        },
      });

      return created;
    });

    return NextResponse.json(
      success({
        id: outlet.id,
      }),
    );
  } catch (error: any) {
    if (error instanceof ValidationErrorResponse || error instanceof ApiErrorResponse) {
      return NextResponse.json(
        failure(error.code, error.message, {
          field: error.field,
          issues: error.issues,
        }),
        { status: error.status },
      );
    }

    const schemaError = mapPrismaSchemaError(error);
    if (schemaError) {
      return NextResponse.json(
        failure("SERVICE_UNAVAILABLE", schemaError.message),
        { status: 503 },
      );
    }

    if (error?.code === "P2002" && error?.meta?.target?.includes("slug")) {
      return NextResponse.json(
        failure("CONFLICT", "Slug sudah digunakan. Gunakan slug lain.", {
          field: "slug",
        }),
        { status: 409 },
      );
    }

    console.error("[outlets:create]", error);
    return NextResponse.json(failure("INTERNAL_ERROR", "Gagal membuat outlet baru."), {
      status: 500,
    });
  }
}
