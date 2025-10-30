import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { AUTH_COOKIE } from "@/lib/auth-constants";

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE);

  if (!sessionCookie) {
    redirect("/");
  }

  let userName = "Dualangka User";
  try {
    const parsed = JSON.parse(sessionCookie.value);
    if (parsed?.email) {
      userName = parsed.email;
    }
  } catch (error) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />

      <div className="ml-64 flex min-h-screen flex-col">
        <Header userName={userName} />
        <main className="flex-1 overflow-auto bg-gradient-to-br from-white via-slate-50 to-slate-100 px-6 py-10 sm:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
