# Milestone 1 — Data Foundations

## Table Overview
- `User` — core account identity with role enum, unique lowercase email, password hash, audit timestamps.
- `Session` — CMS cookie store (`expiresAt`, optional metadata, `revokedAt`), cascades on user deletion.
- `RefreshSession` — mobile JWT refresh artifacts with hashed token, family/rotation metadata, device fingerprinting, revoke tracking.
- `AuditLog` — immutable history of write actions (actor, entity, payload before/after, client fingerprint).
- `Country` / `Province` / `City` — three-level area hierarchy with soft delete, slug and name uniqueness scoped per parent.
- `Outlet` — primary business entity with geo coords (`DECIMAL(9,6)`), price tier, lifecycle flags, authorship, and soft delete.
- `OpeningHour` — day-of-week schedule (`TIME`) unique per outlet/day.
- `Feature` / `Amenity` / `Entertainment` — single-row outlet companions covering facility metrics, amenities, and experience notes.
- `RoomCategory` → `RoomImage` — room type enum plus image metadata (storage key, bucket, dimensions, blurhash, checksum).
- `MenuImage` — outlet-level imagery for menu items (same metadata shape as room image).
- `Banner` — promotional assets partitioned by platform, order, status, lifecycle window, and soft delete.

## Key Relations
- `Province.countryId → Country.id` (cascade), `City.provinceId → Province.id` (cascade).
- `Outlet.cityId → City.id` (`RESTRICT`), optional `createdById` / `updatedById` references `User`.
- Single-row outlet companions enforced via unique FKs (`Feature`, `Amenity`, `Entertainment`).
- `OpeningHour.outletId` cascade; unique `(outletId, day)` ensures one schedule per day.
- `RoomCategory.outletId` cascade; `RoomImage.roomCategoryId` cascade.
- `MenuImage.outletId` cascade; duplicates cleared in seed to stay idempotent.
- `Session.userId` / `RefreshSession.userId` cascade; `AuditLog.actorId` set null to preserve records if user removed.

## Indexing Highlights
- Uniqueness: `User.email`, `Country.slug/name`, `Province(countryId, slug|name)`, `City(provinceId, slug|name)`, `Outlet.slug`, `OpeningHour(outletId, day)`, single-row outlet tables.
- Lookup: `City.name`, `Outlet.cityId`, `Outlet.status`, `Outlet(lat,lng)` btree, `Banner(platform, order)`, `Banner.status`, `Banner.deletedAt`, temporal indexes on sessions/tokens/images.

## Soft Delete Strategy
- `deletedAt` on `Country`, `Province`, `City`, `Outlet`, `Banner`. APIs should filter on `deletedAt IS NULL` by default while allowing admin overrides.

## Local Workflow
1. Ensure `DATABASE_URL` points to your dev Postgres (use `.env` or override per shell).
2. Generate SQL (already in `prisma/migrations/20241030000000_init/migration.sql`) or apply via Prisma:
   - `pnpm prisma migrate deploy` (prod/CI) or `pnpm prisma migrate dev --name init` (interactive dev).
3. Seed required fixtures: `pnpm prisma db seed`.
4. Inspect using `pnpm prisma studio` (verify owner/admin, area hierarchy, outlet companions).

## Seed Snapshot
- Owner: `owner@malp.app` / `Owner@123!` (argon2id).
- Admin: `admin@malp.app` / `Admin@123!`.
- Area: Indonesia → {DKI Jakarta, Jawa Barat} with four example cities.
- Outlet: “Kopi Contoh” masih berstatus draft, jam operasional Senin 08:00–21:00, fitur Wi-Fi 50 Mbps terisi sehingga siap diaktivasi setelah gambar/menu tersedia.

## Environment Variables
- `DATABASE_URL` — required for Prisma Client, migrations, and seeding.
- `DIRECT_URL` — direct connection string (non-pooled) for migrations/Prisma Studio.
- Supabase & auth secrets (`SUPABASE_*`, `UPSTASH_*`, `JWT_*`, `CMS_SESSION_SECRET`, `APP_BASE_URL`) remain unchanged from existing `.env`; Prisma ignores unset values.

## Re-run & Rollback Notes
- Schema is forward-compatible with `prisma migrate deploy` on fresh databases.
- Seed script uses upserts and scoped deletes to stay idempotent; rerunning updates hashes/metadata without duplicating child records.
