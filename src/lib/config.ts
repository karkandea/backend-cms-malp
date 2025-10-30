const isProduction = process.env.NODE_ENV === "production";

function invariant(value: string | undefined, name: string, fallback?: string) {
  if (!value || value.length === 0) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value;
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "t", "yes", "y"].includes(normalized);
}

function parseInteger(value: string | undefined, defaultValue: number) {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseDurationToSeconds(value: string | undefined, defaultSeconds: number) {
  if (!value) return defaultSeconds;

  const trimmed = value.trim().toLowerCase();
  const durationMatch = trimmed.match(/^(\d+)(s|m|h|d)?$/);
  if (!durationMatch) {
    const numeric = Number.parseInt(trimmed, 10);
    return Number.isFinite(numeric) ? numeric : defaultSeconds;
  }

  const amount = Number.parseInt(durationMatch[1], 10);
  const unit = durationMatch[2] ?? "s";

  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      return defaultSeconds;
  }
}

function parseRateLimit(value: string | undefined, fallback: { limit: number; windowSeconds: number }) {
  if (!value) return fallback;

  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)\s*([/:])\s*(\d+|[smhd])$/);

  if (match) {
    const limit = Number.parseInt(match[1], 10);
    if (!Number.isFinite(limit)) {
      return fallback;
    }

    const windowRaw = match[3];
    let windowSeconds = fallback.windowSeconds;
    if (["s", "m", "h", "d"].includes(windowRaw)) {
      windowSeconds = parseDurationToSeconds(`1${windowRaw}`, fallback.windowSeconds);
    } else {
      windowSeconds = Number.parseInt(windowRaw, 10);
      if (!Number.isFinite(windowSeconds)) {
        windowSeconds = fallback.windowSeconds;
      }
    }

    return { limit, windowSeconds };
  }

  const simpleMatch = trimmed.match(/^(\d+)\s*per\s*(s|sec|second|m|min|minute|h|hour|d|day)$/);
  if (simpleMatch) {
    const limit = Number.parseInt(simpleMatch[1], 10);
    const unitMap: Record<string, number> = {
      s: 1,
      sec: 1,
      second: 1,
      m: 60,
      min: 60,
      minute: 60,
      h: 3600,
      hour: 3600,
      d: 86400,
      day: 86400,
    };
    const windowSeconds = unitMap[simpleMatch[2]] ?? fallback.windowSeconds;
    return { limit, windowSeconds };
  }

  return fallback;
}

export const authConfig = {
  session: {
    cookieName: invariant(process.env.SESSION_COOKIE_NAME, "SESSION_COOKIE_NAME", "malp_session"),
    secret: invariant(
      process.env.SESSION_SECRET,
      "SESSION_SECRET",
      isProduction ? undefined : "malp-dev-session-secret",
    ),
    maxAgeDays: parseInteger(process.env.SESSION_MAX_AGE_DAYS, 7),
    secure: parseBoolean(process.env.COOKIE_SECURE, isProduction),
    sameSite: (process.env.COOKIE_SAMESITE ?? "lax").toLowerCase() as "lax" | "strict" | "none",
  },
  jwt: {
    accessSecret: invariant(
      process.env.JWT_ACCESS_SECRET,
      "JWT_ACCESS_SECRET",
      isProduction ? undefined : "malp-dev-access-secret",
    ),
    refreshSecret: invariant(
      process.env.JWT_REFRESH_SECRET,
      "JWT_REFRESH_SECRET",
      isProduction ? undefined : "malp-dev-refresh-secret",
    ),
    accessExpiresInSeconds: parseDurationToSeconds(process.env.JWT_ACCESS_EXPIRES, 15 * 60),
    refreshExpiresInSeconds: parseDurationToSeconds(process.env.JWT_REFRESH_EXPIRES, 30 * 24 * 60 * 60),
  },
  rateLimit: {
    login: parseRateLimit(process.env.RATE_LIMIT_LOGIN, { limit: 5, windowSeconds: 60 }),
    refresh: parseRateLimit(process.env.RATE_LIMIT_REFRESH, { limit: 30, windowSeconds: 60 }),
  },
};

export const appConfig = {
  env: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
  baseUrl: process.env.APP_URL ?? "http://localhost:3000",
};

function envWithSuffix(name: string, suffix: string, fallback?: string) {
  const key = `${name}_${suffix}`;
  return invariant(process.env[key], key, fallback);
}

const storageEnvSuffix = isProduction ? "PROD" : "DEV";

export const storageConfig = {
  endpoint: envWithSuffix(
    "SUPABASE_STORAGE_ENDPOINT",
    storageEnvSuffix,
  ),
  accessKey: envWithSuffix("SUPABASE_STORAGE_ACCESS_KEY", storageEnvSuffix),
  secretKey: envWithSuffix("SUPABASE_STORAGE_SECRET_KEY", storageEnvSuffix),
  bucket: envWithSuffix("SUPABASE_STORAGE_BUCKET", storageEnvSuffix),
  region: envWithSuffix("SUPABASE_STORAGE_REGION", storageEnvSuffix, "us-east-1"),
  publicUrlBase: `${envWithSuffix("SUPABASE_URL", storageEnvSuffix)}/storage/v1/object/public`,
};
