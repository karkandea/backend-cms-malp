'use client';

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MdDashboard,
  MdStore,
  MdImage,
  MdCategory,
} from "react-icons/md";

export default function Sidebar() {
  const [isOutletOpen, setIsOutletOpen] = useState(false);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="p-4">
        <div className="h-12 w-12 rounded-lg bg-blue-600" />
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto">
        <div className="space-y-2 px-4 pb-6">
          <Link
            href="/dashboard"
            className="flex items-center rounded-lg p-2 text-gray-700 transition hover:bg-gray-100"
          >
            <MdDashboard className="mr-3 h-6 w-6" />
            <span>Dashboard</span>
          </Link>

          <div className="mt-4">
            <div className="mb-2 px-2 text-sm font-medium text-gray-600">
              Configuration
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setIsOutletOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg p-2 text-left text-gray-700 transition hover:bg-gray-100"
              >
                <span className="flex items-center">
                  <MdStore className="mr-3 h-6 w-6" />
                  Outlet Configuration
                </span>
                <motion.span
                  animate={{ rotate: isOutletOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-gray-500"
                >
                  <Icon icon="mdi:chevron-down" className="h-5 w-5" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOutletOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden rounded-lg bg-gray-50"
                  >
                    <div className="space-y-1 py-2">
                      <Link
                        href="/dashboard/outlet"
                        className="block rounded-md py-2 pl-11 pr-4 text-gray-700 transition hover:bg-gray-100"
                      >
                        Overview
                      </Link>
                      <Link
                        href="/dashboard/outlet/123"
                        className="block rounded-md py-2 pl-11 pr-4 text-gray-700 transition hover:bg-gray-100"
                      >
                        Detail Sample
                      </Link>
                      <Link
                        href="/dashboard/area"
                        className="block rounded-md py-2 pl-11 pr-4 text-gray-700 transition hover:bg-gray-100"
                      >
                        Area
                      </Link>
                      <Link
                        href="/dashboard/facility"
                        className="block rounded-md py-2 pl-11 pr-4 text-gray-700 transition hover:bg-gray-100"
                      >
                        Facility
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 px-2 text-sm font-medium text-gray-600">
              Homepage
            </div>
            <Link
              href="/dashboard/banner"
              className="flex items-center rounded-lg p-2 text-gray-700 transition hover:bg-gray-100"
            >
              <MdImage className="mr-3 h-6 w-6" />
              <span>Banner</span>
            </Link>
            <Link
              href="/dashboard/category-highlight"
              className="flex items-center rounded-lg p-2 text-gray-700 transition hover:bg-gray-100"
            >
              <MdCategory className="mr-3 h-6 w-6" />
              <span>Category Highlight</span>
            </Link>
          </div>
        </div>
      </nav>
    </aside>
  );
}
