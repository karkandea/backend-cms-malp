import { NextResponse } from "next/server";
import { OutletStatus } from "@prisma/client";
import { z } from "zod";

import { ApiErrorResponse, ValidationErrorResponse } from "@/lib/api-error";
import { requireCmsSession } from "@/lib/auth/session";
import { mapPrismaSchemaError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { failure, success } from "@/lib/response";
import {
  assertActivationRules,
  assertUniqueSlug,
  formatZodIssues,
  normalizePhone,
  normalizeSlug,
  parseLatLng,
} from "@/lib/validation";

import { timeOfDay, updateOutletSchema } from "../schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const outletIdSchema = z.string().cuid("ID outlet tidak valid.");

const statusSchema = z.object({
  status: z.nativeEnum(OutletStatus),
});

async function resolveOutletId(context: RouteContext) {
  const { id } = await context.params;
  const parsedId = outletIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw new ValidationErrorResponse({
      code: "VALIDATION_ERROR",
      message: "ID outlet tidak valid.",
      field: "id",
      issues: formatZodIssues(parsedId.error),
    });
  }
  return parsedId.data;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const outletId = await resolveOutletId(context);

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      include: {
        city: {
          include: {
            province: {
              include: {
                country: true,
              },
            },
          },
        },
        openingHours: {
          where: {
            day: 1,
          },
          take: 1,
        },
      },
    });

    if (!outlet) {
      return NextResponse.json(
        failure("NOT_FOUND", "Outlet tidak ditemukan."),
        { status: 404 },
      );
    }

    const openingHour = outlet.openingHours.at(0);

    return NextResponse.json(
      success({
        id: outlet.id,
        name: outlet.name,
        slug: outlet.slug,
        phone: outlet.phone,
        address: outlet.address,
        lat: outlet.lat,
        lng: outlet.lng,
        priceTier: outlet.priceTier,
        status: outlet.status,
        logoUrl: outlet.logoUrl,
        bannerUrl: outlet.bannerUrl,
        cityId: outlet.cityId,
        city: outlet.city?.name ?? null,
        province: outlet.city?.province?.name ?? null,
        country: outlet.city?.province?.country?.name ?? null,
        openingHour: openingHour
          ? {
              open: openingHour.open.toISOString().slice(11, 16),
              close: openingHour.close.toISOString().slice(11, 16),
            }
          : null,
      }),
    );
  } catch (error) {
    if (error instanceof ValidationErrorResponse) {
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

    console.error("[outlets:detail]", error);
    return NextResponse.json(failure("INTERNAL_ERROR", "Gagal mengambil detail outlet."), {
      status: 500,
    });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await requireCmsSession();
  if (!session) {
    return NextResponse.json(
      failure("UNAUTHORIZED", "Silakan masuk terlebih dahulu."),
      { status: 401 },
    );
  }

  try {
    const outletId = await resolveOutletId(context);

    const payload = await request.json().catch(() => null);

    const parsed = updateOutletSchema.safeParse(payload);
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
    } = parsed.data;

    const normalizedName = name.trim();
    const normalizedSlug = normalizeSlug(slug);
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    const normalizedAddress = address?.trim() ?? null;
    const normalizedLat = parseLatLng(lat, "lat");
    const normalizedLng = parseLatLng(lng, "lng");

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.outlet.findUnique({
        where: { id: outletId },
        select: {
          id: true,
          slug: true,
        },
      });

      if (!existing) {
        return null;
      }

      await assertUniqueSlug(tx, normalizedSlug, existing.id);

      const outlet = await tx.outlet.update({
        where: { id: outletId },
        data: {
          name: normalizedName,
          slug: normalizedSlug,
          phone: normalizedPhone,
          address: normalizedAddress,
          lat: normalizedLat,
          lng: normalizedLng,
          priceTier,
          cityId,
          logoUrl,
          bannerUrl,
          updatedById: session.userId,
        },
      });

      await tx.openingHour.upsert({
        where: {
          outletId_day: {
            outletId,
            day: 1,
          },
        },
        update: {
          open: timeOfDay(openHour),
          close: timeOfDay(closeHour),
        },
        create: {
          outletId,
          day: 1,
          open: timeOfDay(openHour),
          close: timeOfDay(closeHour),
        },
      });

      if (existing.slug !== normalizedSlug) {
        await tx.outletSlugHistory.create({
          data: {
            outletId,
            oldSlug: existing.slug,
            newSlug: normalizedSlug,
          },
        });
      }

      return outlet;
    });

    if (!updated) {
      return NextResponse.json(
        failure("NOT_FOUND", "Outlet tidak ditemukan."),
        { status: 404 },
      );
    }

    return NextResponse.json(
      success({
        id: updated.id,
        slug: updated.slug,
      }),
    );
  } catch (error) {
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

    console.error("[outlets:update]", error);
    return NextResponse.json(failure("INTERNAL_ERROR", "Gagal memperbarui outlet."), {
      status: 500,
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireCmsSession();
  if (!session) {
    return NextResponse.json(
      failure("UNAUTHORIZED", "Silakan masuk terlebih dahulu."),
      { status: 401 },
    );
  }

  try {
    const outletId = await resolveOutletId(context);
    const payload = await request.json().catch(() => null);

    const parsed = statusSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "Input tidak valid.", {
          issues: formatZodIssues(parsed.error),
        }),
        { status: 400 },
      );
    }

    const nextStatus = parsed.data.status;

    const updated = await prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.findUnique({
        where: { id: outletId },
        select: {
          id: true,
          status: true,
          activatedAt: true,
        },
      });

      if (!outlet) {
        return null;
      }

      if (outlet.status === nextStatus) {
        return outlet;
      }

      if (nextStatus === OutletStatus.ACTIVE) {
        await assertActivationRules(tx, outletId);
      }

      const activatedAt =
        nextStatus === OutletStatus.ACTIVE
          ? outlet.activatedAt ?? new Date()
          : null;

      return tx.outlet.update({
        where: { id: outletId },
        data: {
          status: nextStatus,
          activatedAt,
          updatedById: session.userId,
        },
        select: {
          id: true,
          status: true,
          activatedAt: true,
        },
      });
    });

    if (!updated) {
      return NextResponse.json(
        failure("NOT_FOUND", "Outlet tidak ditemukan."),
        { status: 404 },
      );
    }

    return NextResponse.json(
      success({
        id: updated.id,
        status: updated.status,
        activatedAt: updated.activatedAt,
      }),
    );
  } catch (error) {
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

    console.error("[outlets:status]", error);
    return NextResponse.json(failure("INTERNAL_ERROR", "Gagal memperbarui status outlet."), {
      status: 500,
    });
  }
}
