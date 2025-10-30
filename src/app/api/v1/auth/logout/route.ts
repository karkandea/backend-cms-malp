import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, decodeSessionCookie, getActiveSession, revokeSession } from "@/lib/auth/session";
import { authConfig } from "@/lib/config";
import { createAuditLog } from "@/lib/audit";
import { success, failure } from "@/lib/response";
import { getClientIp, getUserAgent } from "@/lib/http";
import { isPrismaSchemaNotReadyError, mapPrismaSchemaError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  const rawCookie = request.cookies.get(authConfig.session.cookieName)?.value;
  const sessionId = decodeSessionCookie(rawCookie);
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  if (!sessionId) {
    const response = NextResponse.json(success(true));
    clearSessionCookie(response);
    return response;
  }

  let existingSession;
  try {
    existingSession = await getActiveSession(sessionId);
    await revokeSession(sessionId);
  } catch (error) {
    const schemaError = isPrismaSchemaNotReadyError(error) ? error : mapPrismaSchemaError(error);
    if (schemaError) {
      return NextResponse.json(
        failure(
          "SERVICE_UNAVAILABLE",
          schemaError.message,
        ),
        { status: 503 },
      );
    }
    throw error;
  }

  await createAuditLog({
    actorId: existingSession?.userId,
    action: "auth.logout",
    entity: "auth",
    entityId: sessionId,
    after: { status: "revoked" },
    ip,
    userAgent,
  });

  const response = NextResponse.json(success(true));
  clearSessionCookie(response);

  return response;
}
