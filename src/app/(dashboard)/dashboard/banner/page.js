"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 10;
const DEBOUNCE_DELAY = 300;

const STATUS_STYLES = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-emerald-100 text-emerald-700",
};

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function formatDateRange(startsAt, endsAt) {
  if (!startsAt && !endsAt) {
    return "Tidak dijadwalkan";
  }

  const options = { day: "numeric", month: "long", year: "numeric" };
  const formatter = new Intl.DateTimeFormat("id-ID", options);

  const startText = startsAt ? formatter.format(new Date(startsAt)) : "Tanpa tanggal";
  const endText = endsAt ? formatter.format(new Date(endsAt)) : "Tanpa tanggal";

  return `${startText} – ${endText}`;
}

function getPagination(totalPages, currentPage) {
  if (totalPages <= 1) {
    return [1];
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const sorted = Array.from(pages)
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

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result.map((item, index) => ({ ...item, order: index + 1 }));
};

export default function BannerPage() {
  const [banners, setBanners] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, DEBOUNCE_DELAY);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dragIndexRef = useRef({ source: null, destination: null });

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function fetchBanners() {
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

        const response = await fetch(`/api/v1/banners?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message ?? "Gagal memuat data banner.");
        }

        const payload = await response.json();
        if (ignore) return;

        setBanners(payload.data.items.map((item, index) => ({ ...item, localIndex: index })));
        setTotal(payload.data.total);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[BannerManagement] fetch error", err);
        setError(err.message ?? "Gagal memuat data banner.");
        setBanners([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    }

    fetchBanners();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [page, debouncedSearch]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginationItems = useMemo(() => getPagination(totalPages, page), [totalPages, page]);

  const handlePageChange = (target) => {
    if (target >= 1 && target <= totalPages && target !== page) {
      setPage(target);
    }
  };

  const onDragStart = (id, index) => {
    setDraggingId(id);
    dragIndexRef.current.source = index;
  };

  const onDragEnter = (id, index) => {
    if (draggingId === null || draggingId === id) return;
    dragIndexRef.current.destination = index;
    setDragOverId(id);
    setBanners((prev) => reorder(prev, dragIndexRef.current.source, index));
    dragIndexRef.current.source = index;
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
    dragIndexRef.current = { source: null, destination: null };
  };

  const renderSkeletonRows = () => {
    const rows = Array.from({ length: 5 });
    return rows.map((_, index) => (
      <tr key={`skeleton-${index}`} className="animate-pulse">
        <td className="w-12 px-4 py-3">
          <div className="mx-auto h-10 w-10 rounded bg-slate-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-3/4 rounded bg-slate-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-16 rounded bg-slate-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-14 w-24 rounded bg-slate-200" />
        </td>
        <td className="px-4 py-3">
          <div className="h-5 w-40 rounded bg-slate-200" />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <span className="h-5 w-8 rounded bg-slate-200" />
            <span className="h-5 w-8 rounded bg-slate-200" />
            <span className="h-5 w-8 rounded bg-slate-200" />
          </div>
        </td>
      </tr>
    ));
  };

  const renderRows = () => {
    if (!loading && banners.length === 0) {
      return (
        <tr>
          <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={6}>
            Belum ada data banner. Tambahkan banner baru untuk memulai.
          </td>
        </tr>
      );
    }

    return banners.map((banner, index) => (
      <tr
        key={banner.id}
        draggable
        onDragStart={() => onDragStart(banner.id, index)}
        onDragEnter={() => onDragEnter(banner.id, index)}
        onDragEnd={onDragEnd}
        className={classNames(
          "border-b border-slate-100 text-sm text-slate-700 last:border-none",
          draggingId === banner.id ? "opacity-70" : "",
          dragOverId === banner.id ? "bg-blue-50" : "hover:bg-slate-50",
        )}
      >
        <td className="w-12 px-4 py-3">
          <div className="flex items-center justify-center text-lg text-slate-400">⋮⋮</div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-slate-900">{banner.title}</div>
          <div className="text-xs text-slate-400">Urutan #{banner.order}</div>
        </td>
        <td className="px-4 py-3">
          <span
            className={classNames(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              STATUS_STYLES[banner.status] ?? "bg-slate-100 text-slate-600",
            )}
          >
            {banner.status === "ACTIVE" ? "Active" : "Draft"}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="h-14 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {banner.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                No Image
              </div>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-500">
          {formatDateRange(banner.startsAt, banner.endsAt)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => alert(`view ${banner.title}`)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label={`View ${banner.title}`}
            >
              👁
            </button>
            <button
              type="button"
              onClick={() => alert(`edit ${banner.title}`)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base text-blue-600 transition hover:bg-blue-50"
              aria-label={`Edit ${banner.title}`}
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => alert(`delete ${banner.title}`)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base text-rose-600 transition hover:bg-rose-50"
              aria-label={`Delete ${banner.title}`}
            >
              🗑️
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Homepage Banner</h1>
          <p className="text-sm text-slate-500">
            Kelola urutan, status, dan jadwal banner yang tampil pada aplikasi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("add banner clicked")}
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
        >
          + Add Banner
        </button>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <input
              type="text"
              placeholder="Cari Nama Banner"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
              🔍
            </span>
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="min-w-full table-fixed">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-12 px-4 py-3 text-left">&nbsp;</th>
                <th className="px-4 py-3 text-left">Banner</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Preview</th>
                <th className="px-4 py-3 text-left">Schedule</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>{initialLoad && loading ? renderSkeletonRows() : renderRows()}</tbody>
          </table>
        </div>

        {error ? (
          <div className="border-t border-slate-100 px-4 py-3 text-sm text-rose-600">{error}</div>
        ) : null}

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Menampilkan {Math.min(PAGE_SIZE, banners.length)} dari {total} data per halaman
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
                <span key={`ellipsis-${index}`} className="flex h-9 w-9 items-center justify-center text-slate-400">
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
    </section>
  );
}
