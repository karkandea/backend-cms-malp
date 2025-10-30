import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { issueMobileTokens } from "@/lib/auth/mobile";
import { getClientIp, getUserAgent } from "@/lib/http";
import { failure, success } from "@/lib/response";
import { formatZodIssues } from "@/lib/validation";

const tokenSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof tokenSchema>;

  try {
    body = tokenSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      failure("VALIDATION_ERROR", "Input tidak valid.", {
        issues: error instanceof z.ZodError ? formatZodIssues(error) : undefined,
      }),
      { status: 422 },
    );
  }

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  const result = await issueMobileTokens({
    email: body.email,
    password: body.password,
    ip,
    userAgent,
  });

  if (result.status === "error") {
    const response = NextResponse.json(failure(result.code, result.message), {
      status: result.httpStatus,
    });
    if (result.retryAfterSeconds) {
      response.headers.set("Retry-After", result.retryAfterSeconds.toString());
    }
    return response;
  }

  const expiresInSeconds = Math.round(
    (result.data.accessExpiresAt.getTime() - Date.now()) / 1000,
  );

  return NextResponse.json(
    success({
      access_token: result.data.accessToken,
      refresh_token: result.data.refreshToken,
      expires_in: expiresInSeconds,
      token_type: "Bearer",
    }),
  );
}
