import { NextResponse } from "next/server";
import { z } from "zod";

import { mapPrismaSchemaError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { failure, success } from "@/lib/response";
import { formatZodIssues } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const outletIdSchema = z.string().cuid("ID outlet tidak valid.");

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const parsedId = outletIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "ID outlet tidak valid.", {
        issues: formatZodIssues(parsedId.error),
      }),
      { status: 400 },
    );
  }

  try {
    const outlet = await prisma.outlet.findUnique({
      where: { id: parsedId.data },
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
