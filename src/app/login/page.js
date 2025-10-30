import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { requireCmsSession } from "@/lib/auth/session";

export default async function LoginPage({ searchParams }) {
  const session = await requireCmsSession();
  if (session) {
    redirect("/dashboard");
  }

  const errorValue =
    typeof searchParams?.error === "string" ? searchParams.error : undefined;
  const redirectPath =
    typeof searchParams?.redirect === "string" ? searchParams.redirect : undefined;

  return <LoginForm error={errorValue} redirectPath={redirectPath} />;
}
