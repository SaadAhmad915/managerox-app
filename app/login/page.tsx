"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/Icon";
import { ApiError } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Someone already signed in has no business on the login screen.
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signIn(email, password);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (caught.fieldError("email") ?? caught.message)
          : "Could not reach the server. Is the API running?",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="text-center">
          <div className="text-[26px] font-extrabold tracking-[-0.5px]">
            Manager<span className="text-blue-600">OX</span>
          </div>
          <p className="mt-1 text-[13.5px] text-slate-500">
            Sign in to your CRM
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-hairline bg-white p-6"
          noValidate
        >
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-[13px] font-semibold text-red-600"
            >
              <Icon name="close" size={16} className="mt-px shrink-0" />
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-[13px] font-bold text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-100"
              placeholder="you@managerox.com"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-[13px] font-bold text-slate-700">
              Password
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-100"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-[12.5px] text-slate-400">
          Demo login — ali@managerox.com / password
        </p>
      </div>
    </div>
  );
}
