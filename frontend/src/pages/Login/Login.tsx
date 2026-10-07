import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../../services/authApi";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login({ email, password });
      const destination =
        (location.state as { from?: string } | null)?.from ?? "/expenses";
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Could not log you in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f2eb] px-5 py-10 text-[#302b26]">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <section className="w-full rounded-[28px] border border-[#e3dbd0] bg-[#fffdfa] p-6 shadow-[0_20px_60px_rgba(77,65,52,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a08f7b]">
            Smart Expense Tracker
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Welcome back.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#766e64]">
            Log in to load your real expenses.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-sm font-medium"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-[#ded7cc] bg-[#faf8f4] px-4 py-3 text-sm outline-none focus:border-[#9a9187]"
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#ded7cc] bg-[#faf8f4] px-4 py-3 text-sm outline-none focus:border-[#9a9187]"
              />
            </div>
            {error && (
              <p
                className="rounded-xl bg-[#fdf1ed] px-3 py-2 text-sm text-[#9a5d4f]"
                role="alert"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#2f2b27] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#81776c]">
            New here?{" "}
            <Link
              to="/register"
              className="font-semibold text-[#4f463d] underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default Login;
