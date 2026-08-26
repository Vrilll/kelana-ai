"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Pagination from "@/components/Pagination";
import TripCard from "@/components/TripCard";
import { listTrips, type Trip } from "@/lib/api";
import { formatCurrency } from "@/lib/trip-display";

const PAGE_SIZE = 10;

export default function TripDashboard() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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

  const stats = useMemo(() => {
    if (!trips || trips.length === 0) return null;
    const totalBudget = trips.reduce((sum, trip) => sum + trip.budget, 0);
    const totalDays = trips.reduce((sum, trip) => sum + trip.days, 0);
    const generated = trips.filter((trip) => trip.ai_recommendation).length;
    return { totalBudget, totalDays, generated };
  }, [trips]);

  const pageCount = trips ? Math.max(1, Math.ceil(trips.length / PAGE_SIZE)) : 1;
  const visible = trips
    ? trips.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : [];

  function goToPage(next: number) {
    setPage(Math.min(Math.max(next, 1), pageCount));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="flex flex-col gap-6 border-b border-ink-100 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-600">
            Trip history
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Your saved trips
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-600">
            Every trip you plan is stored in PostgreSQL, so it is still here
            next time you come back.
          </p>
        </div>

        <Link
          href="/#plan"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Plan a new trip
        </Link>
      </header>

      {stats && (
        <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-ink-100 bg-white p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Trips saved
            </dt>
            <dd className="mt-1 text-2xl font-extrabold text-ink-900">
              {trips?.length}
            </dd>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Days planned
            </dt>
            <dd className="mt-1 text-2xl font-extrabold text-ink-900">
              {stats.totalDays}
            </dd>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Total budget
            </dt>
            <dd className="mt-1 text-2xl font-extrabold text-brand-600">
              {formatCurrency(stats.totalBudget)}
            </dd>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              AI itineraries
            </dt>
            <dd className="mt-1 text-2xl font-extrabold text-ink-900">
              {stats.generated}
            </dd>
          </div>
        </dl>
      )}

      {error && (
        <p
          role="alert"
          className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {!trips && !error && (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-3xl border border-ink-100 bg-white"
            />
          ))}
        </div>
      )}

      {trips && trips.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-ink-100 bg-white px-6 py-16 text-center">
          <p className="text-4xl" aria-hidden="true">
            🧭
          </p>
          <h2 className="mt-4 text-lg font-bold text-ink-900">
            No trips saved yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">
            Plan your first trip on the homepage and it will show up here.
          </p>
          <Link
            href="/#plan"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-ink-900 transition hover:bg-brand-300"
          >
            Plan my first trip
          </Link>
        </div>
      )}

      {trips && trips.length > 0 && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>

          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={goToPage}
          />

          {trips.length > PAGE_SIZE && (
            <p className="mt-4 text-center text-sm text-ink-400">
              Showing {(page - 1) * PAGE_SIZE + 1}&ndash;
              {Math.min(page * PAGE_SIZE, trips.length)} of {trips.length} trips
            </p>
          )}
        </>
      )}
    </section>
  );
}
