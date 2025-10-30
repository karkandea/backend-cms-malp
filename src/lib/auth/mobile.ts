import crypto from "node:crypto";
import { customAlphabet } from "nanoid";
import { UserRole } from "@prisma/client";
import { prisma } from "../prisma";
import { verifyCredentials } from "./user";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt";
import { createAuditLog } from "../audit";
import {
  checkRateLimit,
  getMobileLoginRateLimitConfig,
  getMobileRefreshRateLimitConfig,
} from "../rate-limit";
import { isPrismaSchemaNotReadyError, mapPrismaSchemaError } from "../errors";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 32);

type TokenBaseParams = {
  ip?: string;
  userAgent?: string | null;
  deviceMeta?: Record<string, unknown> | null;
};

type MobileTokenSuccess = {
  status: "ok";
  data: {
    accessToken: string;
    accessExpiresAt: Date;
    refreshToken: string;
    refreshExpiresAt: Date;
    refreshId: string;
    familyId: string;
  };
};

type MobileTokenFailure = {
  status: "error";
  code: string;
  message: string;
  httpStatus: number;
  retryAfterSeconds?: number;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function timingSafeEqualHex(a: string, b: string) {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export async function issueMobileTokens(
  params: { email: string; password: string } & TokenBaseParams,
): Promise<MobileTokenSuccess | MobileTokenFailure> {
  const email = params.email.trim().toLowerCase();
  const ip = params.ip ?? "unknown";
  const userAgent = params.userAgent ?? null;
  const deviceMeta = params.deviceMeta ?? (ip || userAgent ? { ip, userAgent } : null);

  const { limit, windowSeconds } = getMobileLoginRateLimitConfig();
  const rateResult = await checkRateLimit({
    key: `mobile-token:${ip}:${email}`,
    limit,
    windowSeconds,
  });

  if (!rateResult.success) {
    await createAuditLog({
      action: "auth.token.rate_limited",
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
      };
    }
    const schemaError = mapPrismaSchemaError(error);
    if (schemaError) {
      return {
        status: "error",
        code: "SERVICE_UNAVAILABLE",
        message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
        httpStatus: 503,
      };
    }
    throw error;
  }
  if (!user) {
    await createAuditLog({
      action: "auth.token.failed",
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

  const familyId = nanoid();
  const refreshId = nanoid();

  const access = await signAccessToken({ userId: user.id, role: user.role as UserRole });
  const refresh = await signRefreshToken({
    userId: user.id,
    familyId,
    refreshId,
    rotation: 0,
  });

  try {
    await prisma.refreshSession.create({
      data: {
        id: refreshId,
        familyId,
        userId: user.id,
        hashedToken: hashToken(refresh.token),
        rotation: 0,
        expiresAt: new Date(refresh.expiresAt * 1000),
        deviceMeta: deviceMeta,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return {
        status: "error",
        code: "SERVICE_UNAVAILABLE",
        message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
        httpStatus: 503,
      };
    }
    const schemaError = mapPrismaSchemaError(error);
    if (schemaError) {
      return {
        status: "error",
        code: "SERVICE_UNAVAILABLE",
        message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
        httpStatus: 503,
      };
    }
    throw error;
  }

  await createAuditLog({
    actorId: user.id,
    action: "auth.token_issued",
    entity: "auth",
    entityId: familyId,
    after: { rotation: 0 },
    ip,
    userAgent,
  });

  return {
    status: "ok",
    data: {
      accessToken: access.token,
      accessExpiresAt: new Date(access.expiresAt * 1000),
      refreshToken: refresh.token,
      refreshExpiresAt: new Date(refresh.expiresAt * 1000),
      refreshId,
      familyId,
    },
  };
}

export async function rotateMobileTokens(
  params: { refreshToken: string } & TokenBaseParams,
): Promise<MobileTokenSuccess | MobileTokenFailure> {
  const ip = params.ip ?? "unknown";
  const userAgent = params.userAgent ?? null;
  const deviceMeta = params.deviceMeta ?? (ip || userAgent ? { ip, userAgent } : null);

  let payload;
  try {
    payload = await verifyRefreshToken(params.refreshToken);
  } catch (error) {
    return {
      status: "error",
      code: "INVALID_REFRESH",
      message: "Refresh token tidak valid.",
      httpStatus: 401,
    };
  }

  if (!payload.jti || !payload.sid) {
    return {
      status: "error",
      code: "INVALID_REFRESH",
      message: "Refresh token tidak valid.",
      httpStatus: 401,
    };
  }

  const refreshId = payload.jti;
  const rotationCount = typeof payload.rot === "number" ? payload.rot : 0;
  const familyId = String(payload.sid);

  const { limit, windowSeconds } = getMobileRefreshRateLimitConfig();
  const rateResult = await checkRateLimit({
    key: `mobile-refresh:${refreshId}`,
    limit,
    windowSeconds,
  });

  if (!rateResult.success) {
    await createAuditLog({
      action: "auth.refresh.rate_limited",
      entity: "auth",
      entityId: refreshId,
      after: { retryAt: rateResult.resetAt.toISOString() },
      ip,
      userAgent,
    });

    return {
      status: "error",
      code: "RATE_LIMITED",
      message: "Terlalu sering melakukan refresh. Coba lagi nanti.",
      httpStatus: 429,
      retryAfterSeconds: Math.ceil((rateResult.resetAt.getTime() - Date.now()) / 1000),
    };
  }

  let existing;
  try {
    existing = await prisma.refreshSession.findUnique({
      where: { id: refreshId },
      include: { user: true },
    });
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return {
        status: "error",
        code: "SERVICE_UNAVAILABLE",
        message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
        httpStatus: 503,
      };
    }
    const schemaError = mapPrismaSchemaError(error);
    if (schemaError) {
      return {
        status: "error",
        code: "SERVICE_UNAVAILABLE",
        message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
        httpStatus: 503,
      };
    }
    throw error;
  }

  if (
    !existing ||
    existing.revokedAt ||
    existing.familyId !== familyId ||
    existing.rotation !== rotationCount ||
    existing.expiresAt.getTime() <= Date.now() ||
    !timingSafeEqualHex(existing.hashedToken, hashToken(params.refreshToken))
  ) {
    try {
      await prisma.refreshSession.updateMany({
        where: {
          familyId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } catch (error) {
      if (isPrismaSchemaNotReadyError(error)) {
        return {
          status: "error",
          code: "SERVICE_UNAVAILABLE",
          message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
          httpStatus: 503,
        };
      }
      const schemaError = mapPrismaSchemaError(error);
      if (schemaError) {
        return {
          status: "error",
          code: "SERVICE_UNAVAILABLE",
          message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
          httpStatus: 503,
        };
      }
      throw error;
    }

    await createAuditLog({
      action: "auth.token_revoked_family",
      entity: "auth",
      entityId: familyId,
      after: { reason: "invalid_refresh_detected" },
      ip,
      userAgent,
    });

    return {
      status: "error",
      code: "INVALID_REFRESH",
      message: "Refresh token tidak valid atau sudah digunakan.",
      httpStatus: 401,
    };
  }

  const nextRotation = existing.rotation + 1;
  const nextRefreshId = nanoid();

  const access = await signAccessToken({
    userId: existing.userId,
    role: existing.user.role as UserRole,
  });

  const refresh = await signRefreshToken({
    userId: existing.userId,
    familyId,
    refreshId: nextRefreshId,
    rotation: nextRotation,
  });

  try {
    await prisma.$transaction([
      prisma.refreshSession.update({
        where: { id: refreshId },
        data: {
          revokedAt: new Date(),
        },
      }),
      prisma.refreshSession.create({
        data: {
          id: nextRefreshId,
          familyId,
          userId: existing.userId,
          hashedToken: hashToken(refresh.token),
          rotation: nextRotation,
          expiresAt: new Date(refresh.expiresAt * 1000),
          deviceMeta: deviceMeta,
          ip,
          userAgent,
        },
      }),
    ]);
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return {
        status: "error",
        code: "SERVICE_UNAVAILABLE",
        message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
        httpStatus: 503,
      };
    }
    const schemaError = mapPrismaSchemaError(error);
    if (schemaError) {
      return {
        status: "error",
        code: "SERVICE_UNAVAILABLE",
        message: "Database belum diinisialisasi. Jalankan migrasi dan seed terlebih dahulu.",
        httpStatus: 503,
      };
    }
    throw error;
  }

  await createAuditLog({
    actorId: existing.userId,
    action: "auth.token_refreshed",
    entity: "auth",
    entityId: familyId,
    after: { rotation: nextRotation },
    ip,
    userAgent,
  });

  return {
    status: "ok",
    data: {
      accessToken: access.token,
      accessExpiresAt: new Date(access.expiresAt * 1000),
      refreshToken: refresh.token,
      refreshExpiresAt: new Date(refresh.expiresAt * 1000),
      refreshId: nextRefreshId,
      familyId,
    },
  };
}
