import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { requireCmsSession } from "@/lib/auth/session";

export default async function DashboardLayout({ children }) {
  const session = await requireCmsSession();
  if (!session) {
    redirect("/login");
  }

  const userName = session.user.name ?? session.user.email;

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
