import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { authConfig } from "../config";
import { prisma } from "../prisma";
import { throwIfPrismaSchemaMissing } from "../errors";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 32);

function sign(value: string) {
  return crypto.createHmac("sha256", authConfig.session.secret).update(value).digest("hex");
}

function encodeSessionId(sessionId: string) {
  const signature = sign(sessionId);
  return `${sessionId}.${signature}`;
}

export function decodeSessionCookie(rawValue: string | undefined | null) {
  if (!rawValue) return null;
  const [sessionId, signature] = rawValue.split(".");
  if (!sessionId || !signature) return null;
  const expectedSignature = sign(sessionId);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }
  return sessionId;
}

function sessionExpiryDate() {
  const now = Date.now();
  const maxAgeDays = authConfig.session.maxAgeDays;
  return new Date(now + maxAgeDays * 24 * 60 * 60 * 1000);
}

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: authConfig.session.sameSite,
  secure: authConfig.session.secure,
  path: "/",
  maxAge: authConfig.session.maxAgeDays * 24 * 60 * 60,
} as const;

export const sessionCookieName = authConfig.session.cookieName;
export const sessionCookieOptions = SESSION_COOKIE_OPTIONS;

export async function createSession({
  userId,
  ip,
  userAgent,
}: {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const sessionId = nanoid();
  const expiresAt = sessionExpiryDate();

  let session;
  try {
    session = await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        expiresAt,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
      include: {
        user: true,
      },
    });
  } catch (error) {
    throwIfPrismaSchemaMissing(error);
    throw error;
  }

  const cookieValue = encodeSessionId(session.id);

  return {
    session,
    cookieValue,
    cookieOptions: SESSION_COOKIE_OPTIONS,
  };
}

export async function revokeSession(sessionId: string) {
  try {
    await prisma.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  } catch (error) {
    throwIfPrismaSchemaMissing(error);
    throw error;
  }
}

export async function getActiveSession(sessionId: string) {
  if (!sessionId) return null;
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;
    return session;
  } catch (error) {
    throwIfPrismaSchemaMissing(error);
    throw error;
  }
}

export async function requireCmsSession() {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(authConfig.session.cookieName)?.value;
  const sessionId = decodeSessionCookie(rawCookie);
  if (!sessionId) return null;
  return getActiveSession(sessionId);
}

export function applySessionCookie(response: NextResponse, cookieValue: string) {
  response.cookies.set(authConfig.session.cookieName, cookieValue, SESSION_COOKIE_OPTIONS);
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(authConfig.session.cookieName, "", {
    httpOnly: true,
    sameSite: authConfig.session.sameSite,
    secure: authConfig.session.secure,
    path: "/",
    maxAge: 0,
  });
}
