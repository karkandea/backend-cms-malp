"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE } from "@/lib/auth-constants";

export async function login(formData) {
  const cookieStore = await cookies();
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    redirect("/?error=missing-credentials");
  }

  cookieStore.set(AUTH_COOKIE, JSON.stringify({ email }), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });

  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/");
}
