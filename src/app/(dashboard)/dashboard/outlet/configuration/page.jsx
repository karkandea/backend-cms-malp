export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";

import OutletConfigurationView from "./view";
import { ToastProvider } from "@/components/ui/use-toast";

export default async function OutletConfigurationPage({ searchParams }) {
  const params = await searchParams;
  const id = params?.id;

  if (!id) {
    return (
      <section className="space-y-4">
        <Link
          href="/dashboard/outlet"
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
        >
          ← Outlet List
        </Link>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-600">
          Parameter <code>id</code> wajib ada untuk melihat konfigurasi outlet.
        </div>
      </section>
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/v1/outlets/${id}`, { cache: "no-store" });

  if (!response.ok) {
    return (
      <section className="space-y-4">
        <Link
          href="/dashboard/outlet"
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
        >
          ← Outlet List
        </Link>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-700">
          Outlet dengan ID <strong>{id}</strong> tidak ditemukan.
        </div>
      </section>
    );
  }

  const payload = await response.json();
  const outlet = payload?.data;

  if (!outlet) {
    return (
      <section className="space-y-4">
        <Link
          href="/dashboard/outlet"
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
        >
          ← Outlet List
        </Link>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-700">
          Outlet dengan ID <strong>{id}</strong> tidak ditemukan.
        </div>
      </section>
    );
  }

  return (
    <ToastProvider>
      <OutletConfigurationView outlet={outlet} />
    </ToastProvider>
  );
}
