export default function OutletConfigurationSkeleton() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-8 w-24 animate-pulse rounded-full bg-slate-200" />
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-6 px-8 py-6">
          <div className="relative overflow-hidden rounded-2xl bg-slate-100">
            <div className="aspect-[3/2] animate-pulse" />
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 animate-pulse rounded-full bg-slate-200" />
              <div className="space-y-2">
                <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
            <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-1">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="h-10 w-36 animate-pulse rounded-full bg-slate-200" />
            <div className="h-10 w-32 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
      </section>
    </section>
  );
}

