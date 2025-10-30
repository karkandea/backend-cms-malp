import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cmsLogin } from "@/lib/auth/cms";
import { applySessionCookie } from "@/lib/auth/session";
import { failure, success } from "@/lib/response";
import { formatZodIssues } from "@/lib/validation";
import { getClientIp, getUserAgent } from "@/lib/http";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof loginSchema>;

  try {
    const json = await request.json();
    body = loginSchema.parse(json);
  } catch (error) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Input tidak valid.", {
        issues: error instanceof z.ZodError ? formatZodIssues(error) : undefined,
      }),
      { status: 422 },
    );
  }

  const email = body.email.trim().toLowerCase();
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  const result = await cmsLogin({
    email,
    password: body.password,
    ip,
    userAgent,
  });

  if (result.status === "error") {
    const response = NextResponse.json(failure(result.code, result.message, { details: result.details }), {
      status: result.httpStatus,
    });
    if (result.retryAfterSeconds) {
      response.headers.set("Retry-After", result.retryAfterSeconds.toString());
    }
    return response;
  }

  const response = NextResponse.json(
    success({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    }),
  );

  applySessionCookie(response, result.cookieValue);

  return response;
}
