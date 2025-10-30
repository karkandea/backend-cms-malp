import { NextResponse } from "next/server";
import { mapPrismaSchemaError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { failure, success } from "@/lib/response";
import { formatZodIssues, paginationQuerySchema } from "@/lib/validation";

export async function GET(request) {
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
        name: {
          contains: search,
          mode: "insensitive",
        },
      }
    : undefined;

  try {
    const [total, items] = await Promise.all([
      prisma.city.count({ where }),
      prisma.city.findMany({
        where,
        include: {
          province: {
            include: {
              country: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data = items.map((city) => ({
      id: city.id,
      city: city.name,
      province: city.province?.name ?? "-",
      country: city.province?.country?.name ?? "-",
    }));

    return NextResponse.json(
      success({
        items: data,
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

    console.error("[areas:get]", error);
    return NextResponse.json(failure("INTERNAL_ERROR", "Terjadi kesalahan saat mengambil data area."), {
      status: 500,
    });
  }
}
