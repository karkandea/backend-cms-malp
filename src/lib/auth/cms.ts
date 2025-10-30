import type { User } from "@prisma/client";
import { checkRateLimit, getCmsLoginRateLimitConfig } from "../rate-limit";
import { verifyCredentials } from "./user";
import { createSession } from "./session";
import { createAuditLog } from "../audit";
import { isPrismaSchemaNotReadyError, mapPrismaSchemaError } from "../errors";

export type CmsLoginParams = {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string | null;
};

export type CmsLoginSuccess = {
  status: "ok";
  user: User;
  sessionId: string;
  cookieValue: string;
};

export type CmsLoginFailure = {
  status: "error";
  code: string;
  message: string;
  httpStatus: number;
  retryAfterSeconds?: number;
  details?: unknown;
};

export async function cmsLogin(params: CmsLoginParams): Promise<CmsLoginSuccess | CmsLoginFailure> {
  const email = params.email.trim().toLowerCase();
  const ip = params.ip ?? "unknown";
  const userAgent = params.userAgent ?? null;

  const { limit, windowSeconds } = getCmsLoginRateLimitConfig();
  const rateKey = `cms-login:${ip}:${email}`;
  const rateResult = await checkRateLimit({ key: rateKey, limit, windowSeconds });

  if (!rateResult.success) {
    await createAuditLog({
      action: "auth.login.rate_limited",
      entity: "auth",
      entityId: email,
      after: { retryAt: rateResult.resetAt.toISOString() },
      ip,
      userAgent,
    });

    return {
      status: "error",
      code: "RATE_LIMITED",
      message: "Terlalu banyak percobaan login. Coba lagi nanti.",
      httpStatus: 429,
      retryAfterSeconds: Math.ceil((rateResult.resetAt.getTime() - Date.now()) / 1000),
    };
  }

  let user;
  try {
    user = await verifyCredentials(email, params.password);
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return {
        status: "error",
        code: "SERVICE_UNAVAILABLE",
        message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
        httpStatus: 503,
        details: { reason: error.message },
      };
    }
    const schemaError = mapPrismaSchemaError(error);
    if (schemaError) {
      return {
        status: "error",
        code: "SERVICE_UNAVAILABLE",
        message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
        httpStatus: 503,
        details: { reason: schemaError.message },
      };
    }
    throw error;
  }

  if (!user) {
    await createAuditLog({
      action: "auth.login.failed",
      entity: "auth",
      entityId: email,
      after: { reason: "invalid_credentials" },
      ip,
      userAgent,
    });

    return {
      status: "error",
      code: "INVALID_CREDENTIALS",
      message: "Email atau password salah.",
      httpStatus: 401,
    };
  }

  let session;
  try {
    session = await createSession({
      userId: user.id,
      ip,
      userAgent,
    });
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return {
        status: "error",
        code: "SERVICE_UNAVAILABLE",
        message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
        httpStatus: 503,
        details: { reason: error.message },
      };
    }
    const schemaError = mapPrismaSchemaError(error);
    if (schemaError) {
      return {
        status: "error",
        code: "SERVICE_UNAVAILABLE",
        message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
        httpStatus: 503,
        details: { reason: schemaError.message },
      };
    }
    throw error;
  }

  await createAuditLog({
    actorId: user.id,
    action: "auth.login",
    entity: "auth",
    entityId: session.session.id,
    after: { status: "success" },
    ip,
    userAgent,
  });

  return {
    status: "ok",
    user,
    sessionId: session.session.id,
    cookieValue: session.cookieValue,
  };
}
