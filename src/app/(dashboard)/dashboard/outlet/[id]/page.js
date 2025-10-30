export default function OutletDetailPage({ params }) {
  const { id } = params;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Outlet Detail
        </h1>
        <p className="text-sm text-slate-500">
          Informasi lengkap untuk outlet dengan ID <span className="font-medium text-slate-700">{id}</span>.
        </p>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Tempatkan detail outlet seperti alamat, jam operasional, statistik kunjungan,
          dan informasi terkait lainnya di sini.
        </p>
      </div>
    </section>
  );
}
