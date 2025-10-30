import { login } from "@/app/login/actions";

const errorMessages = {
  validation: "Email atau password tidak valid.",
  "invalid-credentials": "Email atau password salah.",
  "rate-limited": "Terlalu banyak percobaan login. Coba lagi setelah beberapa saat.",
  "service-unavailable": "Sistem belum siap. Jalankan migrasi & seed database atau hubungi administrator.",
  "auth-error": "Terjadi kesalahan, silakan coba lagi.",
};

export default function LoginForm({ error, redirectPath }) {
  const errorMessage = error ? errorMessages[error] ?? errorMessages["auth-error"] : null;

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
          {redirectPath ? (
            <input type="hidden" name="redirect" value={redirectPath} />
          ) : null}
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
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {errorMessage && (
            <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">
              {errorMessage}
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
