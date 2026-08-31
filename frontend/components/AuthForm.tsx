"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";

const inputClass =
  "w-full rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15";

const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400";

type AuthFormProps = {
  mode: "login" | "register";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const { user, login, register, clearSigningOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = searchParams.get("next") || "/dashboard";
  const sessionExpired = searchParams.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The sign-out journey ends here.
  useEffect(() => {
    clearSigningOut();
  }, [clearSigningOut]);

  // Already signed in? Nothing to do on these pages.
  useEffect(() => {
    if (user) router.replace(nextPath);
  }, [user, router, nextPath]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register(email.trim(), password, fullName);
      } else {
        await login(email.trim(), password);
      }
      router.replace(nextPath);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col px-4 py-14 sm:px-6 sm:py-20">
      <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-xl shadow-ink-900/5 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          {isRegister
            ? "Your trips are saved to your account, so only you can see them."
            : "Sign in to reach your planner and trip history."}
        </p>

        {sessionExpired && !error && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-sunset-400/40 bg-sunset-100 px-4 py-3 text-sm text-sunset-700"
          >
            Your session expired. Please sign in again.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {isRegister && (
            <div>
              <label htmlFor="full-name" className={labelClass}>
                Full name <span className="normal-case">(optional)</span>
              </label>
              <input
                id="full-name"
                name="full_name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Evril Rizki"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? "At least 8 characters" : "Your password"}
              className={inputClass}
            />
            {isRegister && (
              <p className="mt-2 text-xs text-ink-400">
                8 characters minimum. Stored only as a bcrypt hash.
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-xl bg-ink-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? isRegister
                ? "Creating account..."
                : "Signing in..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-600">
          {isRegister ? "Already have an account?" : "New to KelanaAI?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </section>
  );
}
