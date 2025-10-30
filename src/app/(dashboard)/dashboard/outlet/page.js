export default function OutletPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Outlet Overview</h1>
        <p className="text-sm text-slate-500">
          Kelola daftar outlet, tambah outlet baru, dan pantau performa outlet Anda.
        </p>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Belum ada data outlet. Tambahkan data atau integrasikan dengan API untuk
          menampilkan daftar outlet di sini.
        </p>
      </div>
    </section>
  );
}
