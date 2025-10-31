import { OutletStatus, PriceTier } from "@prisma/client";
import { z } from "zod";

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format waktu harus HH:MM");

const baseShape = {
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
};

function buildOutletSchema({ includeStatus = false }: { includeStatus?: boolean } = {}) {
  const shape = includeStatus
    ? { ...baseShape, status: z.nativeEnum(OutletStatus).optional() }
    : baseShape;

  return z
    .object(shape)
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
}

export const createOutletSchema = buildOutletSchema({ includeStatus: true });
export const updateOutletSchema = buildOutletSchema();

export function timeOfDay(time: string) {
  const [hour, minute] = time.split(":").map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
}
