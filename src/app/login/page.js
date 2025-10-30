import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { AUTH_COOKIE } from "@/lib/auth-constants";

export default async function LoginPage({ searchParams }) {
  const cookieStore = await cookies();
  if (cookieStore.get(AUTH_COOKIE)) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const errorValue =
    typeof resolvedSearchParams?.error === "string"
      ? resolvedSearchParams.error
      : undefined;

  return <LoginForm error={errorValue} />;
}
