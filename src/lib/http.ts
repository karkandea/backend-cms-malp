import type { NextRequest } from "next/server";

export function getClientIp(request: NextRequest) {
  const header = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  if (header) {
    return header.split(",")[0].trim();
  }
  return request.ip ?? "unknown";
}

export function getUserAgent(request: NextRequest) {
  return request.headers.get("user-agent") ?? null;
}
