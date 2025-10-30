export default function BannerPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Homepage Banner</h1>
        <p className="text-sm text-slate-500">
          Atur materi banner untuk halaman depan aplikasi pengguna.
        </p>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Upload gambar banner, atur penjadwalan, dan tambahkan call-to-action di sini.
        </p>
      </div>
    </section>
  );
}
