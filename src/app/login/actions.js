"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cmsLogin } from "@/lib/auth/cms";
import {
  decodeSessionCookie,
  revokeSession,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit";
import { isPrismaSchemaNotReadyError, mapPrismaSchemaError } from "@/lib/errors";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function login(formData) {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  const rawRedirect = formData.get("redirect");

  const parseResult = loginSchema.safeParse({
    email: typeof rawEmail === "string" ? rawEmail : "",
    password: typeof rawPassword === "string" ? rawPassword : "",
  });

  if (!parseResult.success) {
    redirect("/login?error=validation");
  }

  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
  const userAgent = headerList.get("user-agent");

  const result = await cmsLogin({
    email: parseResult.data.email,
    password: parseResult.data.password,
    ip,
    userAgent,
  });

  if (result.status === "error") {
    const errorCodeMap = {
      RATE_LIMITED: "rate-limited",
      INVALID_CREDENTIALS: "invalid-credentials",
      SERVICE_UNAVAILABLE: "service-unavailable",
    };
    const errorCode = errorCodeMap[result.code] ?? "auth-error";
    const params = new URLSearchParams({ error: errorCode });
    if (redirectTarget && redirectTarget !== "/dashboard") {
      params.set("redirect", redirectTarget);
    }
    redirect(`/login?${params.toString()}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, result.cookieValue, sessionCookieOptions);

  redirect(redirectTarget);
}

export async function logout() {
  const headerList = await headers();
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(sessionCookieName)?.value;
  const sessionId = decodeSessionCookie(rawCookie);
  const userAgent = headerList.get("user-agent");
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

  if (sessionId) {
    try {
      await revokeSession(sessionId);
    } catch (error) {
      if (!isPrismaSchemaNotReadyError(error)) {
        const schemaError = mapPrismaSchemaError(error);
        if (!schemaError) {
          throw error;
        }
      }
      // swallow and continue logout flow when schema is missing
    }
    await createAuditLog({
      action: "auth.logout",
      entity: "auth",
      entityId: sessionId,
      after: { status: "revoked" },
      ip,
      userAgent,
    });
  }

  cookieStore.delete(sessionCookieName);
  redirect("/");
}
  const redirectTarget =
    typeof rawRedirect === "string" && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
