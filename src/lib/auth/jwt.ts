import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import type { UserRole } from "@prisma/client";
import { authConfig } from "../config";

const textEncoder = new TextEncoder();

const ACCESS_SECRET = textEncoder.encode(authConfig.jwt.accessSecret);
const REFRESH_SECRET = textEncoder.encode(authConfig.jwt.refreshSecret);

type AccessTokenPayload = {
  role: UserRole;
  typ: "access";
  ver: number;
};

type RefreshTokenPayload = {
  typ: "refresh";
  sid: string;
  rot: number;
};

export async function signAccessToken(params: { userId: string; role: UserRole }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + authConfig.jwt.accessExpiresInSeconds;

  const token = await new SignJWT({
    role: params.role,
    typ: "access",
    ver: 1,
  } satisfies AccessTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.userId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(ACCESS_SECRET);

  return { token, expiresAt };
}

export async function signRefreshToken(params: { userId: string; familyId: string; refreshId: string; rotation: number }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + authConfig.jwt.refreshExpiresInSeconds;

  const token = await new SignJWT({
    typ: "refresh",
    sid: params.familyId,
    rot: params.rotation,
  } satisfies RefreshTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.userId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .setJti(params.refreshId)
    .sign(REFRESH_SECRET);

  return { token, expiresAt };
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, ACCESS_SECRET, {
    algorithms: ["HS256"],
  });

  if ((payload as JWTPayload & { typ?: string }).typ !== "access") {
    throw new Error("Invalid token type");
  }

  return payload as JWTPayload & AccessTokenPayload;
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, REFRESH_SECRET, {
    algorithms: ["HS256"],
  });

  if ((payload as JWTPayload & { typ?: string }).typ !== "refresh") {
    throw new Error("Invalid refresh token type");
  }

  return payload as JWTPayload & RefreshTokenPayload;
}
