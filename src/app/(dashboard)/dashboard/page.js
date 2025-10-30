'use client';

import { Icon } from "@iconify/react";

const statsCards = [
  {
    label: "Total Resto",
    value: "20",
    change: null,
    changeTone: "neutral",
    icon: "mdi:store-outline",
  },
  {
    label: "Monthly users",
    value: "23.6K",
    change: "-12.6%",
    changeTone: "down",
    icon: "mdi:account-group-outline",
  },
  {
    label: "User Registration",
    value: "756",
    change: "+3.1%",
    changeTone: "up",
    icon: "mdi:account-plus-outline",
  },
];

const topVisited = ["Dipuri", "Dipuri", "Dipuri"];

const keywords = ["Wifi kenceng", "Smoking Area"];

export default function DashboardPage() {
  return (
    <>
      <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Dashboard v1
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Welcome back, Dualangka Team
          </h1>
        </div>
        <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600">
          <span>Export data</span>
          <Icon icon="mdi:download" className="text-lg text-indigo-500" />
        </button>
      </header>

      <section className="mb-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {statsCards.map((card) => (
          <article
            key={card.label}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {card.value}
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-indigo-500">
                <Icon icon={card.icon} className="text-2xl" />
              </span>
            </div>
            {card.change && (
              <p
                className={`mt-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  card.changeTone === "up"
                    ? "bg-emerald-100 text-emerald-600"
                    : card.changeTone === "down"
                    ? "bg-rose-100 text-rose-600"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {card.change}
              </p>
            )}
          </article>
        ))}
      </section>

      <section className="mb-10 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Top Dikunjungi
            </h2>
            <Icon icon="mdi:dots-vertical" className="text-xl text-slate-400" />
          </header>
          <div className="mt-6 space-y-4">
            {topVisited.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="flex items-center gap-4 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <Icon icon="mdi:storefront-outline" className="text-xl" />
                </span>
                <div>
                  <p className="font-medium text-slate-900">{item}</p>
                  <p className="text-sm text-slate-500">Outlet</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Top Keyword</h2>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50">
            <div className="grid grid-cols-1 gap-0 divide-y divide-slate-200">
              <div className="px-4 py-3 text-sm font-medium uppercase tracking-widest text-slate-500">
                Keyword
              </div>
              {keywords.map((keyword) => (
                <div key={keyword} className="px-4 py-4 text-base text-slate-900">
                  {keyword}
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="flex flex-wrap items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Waktu Ramai Pengunjung App
            </h2>
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#A855F7]" />
              Hari
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#38BDF8]" />
              Jam
            </span>
            <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium tracking-wide text-slate-600 shadow-sm hover:border-indigo-200 hover:text-indigo-600">
              <Icon icon="mdi:calendar-month-outline" className="text-lg" />
              Jan 2024 - Dec 2024
            </button>
          </div>
        </header>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-indigo-50 to-white p-6">
          <div className="relative h-64 w-full">
            <svg viewBox="0 0 600 260" className="h-full w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(76, 142, 250, 0.35)" />
                  <stop offset="100%" stopColor="rgba(76, 142, 250, 0)" />
                </linearGradient>
                <linearGradient id="chartStroke" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#0EA5E9" />
                </linearGradient>
              </defs>
              <path
                d="M0 190 C 60 160, 120 120, 180 150 C 240 180, 300 80, 360 130 C 420 200, 480 120, 540 170 C 570 190, 600 180, 600 180 L 600 260 L 0 260 Z"
                fill="url(#chartGradient)"
              />
              <path
                d="M0 190 C 60 160, 120 120, 180 150 C 240 180, 300 80, 360 130 C 420 200, 480 120, 540 170 C 570 190, 600 180, 600 180"
                fill="none"
                stroke="url(#chartStroke)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <g fill="rgba(14,165,233,1)">
                <circle cx="540" cy="170" r="5" />
                <circle cx="360" cy="130" r="5" />
                <circle cx="300" cy="80" r="5" />
              </g>
            </svg>
          </div>

          <div className="mt-6 flex justify-between text-xs font-medium text-slate-500">
            {["12:00 AM", "12:30 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM", "5:30 AM"].map(
              (time) => (
                <span key={time} className="min-w-[60px] text-center">
                  {time}
                </span>
              )
            )}
          </div>
        </div>
      </section>
    </>
  );
}
