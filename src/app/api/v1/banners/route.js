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
        title: {
          contains: search,
          mode: "insensitive",
        },
      }
    : undefined;

  try {
    const [total, items] = await Promise.all([
      prisma.banner.count({ where }),
      prisma.banner.findMany({
        where,
        orderBy: [
          {
            order: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
        skip: (page - 1) * pageSize,
       take: pageSize,
     }),
   ]);

    const data = items.map((banner) => ({
      id: banner.id,
      title: banner.title ?? "Untitled Banner",
      imageUrl: banner.imageUrl,
      status: banner.status,
      startsAt: banner.startsAt,
      endsAt: banner.endsAt,
      order: banner.order,
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

    console.error("[banners:get]", error);
    return NextResponse.json(failure("INTERNAL_ERROR", "Terjadi kesalahan saat mengambil data banner."), {
      status: 500,
    });
  }
}
