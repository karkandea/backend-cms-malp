"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MdDelete, MdEdit, MdVisibility } from "react-icons/md";

const PAGE_SIZE = 10;
const DEBOUNCE_DELAY = 300;

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

const STATUS_LABELS = {
  ACTIVE: "Open",
  DRAFT: "Draft",
};

export default function OutletListPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function fetchOutlets() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: PAGE_SIZE.toString(),
        });
        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }
        const response = await fetch(`/api/v1/outlets?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message ?? "Gagal memuat data outlet.");
        }
        const payload = await response.json();
        if (ignore) return;
        setItems(payload.data.items);
        setTotal(payload.data.total);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[OutletList] fetch error", err);
        setError(err.message ?? "Gagal memuat data outlet.");
        setItems([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    }

    fetchOutlets();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [page, debouncedSearch]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages = new Set([1, totalPages, page, page - 1, page + 1]);
    if (page <= 3) {
      pages.add(2);
      pages.add(3);
    }
    if (page >= totalPages - 2) {
      pages.add(totalPages - 1);
      pages.add(totalPages - 2);
    }
    const sorted = Array.from(pages)
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b);

    const result = [];
    let prev = null;
    sorted.forEach((p) => {
      if (prev && p - prev > 1) {
        result.push("ellipsis");
      }
      result.push(p);
      prev = p;
    });
    return result;
  }, [page, totalPages]);

  const handlePageChange = (targetPage) => {
    if (targetPage >= 1 && targetPage <= totalPages && targetPage !== page) {
      setPage(targetPage);
    }
  };

  const renderSkeletonRows = () =>
    Array.from({ length: 6 }).map((_, index) => (
      <tr key={`skeleton-${index}`} className="animate-pulse">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-200" />
            <div className="h-5 w-32 rounded bg-slate-200" />
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-32 rounded bg-slate-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-36 rounded bg-slate-200" />
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <div className="h-8 w-8 rounded-full bg-slate-200" />
          </div>
        </td>
      </tr>
    ));

  const renderRows = () => {
    if (items.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
            Belum ada data outlet.
          </td>
        </tr>
      );
    }

    return items.map((outlet) => (
      <tr key={outlet.id} className="border-t border-slate-100 text-sm text-slate-600">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 shadow-sm">
              {outlet.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={outlet.logoUrl}
                  alt={outlet.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-slate-500">
                  {outlet.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="font-medium text-slate-700">{outlet.name}</span>
          </div>
        </td>
        <td className="px-4 py-3">{outlet.city}</td>
        <td className="px-4 py-3">
          {STATUS_LABELS[outlet.status] ?? outlet.status}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/dashboard/outlet/Outlet Configuration?id=${encodeURIComponent(outlet.id)}`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base text-blue-600 transition hover:bg-blue-50"
              aria-label={`Lihat ${outlet.name}`}
            >
              <MdVisibility />
            </Link>
            <button
              type="button"
              onClick={() => alert("Edit outlet coming soon")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base text-blue-500 transition hover:bg-blue-50"
              aria-label={`Edit ${outlet.name}`}
            >
              <MdEdit />
            </button>
            <button
              type="button"
              onClick={() => alert("Delete outlet coming soon")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base text-rose-600 transition hover:bg-rose-50"
              aria-label={`Hapus ${outlet.name}`}
            >
              <MdDelete />
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Cari Nama Outlet"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
            🔍
          </span>
        </div>

        <Link
          href="/dashboard/outlet/addoutlet"
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
        >
          + Add Outlet
        </Link>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-hidden">
          <table className="min-w-full table-fixed">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Outlet Name</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Operational Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {initialLoad && loading ? renderSkeletonRows() : renderRows()}
            </tbody>
          </table>
        </div>
        {error ? (
          <div className="border-t border-slate-100 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        ) : null}
        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Menampilkan {Math.min(PAGE_SIZE, items.length)} dari {total} data
            per halaman
          </div>
          <nav className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={classNames(
                "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm transition",
                page === 1
                  ? "cursor-not-allowed bg-slate-100 text-slate-300"
                  : "bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600",
              )}
            >
              ‹
            </button>
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="mx-2 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => handlePageChange(item)}
                  className={classNames(
                    "flex h-9 min-w-[2.25rem] items-center justify-center rounded-full border text-sm transition",
                    item === page
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600",
                  )}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className={classNames(
                "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm transition",
                page === totalPages
                  ? "cursor-not-allowed bg-slate-100 text-slate-300"
                  : "bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600",
              )}
            >
              ›
            </button>
          </nav>
        </footer>
      </section>
    </section>
  );
}
