"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PRICE_BADGES = {
  LOW: "$",
  MEDIUM: "$$",
  HIGH: "$$$",
  PREMIUM: "$$$$",
};

const STATUS_BADGES = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700",
  },
  DRAFT: {
    label: "Inactive",
    className: "bg-slate-100 text-slate-600",
  },
};

const BANNER_ASPECT_RATIO = 3 / 2;

export default function OutletConfigurationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const outletId = searchParams.get("id");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!outletId) {
      setError("Parameter id tidak ditemukan.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let ignore = false;

    async function fetchDetail() {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/outlets/${outletId}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message ?? "Gagal memuat detail outlet.");
        }
        const payload = await response.json();
        if (ignore) return;
        setData(payload.data);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[OutletConfiguration] fetch error", err);
        setError(err.message ?? "Gagal memuat detail outlet.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchDetail();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [outletId]);

  const statusBadge = useMemo(() => {
    if (!data) return null;
    return STATUS_BADGES[data.status] ?? {
      label: data.status,
      className: "bg-slate-100 text-slate-600",
    };
  }, [data]);

  if (!outletId) {
    return (
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/dashboard/outlet")}
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
        >
          ← Back to Outlet List
        </button>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-600">
          Parameter id wajib ada untuk melihat konfigurasi outlet.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard/outlet")}
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
        >
          ← Outlet List
        </button>
        <h1 className="text-2xl font-semibold text-slate-900">Outlet Configuration</h1>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-6 px-8 py-6">
            <div
              className="relative overflow-hidden rounded-2xl bg-slate-100"
              style={{ "--banner-aspect": BANNER_ASPECT_RATIO }}
            >
              <div className="aspect-[--banner-aspect] animate-pulse" />
            </div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
              <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-1">
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="space-y-4 px-8 py-6">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
            >
              Coba Lagi
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6 px-8 py-6">
            <div
              className="relative overflow-hidden rounded-2xl bg-slate-100"
              style={{ "--banner-aspect": BANNER_ASPECT_RATIO }}
            >
              <div className="aspect-[--banner-aspect] w-full">
                {data.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.bannerUrl}
                    alt={`${data.name} banner`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl text-slate-300">
                    🖼️
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-lg">
                  {data.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.logoUrl}
                      alt={data.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-slate-500">
                      {data.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{data.name}</h2>
                  <p className="text-sm text-slate-500">{data.slug}</p>
                </div>
              </div>
              {statusBadge ? (
                <span
                  className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Phone Number</p>
                <p className="text-sm font-medium text-slate-700">
                  {data.phone ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Address</p>
                <p className="text-sm font-medium text-slate-700">
                  {data.address ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Coordinates</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                    {data.lng ?? "-"}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                    {data.lat ?? "-"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Operational Hour</p>
                <p className="text-sm font-medium text-slate-700">
                  {data.openingHour
                    ? `${data.openingHour.open} – ${data.openingHour.close}`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">City</p>
                <p className="text-sm font-medium text-slate-700">
                  {data.city ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Province / Country</p>
                <p className="text-sm font-medium text-slate-700">
                  {[data.province, data.country].filter(Boolean).join(", ") || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Price Tier</p>
                <p className="text-sm font-medium text-slate-700">
                  {PRICE_BADGES[data.priceTier] ?? data.priceTier}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                Informasi Umum
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
              >
                Fasilitas
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}
