import { NextResponse } from "next/server";
import {
  AcCoolLevel,
  MusholaItem,
  RoomCategoryType,
  SocketAvailability,
  ToiletItem,
  WifiLevel,
} from "@prisma/client";
import { z } from "zod";

import { ValidationErrorResponse } from "@/lib/api-error";
import { requireCmsSession } from "@/lib/auth/session";
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

const nonEmptyStringArray = z
  .array(z.string().trim().min(1))
  .optional()
  .transform((value) => (value ? Array.from(new Set(value.map((item) => item.trim()))) : []));

const imagePayloadSchema = z.object({
  id: z.string().cuid().optional(),
  url: z.string().url(),
  storageKey: z.string().trim().min(1),
  bucket: z.string().trim().min(1),
  mime: z.string().trim().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  blurhash: z.string().optional(),
  checksum: z.string().optional(),
});

const roomCategoryPayloadSchema = z.object({
  id: z.string().cuid().optional(),
  type: z.nativeEnum(RoomCategoryType),
  description: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  images: z.array(imagePayloadSchema).optional().default([]),
});

const facilityPayloadSchema = z.object({
  roomAmenities: nonEmptyStringArray.default([]),
  musicEntertainments: nonEmptyStringArray.default([]),
  foodPreferences: nonEmptyStringArray.default([]),
  parkingOptions: nonEmptyStringArray.default([]),
  features: z
    .object({
      wifiLevel: z.nativeEnum(WifiLevel).nullable().optional(),
      socketAvailability: z.nativeEnum(SocketAvailability).nullable().optional(),
      acLevel: z.nativeEnum(AcCoolLevel).nullable().optional(),
      musholaItems: z.array(z.nativeEnum(MusholaItem)).optional().default([]),
      toiletItems: z.array(z.nativeEnum(ToiletItem)).optional().default([]),
    })
    .optional()
    .default({}),
  menuImages: z.array(imagePayloadSchema).optional().default([]),
  roomCategories: z.array(roomCategoryPayloadSchema).optional().default([]),
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
  const session = await requireCmsSession();
  if (!session) {
    return NextResponse.json(
      failure("UNAUTHORIZED", "Silakan masuk terlebih dahulu."),
      { status: 401 },
    );
  }

  try {
    const outletId = await resolveOutletId(context);
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      select: {
        id: true,
        name: true,
        feature: {
          include: {
            musholaItems: true,
            toiletItems: true,
          },
        },
        roomAmenities: {
          include: {
            tag: true,
          },
        },
        musicAmenities: {
          include: {
            tag: true,
          },
        },
        foodPreferences: {
          include: {
            tag: true,
          },
        },
        parkingOptions: {
          include: {
            tag: true,
          },
        },
        menuImages: {
          select: {
            id: true,
            url: true,
            storageKey: true,
            bucket: true,
            mime: true,
            width: true,
            height: true,
            blurhash: true,
            checksum: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        roomCategories: {
          select: {
            id: true,
            type: true,
            description: true,
            images: {
              select: {
                id: true,
                url: true,
                storageKey: true,
                bucket: true,
                mime: true,
                width: true,
                height: true,
                blurhash: true,
                checksum: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    });

    if (!outlet) {
      return NextResponse.json(
        failure("NOT_FOUND", "Outlet tidak ditemukan."),
        { status: 404 },
      );
    }

    return NextResponse.json(
      success({
        outletId: outlet.id,
        name: outlet.name,
        roomAmenities: outlet.roomAmenities.map((item) => item.tag.name),
        musicEntertainments: outlet.musicAmenities.map((item) => item.tag.name),
        foodPreferences: outlet.foodPreferences.map((item) => item.tag.name),
        parkingOptions: outlet.parkingOptions.map((item) => item.tag.name),
        features: {
          wifiLevel: outlet.feature?.wifiLevel ?? null,
          socketAvailability: outlet.feature?.socketAvailability ?? null,
          acLevel: outlet.feature?.acLevel ?? null,
          musholaItems: outlet.feature?.musholaItems.map((item) => item.item) ?? [],
          toiletItems: outlet.feature?.toiletItems.map((item) => item.item) ?? [],
        },
        menuImages: outlet.menuImages,
        roomCategories: outlet.roomCategories.map((category) => ({
          id: category.id,
          type: category.type,
          description: category.description,
          images: category.images,
        })),
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

    console.error("[outlets:facility:get]", error);
    return NextResponse.json(failure("INTERNAL_ERROR", "Gagal mengambil fasilitas outlet."), {
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

    const parsed = facilityPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        failure("VALIDATION_ERROR", "Input tidak valid.", {
          issues: formatZodIssues(parsed.error),
        }),
        { status: 400 },
      );
    }

    const {
      roomAmenities,
      musicEntertainments,
      foodPreferences,
      parkingOptions,
      features,
      menuImages,
      roomCategories,
    } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.findUnique({
        where: { id: outletId },
        select: { id: true },
      });

      if (!outlet) {
        throw new ValidationErrorResponse({
          code: "NOT_FOUND",
          message: "Outlet tidak ditemukan.",
        });
      }

      // Feature + multi-select items
      const featureRecord = await tx.feature.upsert({
        where: { outletId },
        create: {
          outletId,
          wifiLevel: features.wifiLevel ?? null,
          socketAvailability: features.socketAvailability ?? null,
          acLevel: features.acLevel ?? null,
          musholaLevel: null,
          toiletLevel: null,
          wifiMbps: null,
          outletsCount: null,
        },
        update: {
          wifiLevel: features.wifiLevel ?? null,
          socketAvailability: features.socketAvailability ?? null,
          acLevel: features.acLevel ?? null,
        },
        include: {
          musholaItems: true,
          toiletItems: true,
        },
      });

      await tx.featureMusholaItem.deleteMany({
        where: { featureId: featureRecord.id },
      });
      if (features.musholaItems?.length) {
        await tx.featureMusholaItem.createMany({
          data: features.musholaItems.map((item) => ({
            featureId: featureRecord.id,
            item,
          })),
        });
      }

      await tx.featureToiletItem.deleteMany({
        where: { featureId: featureRecord.id },
      });
      if (features.toiletItems?.length) {
        await tx.featureToiletItem.createMany({
          data: features.toiletItems.map((item) => ({
            featureId: featureRecord.id,
            item,
          })),
        });
      }

      // Helper to sync tag relations
      async function syncTags<T extends { id: string; name: string }>(
        tagNames: string[],
        opts: {
          upsertTag: (name: string) => Promise<T>;
          deleteMany: (tagIds: string[]) => Promise<void>;
          ensureRelation: (tagId: string) => Promise<void>;
        },
      ) {
        const uniqueNames = Array.from(new Set(tagNames.map((item) => item.trim()).filter(Boolean)));
        const tags: T[] = [];
        for (const name of uniqueNames) {
          const tag = await opts.upsertTag(name);
          tags.push(tag);
        }

        if (tags.length === 0) {
          await opts.deleteMany([]);
          return;
        }

        const keepIds = tags.map((tag) => tag.id);
        await opts.deleteMany(keepIds);

        for (const tag of tags) {
          await opts.ensureRelation(tag.id);
        }
      }

      await syncTags(roomAmenities, {
        upsertTag: (name) =>
          tx.roomAmenityTag.upsert({
            where: { name },
            update: {},
            create: { name },
          }),
        deleteMany: async (keepIds) => {
          if (keepIds.length === 0) {
            await tx.outletRoomAmenity.deleteMany({
              where: { outletId },
            });
          } else {
            await tx.outletRoomAmenity.deleteMany({
              where: {
                outletId,
                tagId: {
                  notIn: keepIds,
                },
              },
            });
          }
        },
        ensureRelation: (tagId) =>
          tx.outletRoomAmenity.upsert({
            where: {
              outletId_tagId: {
                outletId,
                tagId,
              },
            },
            update: {},
            create: {
              outletId,
              tagId,
            },
          }),
      });

      await syncTags(musicEntertainments, {
        upsertTag: (name) =>
          tx.musicAmenityTag.upsert({
            where: { name },
            update: {},
            create: { name },
          }),
        deleteMany: async (keepIds) => {
          if (keepIds.length === 0) {
            await tx.outletMusicAmenity.deleteMany({
              where: { outletId },
            });
          } else {
            await tx.outletMusicAmenity.deleteMany({
              where: {
                outletId,
                tagId: {
                  notIn: keepIds,
                },
              },
            });
          }
        },
        ensureRelation: (tagId) =>
          tx.outletMusicAmenity.upsert({
            where: {
              outletId_tagId: {
                outletId,
                tagId,
              },
            },
            update: {},
            create: {
              outletId,
              tagId,
            },
          }),
      });

      await syncTags(foodPreferences, {
        upsertTag: (name) =>
          tx.foodPreferenceTag.upsert({
            where: { name },
            update: {},
            create: { name },
          }),
        deleteMany: async (keepIds) => {
          if (keepIds.length === 0) {
            await tx.outletFoodPreference.deleteMany({
              where: { outletId },
            });
          } else {
            await tx.outletFoodPreference.deleteMany({
              where: {
                outletId,
                tagId: {
                  notIn: keepIds,
                },
              },
            });
          }
        },
        ensureRelation: (tagId) =>
          tx.outletFoodPreference.upsert({
            where: {
              outletId_tagId: {
                outletId,
                tagId,
              },
            },
            update: {},
            create: {
              outletId,
              tagId,
            },
          }),
      });

      await syncTags(parkingOptions, {
        upsertTag: (name) =>
          tx.parkingTag.upsert({
            where: { name },
            update: {},
            create: { name },
          }),
        deleteMany: async (keepIds) => {
          if (keepIds.length === 0) {
            await tx.outletParkingOption.deleteMany({
              where: { outletId },
            });
          } else {
            await tx.outletParkingOption.deleteMany({
              where: {
                outletId,
                tagId: {
                  notIn: keepIds,
                },
              },
            });
          }
        },
        ensureRelation: (tagId) =>
          tx.outletParkingOption.upsert({
            where: {
              outletId_tagId: {
                outletId,
                tagId,
              },
            },
            update: {},
            create: {
              outletId,
              tagId,
            },
          }),
      });

      // Menu images sync
      const existingMenuImages = await tx.menuImage.findMany({
        where: { outletId },
        select: { id: true },
      });
      const existingMenuImageIds = new Set(existingMenuImages.map((item) => item.id));
      const incomingMenuIds = new Set(menuImages.map((image) => image.id).filter(Boolean) as string[]);

      const toDeleteMenu = existingMenuImages
        .map((item) => item.id)
        .filter((id) => !incomingMenuIds.has(id));

      if (toDeleteMenu.length > 0) {
        await tx.menuImage.deleteMany({
          where: {
            outletId,
            id: {
              in: toDeleteMenu,
            },
          },
        });
      }

      for (const image of menuImages) {
        if (image.id) {
          if (!existingMenuImageIds.has(image.id)) {
            throw new ValidationErrorResponse({
              code: "VALIDATION_ERROR",
              message: "Menu image tidak valid untuk outlet ini.",
            });
          }

          await tx.menuImage.update({
            where: { id: image.id },
            data: {
              url: image.url,
              storageKey: image.storageKey,
              bucket: image.bucket,
              mime: image.mime,
              width: image.width,
              height: image.height,
              blurhash: image.blurhash ?? null,
              checksum: image.checksum ?? null,
            },
          });
        } else {
          await tx.menuImage.create({
            data: {
              outletId,
              url: image.url,
              storageKey: image.storageKey,
              bucket: image.bucket,
              mime: image.mime,
              width: image.width,
              height: image.height,
              blurhash: image.blurhash ?? null,
              checksum: image.checksum ?? null,
            },
          });
        }
      }

      // Room categories & images
      await tx.roomCategory.deleteMany({
        where: { outletId },
      });

      const uniqueRoomCategories = Array.from(
        new Map(roomCategories.map((category) => [category.type, category])).values(),
      );

      for (const category of uniqueRoomCategories) {
        const createdCategory = await tx.roomCategory.create({
          data: {
            outletId,
            type: category.type,
            description: category.description ?? null,
          },
        });

        if (category.images?.length) {
          await tx.roomImage.createMany({
            data: category.images.map((image) => ({
              roomCategoryId: createdCategory.id,
              url: image.url,
              storageKey: image.storageKey,
              bucket: image.bucket,
              mime: image.mime,
              width: image.width,
              height: image.height,
              blurhash: image.blurhash ?? null,
              checksum: image.checksum ?? null,
            })),
          });
        }
      }
    });

    return NextResponse.json(success(true));
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

    console.error("[outlets:facility:put]", error);
    return NextResponse.json(failure("INTERNAL_ERROR", "Gagal memperbarui fasilitas outlet."), {
      status: 500,
    });
  }
}
