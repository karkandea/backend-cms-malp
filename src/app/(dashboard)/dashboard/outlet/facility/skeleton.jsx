"use client";

export default function OutletFacilitySkeleton() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-7 w-24 rounded-full bg-slate-200" />
        <div className="h-5 w-40 rounded-full bg-slate-200" />
      </div>

      <div className="space-y-4">
        <div className="h-8 w-60 rounded-full bg-slate-200" />
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    </section>
  );
}
