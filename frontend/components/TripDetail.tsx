"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import TravelStyleIcon from "@/components/TravelStyleIcon";
import {
  ApiError,
  deleteTrip,
  generateItinerary,
  getTrip,
  updateTripBudget,
  type Trip,
} from "@/lib/api";
import {
  formatCurrency,
  getCategoryBadge,
  getDestinationCountry,
  getTravelStyleBadge,
} from "@/lib/trip-display";

const badgeClass =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1 ring-inset";

export default function TripDetail({ tripId }: { tripId: number }) {
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState<null | "generate" | "save" | "delete">(null);

  useEffect(() => {
    if (!Number.isFinite(tripId)) {
      setError("That trip id is not valid.");
      setStatus(404);
      return;
    }

    let cancelled = false;

    getTrip(tripId)
      .then((result) => {
        if (cancelled) return;
        setTrip(result);
        setBudget(String(result.budget));
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setStatus(caught instanceof ApiError ? caught.status : null);
        setError(
          caught instanceof Error ? caught.message : "Something went wrong.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  async function run(
    action: "generate" | "save" | "delete",
    work: () => Promise<void>,
  ) {
    setError(null);
    setBusy(action);
    try {
      await work();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    } finally {
      setBusy(null);
    }
  }

  // A 403 here means the trip exists but belongs to someone else.
  if (error && !trip) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-ink-100 bg-white px-6 py-14 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
            {status === 403
              ? "This trip is not yours"
              : status === 404
                ? "Trip not found"
                : "Could not load this trip"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-600">{error}</p>
          <Link
            href="/dashboard"
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Back to your trips
          </Link>
        </div>
      </section>
    );
  }

  if (!trip) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-ink-100" />
        <div className="mt-6 h-56 animate-pulse rounded-3xl border border-ink-100 bg-white" />
      </section>
    );
  }

  const country = getDestinationCountry(trip.destination);
  const category = getCategoryBadge(trip.category);
  const style = getTravelStyleBadge(trip.travel_style);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 transition-colors hover:text-brand-600"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12H6M11 18l-6-6 6-6" />
        </svg>
        All trips
      </Link>

      <header className="mt-6 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-ink-50 ring-1 ring-ink-100">
          {country ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={country.flagUrl}
              alt={country.label}
              width={40}
              height={30}
              className="h-7 w-10 rounded object-cover text-[0.6rem] font-bold text-ink-400"
            />
          ) : (
            <span className="text-xs font-bold text-ink-400">??</span>
          )}
        </span>

        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">
            {trip.destination}
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            {trip.days} {trip.days === 1 ? "day" : "days"} &middot; trip #
            {trip.id}
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`${badgeClass} ${category.className}`}>
          {category.label}
        </span>
        <span className={`${badgeClass} ${style.className}`}>
          <TravelStyleIcon name={style.icon} />
          {style.label}
        </span>
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Total budget
          </dt>
          <dd className="mt-1 text-xl font-bold text-ink-900">
            {formatCurrency(trip.budget)}
          </dd>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Daily budget
          </dt>
          <dd className="mt-1 text-xl font-bold text-brand-600">
            {formatCurrency(trip.daily_budget)}
          </dd>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Length
          </dt>
          <dd className="mt-1 text-xl font-bold text-ink-900">
            {trip.days} days
          </dd>
        </div>
      </dl>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-8 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">
          Adjust the budget
        </h2>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            run("save", async () => {
              const updated = await updateTripBudget(trip.id, Number(budget));
              setTrip(updated);
              setBudget(String(updated.budget));
            });
          }}
        >
          <label htmlFor="budget" className="sr-only">
            New total budget in USD
          </label>
          <input
            id="budget"
            type="number"
            min={1}
            step="any"
            required
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            className="w-full rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 sm:max-w-xs"
          />
          <button
            type="submit"
            disabled={busy !== null}
            className="inline-flex items-center justify-center rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "save" ? "Saving..." : "Update budget"}
          </button>
        </form>
        <p className="mt-3 text-xs text-ink-400">
          Category and daily budget are recalculated by the API.
        </p>
      </div>

      <div className="mt-6 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">
            Day-by-day plan
          </h2>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              run("generate", async () => {
                setTrip(await generateItinerary(trip.id));
              })
            }
            className="inline-flex items-center justify-center rounded-xl bg-sunset-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sunset-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "generate"
              ? "Asking Bedrock..."
              : trip.ai_recommendation
                ? "Regenerate itinerary"
                : "Generate AI itinerary"}
          </button>
        </div>

        {trip.ai_recommendation ? (
          <p className="itinerary mt-5 rounded-2xl border border-brand-100 bg-brand-50 p-5 text-sm leading-relaxed text-ink-800">
            {trip.ai_recommendation}
          </p>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-ink-100 p-5 text-sm text-ink-400">
            No itinerary yet. Generate one to see a morning, afternoon and
            evening plan for every day.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-red-700">
          Delete this trip
        </h2>
        <p className="mt-2 text-sm text-red-700/80">
          This removes the trip and its itinerary for good.
        </p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            if (!window.confirm(`Delete the trip to ${trip.destination}?`)) return;
            run("delete", async () => {
              await deleteTrip(trip.id);
              router.push("/dashboard");
            });
          }}
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "delete" ? "Deleting..." : "Delete trip"}
        </button>
      </div>
    </section>
  );
}
