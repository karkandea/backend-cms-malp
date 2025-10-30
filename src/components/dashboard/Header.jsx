"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { logout } from "@/app/login/actions";

export default function Header({ userName = "Muhammad Ardian Syahputra" }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const rawUserName = userName?.trim() || "Dualangka User";
  const displayName = rawUserName.includes("@")
    ? rawUserName.split("@")[0]
    : rawUserName;
  const initials =
    rawUserName
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "DU";

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
        <div className="h-8 w-1 rounded-full bg-blue-500" />
        <span>Dashboard</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right text-sm text-slate-500">
          <p>Hai,</p>
          <p className="font-semibold text-slate-700">{displayName}</p>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {initials}
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
            </span>
            <Icon
              icon="mdi:chevron-down"
              className={`text-xl text-slate-500 transition-transform ${
                open ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
              >
                <div className="py-1 text-sm text-slate-600">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2 transition hover:bg-slate-100"
                  >
                    <Icon
                      icon="mdi:cog-outline"
                      className="text-lg text-slate-500"
                    />
                    Setting
                  </button>
                  <form action={logout}>
                    <button
                      type="submit"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-rose-600 transition hover:bg-rose-50"
                    >
                      <Icon icon="mdi:logout" className="text-lg" />
                      Log out
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
