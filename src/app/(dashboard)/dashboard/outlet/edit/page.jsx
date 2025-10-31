export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import Link from "next/link";
import { cookies, headers } from "next/headers";

import OutletForm from "../_components/OutletForm";
import EditOutletSkeleton from "./skeleton";
import { ToastProvider } from "@/components/ui/use-toast";

function resolveBaseUrl(headerList) {
  const envBase =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    process.env.APP_URL?.replace(/\/$/, "");
  if (envBase) return envBase;
  const host = headerList?.get?.("host") ?? "localhost:3000";
  const protocol = headerList?.get?.("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

async function EditOutletContent({ outletId }) {
  const headerList = await headers();
  const cookieStore = await cookies();
  const baseUrl = resolveBaseUrl(headerList);
  const targetUrl = `${baseUrl}/api/v1/outlets/${encodeURIComponent(outletId)}`;

  const requestHeaders = new Headers();
  const cookieHeader = cookieStore
    ?.getAll()
    ?.map((item) => `${item.name}=${item.value}`)
    .join("; ");
  if (cookieHeader && cookieHeader.length > 0) {
    requestHeaders.set("cookie", cookieHeader);
  }
  const userAgent = headerList?.get?.("user-agent");
  if (userAgent) {
    requestHeaders.set("user-agent", userAgent);
  }
  const acceptLanguage = headerList?.get?.("accept-language");
  if (acceptLanguage) {
    requestHeaders.set("accept-language", acceptLanguage);
  }

  const response = await fetch(targetUrl, {
    cache: "no-store",
    headers: requestHeaders,
  });

  if (response.status === 404) {
    return (
      <section className="space-y-4">
        <Link
          href="/dashboard/outlet"
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
        >
          ← Outlet List
        </Link>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-600">
          Outlet tidak ditemukan.
        </div>
      </section>
    );
  }

  if (!response.ok) {
    console.error("[EditOutletPage] fetch error", response.statusText);
    return (
      <section className="space-y-4">
        <Link
          href="/dashboard/outlet"
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
        >
          ← Outlet List
        </Link>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-700">
          Tidak dapat memuat data outlet saat ini. Coba lagi nanti.
        </div>
      </section>
    );
  }

  const payload = await response.json().catch(() => null);
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
          Data outlet tidak tersedia.
        </div>
      </section>
    );
  }

  return <OutletForm mode="edit" initialData={outlet} />;
}

export default async function EditOutletPage({ searchParams }) {
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
          Parameter <code>id</code> wajib ada untuk mengedit outlet.
        </div>
      </section>
    );
  }

  return (
    <ToastProvider>
      <Suspense fallback={<EditOutletSkeleton />}>
        <EditOutletContent outletId={id} />
      </Suspense>
    </ToastProvider>
  );
}
