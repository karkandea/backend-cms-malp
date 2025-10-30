import { PrismaClient, UserRole, OutletStatus, PriceTier, FeatureLevel, BannerPlatform, BannerStatus } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const PASSWORD_OPTIONS = {
  type: argon2.argon2id,
  timeCost: 3,
  memoryCost: 64 * 1024,
  parallelism: 1,
};

const PROVINCES = [
  {
    name: "DKI Jakarta",
    slug: "dki-jakarta",
    cities: [
      { name: "Jakarta Selatan", slug: "jakarta-selatan" },
      { name: "Jakarta Pusat", slug: "jakarta-pusat" },
    ],
  },
  {
    name: "Jawa Barat",
    slug: "jawa-barat",
    cities: [
      { name: "Bandung", slug: "bandung" },
      { name: "Bekasi", slug: "bekasi" },
    ],
  },
];

const USERS = [
  {
    email: "owner@malp.app",
    name: "MALP Owner",
    role: UserRole.OWNER,
    password: "Owner@123!",
  },
  {
    email: "admin@malp.app",
    name: "MALP Admin",
    role: UserRole.ADMIN,
    password: "Admin@123!",
  },
];

function timeOfDay(hour: number, minute: number) {
  const date = new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
  return date;
}

async function main() {
  console.info("Seeding MALP baseline data...");

  const passwordHashes = await Promise.all(
    USERS.map((user) =>
      argon2.hash(user.password, PASSWORD_OPTIONS),
    ),
  );

  await prisma.$transaction(async (tx) => {
    const country = await tx.country.upsert({
      where: { slug: "indonesia" },
      update: {
        name: "Indonesia",
        deletedAt: null,
      },
      create: {
        name: "Indonesia",
        slug: "indonesia",
      },
    });

    const provinceMap = new Map<string, { id: string; cities: Map<string, string> }>();

    for (const provinceData of PROVINCES) {
      const province = await tx.province.upsert({
        where: {
          countryId_slug: {
            countryId: country.id,
            slug: provinceData.slug,
          },
        },
        update: {
          name: provinceData.name,
          deletedAt: null,
        },
        create: {
          countryId: country.id,
          name: provinceData.name,
          slug: provinceData.slug,
        },
      });

      const cityMap = new Map<string, string>();

      for (const cityData of provinceData.cities) {
        const city = await tx.city.upsert({
          where: {
            provinceId_slug: {
              provinceId: province.id,
              slug: cityData.slug,
            },
          },
          update: {
            name: cityData.name,
            deletedAt: null,
          },
          create: {
            provinceId: province.id,
            name: cityData.name,
            slug: cityData.slug,
          },
        });

        cityMap.set(cityData.slug, city.id);
      }

      provinceMap.set(provinceData.slug, { id: province.id, cities: cityMap });
    }

    const users = await Promise.all(
      USERS.map((user, index) =>
        tx.user.upsert({
          where: { email: user.email.toLowerCase() },
          update: {
            name: user.name,
            role: user.role,
            passwordHash: passwordHashes[index],
          },
          create: {
            email: user.email.toLowerCase(),
            name: user.name,
            role: user.role,
            passwordHash: passwordHashes[index],
          },
        }),
      ),
    );

    const owner = users.find((user) => user.role === UserRole.OWNER);
    if (!owner) {
      throw new Error("Owner account was not created correctly.");
    }

    const jakartaSelatanId =
      provinceMap.get("dki-jakarta")?.cities.get("jakarta-selatan");
    if (!jakartaSelatanId) {
      throw new Error("Jakarta Selatan city lookup failed during seed.");
    }

    const outlet = await tx.outlet.upsert({
      where: { slug: "kopi-contoh" },
      update: {
        name: "Kopi Contoh",
        phone: "+62-812-0000-0000",
        address: "Jl. Contoh No. 1, Jakarta Selatan",
        lat: "-6.2451",
        lng: "106.8006",
        priceTier: PriceTier.MEDIUM,
        status: OutletStatus.DRAFT,
        cityId: jakartaSelatanId,
        createdById: owner.id,
        updatedById: owner.id,
        logoUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&h=400&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?w=1200&fit=crop",
        deletedAt: null,
      },
      create: {
        name: "Kopi Contoh",
        slug: "kopi-contoh",
        phone: "+62-812-0000-0000",
        address: "Jl. Contoh No. 1, Jakarta Selatan",
        lat: "-6.2451",
        lng: "106.8006",
        priceTier: PriceTier.MEDIUM,
        status: OutletStatus.DRAFT,
        cityId: jakartaSelatanId,
        createdById: owner.id,
        updatedById: owner.id,
        logoUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&h=400&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?w=1200&fit=crop",
      },
    });

    await tx.openingHour.upsert({
      where: {
        outletId_day: {
          outletId: outlet.id,
          day: 1,
        },
      },
      update: {
        open: timeOfDay(8, 0),
        close: timeOfDay(21, 0),
      },
      create: {
        outletId: outlet.id,
        day: 1,
        open: timeOfDay(8, 0),
        close: timeOfDay(21, 0),
      },
    });

    await tx.feature.upsert({
      where: { outletId: outlet.id },
      update: {
        wifiMbps: 50,
        acLevel: FeatureLevel.MEDIUM,
      },
      create: {
        outletId: outlet.id,
        wifiMbps: 50,
        acLevel: FeatureLevel.MEDIUM,
      },
    });

    await tx.banner.upsert({
      where: { id: "seed-banner-soft-opening" },
      update: {
        platform: BannerPlatform.WEB,
        status: BannerStatus.DRAFT,
        title: "Promo Soft Opening",
        imageUrl: "banners/soft-opening.jpg",
        order: 1,
        deletedAt: null,
      },
      create: {
        id: "seed-banner-soft-opening",
        platform: BannerPlatform.WEB,
        status: BannerStatus.DRAFT,
        title: "Promo Soft Opening",
        imageUrl: "banners/soft-opening.jpg",
        order: 1,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: owner.id,
        action: "seed:init",
        entity: "system",
        entityId: "init",
        after: { version: "v1-seed" },
        ip: "127.0.0.1",
        userAgent: "seed-script",
      },
    });
  });

  console.info("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
