import { login } from "@/app/login/actions";

export default function LoginForm({ error }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Masuk</h1>
          <p className="text-sm text-slate-500">
            Gunakan akun Dualangka Anda untuk mengakses dashboard.
          </p>
        </header>

        <form className="space-y-4" action={login}>
          <div className="space-y-2 text-left">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="space-y-2 text-left">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">
              {error === "missing-credentials"
                ? "Email dan password wajib diisi."
                : "Terjadi kesalahan, silakan coba lagi."}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500"
          >
            Masuk
          </button>
        </form>
      </div>
    </main>
  );
}
