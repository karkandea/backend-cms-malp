-- Create new enum types if they do not exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WifiLevel') THEN
    CREATE TYPE "WifiLevel" AS ENUM ('SLOW', 'STABLE', 'FAST');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SocketAvailability') THEN
    CREATE TYPE "SocketAvailability" AS ENUM ('LIMITED', 'SELECT_TABLES', 'EACH_TABLE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AcCoolLevel') THEN
    CREATE TYPE "AcCoolLevel" AS ENUM ('COOL', 'MEDIUM', 'NOT_COOL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MusholaItem') THEN
    CREATE TYPE "MusholaItem" AS ENUM ('SEJADAH', 'ALQURAN', 'SARUNG', 'MUKENA');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ToiletItem') THEN
    CREATE TYPE "ToiletItem" AS ENUM ('TISU', 'SEMPROTAN', 'WASTAFEL', 'PEMBALUT');
  END IF;
END $$;

-- Prepare Feature table for new fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Feature' AND column_name = 'acLevel'
  ) THEN
    EXECUTE 'ALTER TABLE "Feature" RENAME COLUMN "acLevel" TO "acLevelLegacy"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Feature' AND column_name = 'socketAvail'
  ) THEN
    EXECUTE 'ALTER TABLE "Feature" RENAME COLUMN "socketAvail" TO "socketAvailability"';
  END IF;
END $$;

ALTER TABLE "Feature"
  ADD COLUMN IF NOT EXISTS "wifiLevel" "WifiLevel",
  ADD COLUMN IF NOT EXISTS "socketAvailability" "SocketAvailability",
  ADD COLUMN IF NOT EXISTS "acLevel" "AcCoolLevel";

-- Migrate existing AC level data into the new enum when possible
UPDATE "Feature"
SET "acLevel" = CASE
  WHEN "acLevelLegacy" = 'HIGH' THEN 'COOL'::"AcCoolLevel"
  WHEN "acLevelLegacy" = 'MEDIUM' THEN 'MEDIUM'::"AcCoolLevel"
  WHEN "acLevelLegacy" = 'LOW' THEN 'NOT_COOL'::"AcCoolLevel"
  WHEN "acLevelLegacy" = 'NONE' THEN NULL
  ELSE NULL
END
WHERE "acLevelLegacy" IS NOT NULL AND "acLevel" IS NULL;

-- Drop the legacy column if it still exists
ALTER TABLE "Feature" DROP COLUMN IF EXISTS "acLevelLegacy";

-- Junction tables for mushola & toilet multi-select values
CREATE TABLE IF NOT EXISTS "FeatureMusholaItem" (
  "id" TEXT PRIMARY KEY,
  "featureId" TEXT NOT NULL,
  "item" "MusholaItem" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureMusholaItem_featureId_fkey"
    FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureMusholaItem_featureId_item_key"
  ON "FeatureMusholaItem"("featureId", "item");
CREATE INDEX IF NOT EXISTS "FeatureMusholaItem_item_idx" ON "FeatureMusholaItem"("item");

CREATE TABLE IF NOT EXISTS "FeatureToiletItem" (
  "id" TEXT PRIMARY KEY,
  "featureId" TEXT NOT NULL,
  "item" "ToiletItem" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureToiletItem_featureId_fkey"
    FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureToiletItem_featureId_item_key"
  ON "FeatureToiletItem"("featureId", "item");
CREATE INDEX IF NOT EXISTS "FeatureToiletItem_item_idx" ON "FeatureToiletItem"("item");

-- Master tag tables
CREATE TABLE IF NOT EXISTS "RoomAmenityTag" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "MusicAmenityTag" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "FoodPreferenceTag" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "ParkingTag" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Junction tables tying tags to outlets
CREATE TABLE IF NOT EXISTS "OutletRoomAmenity" (
  "id" TEXT PRIMARY KEY,
  "outletId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutletRoomAmenity_outletId_fkey"
    FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OutletRoomAmenity_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "RoomAmenityTag"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OutletRoomAmenity_outletId_tagId_key"
  ON "OutletRoomAmenity"("outletId", "tagId");
CREATE INDEX IF NOT EXISTS "OutletRoomAmenity_tagId_idx" ON "OutletRoomAmenity"("tagId");

CREATE TABLE IF NOT EXISTS "OutletMusicAmenity" (
  "id" TEXT PRIMARY KEY,
  "outletId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutletMusicAmenity_outletId_fkey"
    FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OutletMusicAmenity_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "MusicAmenityTag"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OutletMusicAmenity_outletId_tagId_key"
  ON "OutletMusicAmenity"("outletId", "tagId");
CREATE INDEX IF NOT EXISTS "OutletMusicAmenity_tagId_idx" ON "OutletMusicAmenity"("tagId");

CREATE TABLE IF NOT EXISTS "OutletFoodPreference" (
  "id" TEXT PRIMARY KEY,
  "outletId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutletFoodPreference_outletId_fkey"
    FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OutletFoodPreference_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "FoodPreferenceTag"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OutletFoodPreference_outletId_tagId_key"
  ON "OutletFoodPreference"("outletId", "tagId");
CREATE INDEX IF NOT EXISTS "OutletFoodPreference_tagId_idx" ON "OutletFoodPreference"("tagId");

CREATE TABLE IF NOT EXISTS "OutletParkingOption" (
  "id" TEXT PRIMARY KEY,
  "outletId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutletParkingOption_outletId_fkey"
    FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OutletParkingOption_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "ParkingTag"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "OutletParkingOption_outletId_tagId_key"
  ON "OutletParkingOption"("outletId", "tagId");
CREATE INDEX IF NOT EXISTS "OutletParkingOption_tagId_idx" ON "OutletParkingOption"("tagId");

-- Outlet slug history
CREATE TABLE IF NOT EXISTS "OutletSlugHistory" (
  "id" TEXT PRIMARY KEY,
  "outletId" TEXT NOT NULL,
  "oldSlug" TEXT NOT NULL,
  "newSlug" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutletSlugHistory_outletId_fkey"
    FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OutletSlugHistory_oldSlug_idx" ON "OutletSlugHistory"("oldSlug");
CREATE INDEX IF NOT EXISTS "OutletSlugHistory_outletId_idx" ON "OutletSlugHistory"("outletId");
