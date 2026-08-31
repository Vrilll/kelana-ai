"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { listTrips, type Trip } from "@/lib/api";
import { formatCurrency } from "@/lib/trip-display";

export default function ProfilePanel() {
  const { user, logout } = useAuth();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listTrips()
      .then((result) => {
        if (!cancelled) setTrips(result);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Something went wrong.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const initial = (user.full_name || user.email).trim().charAt(0).toUpperCase();

  const stats = trips
    ? {
        count: trips.length,
        days: trips.reduce((sum, trip) => sum + trip.days, 0),
        budget: trips.reduce((sum, trip) => sum + trip.budget, 0),
        generated: trips.filter((trip) => trip.ai_recommendation).length,
      }
    : null;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <span className="text-xs font-bold uppercase tracking-widest text-brand-600">
        Your profile
      </span>

      <div className="mt-6 flex flex-col gap-5 rounded-3xl border border-ink-100 bg-white p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-extrabold text-ink-900">
          {initial}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-ink-900">
            {user.full_name || "Traveller"}
          </h1>
          <p className="mt-1 truncate text-sm text-ink-600">{user.email}</p>
          <p className="mt-1 text-xs text-ink-400">Account #{user.id}</p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-ink-100 px-5 py-3 text-sm font-semibold text-ink-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          Sign out
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <h2 className="mt-10 text-sm font-bold uppercase tracking-wider text-ink-400">
        Your travel totals
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Trips saved", value: stats ? String(stats.count) : "--" },
          { label: "Days planned", value: stats ? String(stats.days) : "--" },
          {
            label: "Total budget",
            value: stats ? formatCurrency(stats.budget) : "--",
            accent: true,
          },
          {
            label: "AI itineraries",
            value: stats ? String(stats.generated) : "--",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-ink-100 bg-white p-4"
          >
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              {item.label}
            </dt>
            <dd
              className={`mt-1 text-2xl font-extrabold ${
                item.accent ? "text-brand-600" : "text-ink-900"
              }`}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/plan"
          className="inline-flex items-center justify-center rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Plan a new trip
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-ink-100 px-5 py-3 text-sm font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
        >
          See your trips
        </Link>
      </div>
    </section>
  );
}
