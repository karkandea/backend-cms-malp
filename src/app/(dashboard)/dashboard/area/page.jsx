"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const PAGE_SIZE = 10;
const DEBOUNCE_DELAY = 300;

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function getPagination(totalPages, currentPage) {
  if (totalPages <= 1) {
    return [1];
  }

  const pages = [];
  const addPage = (page) => {
    if (!pages.includes(page)) {
      pages.push(page);
    }
  };

  addPage(1);
  addPage(totalPages);

  addPage(currentPage);
  addPage(currentPage - 1);
  addPage(currentPage + 1);

  if (currentPage <= 3) {
    addPage(2);
    addPage(3);
  }

  if (currentPage >= totalPages - 2) {
    addPage(totalPages - 1);
    addPage(totalPages - 2);
  }

  const sorted = pages
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const result = [];
  let previous = null;
  sorted.forEach((page) => {
    if (previous && page - previous > 1) {
      result.push("ellipsis");
    }
    result.push(page);
    previous = page;
  });

  return result;
}

export default function AreaManagementPage() {
  const [areas, setAreas] = useState([]);
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
    let ignore = false;
    const controller = new AbortController();

    async function fetchAreas() {
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
        const response = await fetch(`/api/v1/areas?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message ?? "Gagal memuat data area.");
        }
        const payload = await response.json();
        if (ignore) return;
        setAreas(payload.data.items);
        setTotal(payload.data.total);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[AreaManagement] fetch error", err);
        setError(err.message ?? "Gagal memuat data area.");
        setAreas([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    }

    fetchAreas();

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

  const paginationItems = useMemo(
    () => getPagination(totalPages, page),
    [totalPages, page],
  );

  const handlePageChange = (targetPage) => {
    if (targetPage >= 1 && targetPage <= totalPages && targetPage !== page) {
      setPage(targetPage);
    }
  };

  const renderSkeletonRows = () => {
    const rows = Array.from({ length: 5 });
    return rows.map((_, index) => (
      <tr key={`skeleton-${index}`} className="animate-pulse">
        <td className="px-4 py-3">
          <div className="h-5 rounded bg-slate-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 rounded bg-slate-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 rounded bg-slate-200" />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <span className="h-5 w-8 rounded bg-slate-200" />
            <span className="h-5 w-8 rounded bg-slate-200" />
          </div>
        </td>
      </tr>
    ));
  };

  const renderRows = () => {
    if (!loading && areas.length === 0) {
      return (
        <tr>
          <td
            className="px-4 py-6 text-center text-sm text-slate-500"
            colSpan={4}
          >
            Belum ada data area. Tambahkan area baru untuk memulai.
          </td>
        </tr>
      );
    }

    return areas.map((area) => (
      <tr
        key={area.id}
        className="border-b border-slate-100 text-sm text-slate-700 last:border-none hover:bg-slate-50"
      >
        <td className="px-4 py-3 font-medium text-slate-900">{area.city}</td>
        <td className="px-4 py-3">{area.province}</td>
        <td className="px-4 py-3">{area.country}</td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => alert(`edit ${area.city}`)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base text-blue-600 transition hover:bg-blue-50"
              aria-label={`Edit ${area.city}`}
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => alert(`delete ${area.city}`)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base text-rose-600 transition hover:bg-rose-50"
              aria-label={`Delete ${area.city}`}
            >
              🗑️
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Cari Nama Kota"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
            🔍
          </span>
        </div>

        <Link
          href="/dashboard/area/add-area"
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
        >
          + Add Area
        </Link>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-hidden">
          <table className="min-w-full table-fixed">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Province</th>
                <th className="px-4 py-3 text-left">Country</th>
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
            Menampilkan {Math.min(PAGE_SIZE, areas.length)} dari {total} data
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
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-9 w-9 items-center justify-center text-slate-400"
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => handlePageChange(item)}
                  className={classNames(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm transition",
                    item === page
                      ? "bg-blue-600 font-semibold text-white shadow-sm"
                      : "text-slate-600 hover:bg-blue-50 hover:text-blue-600",
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
    </div>
  );
}
