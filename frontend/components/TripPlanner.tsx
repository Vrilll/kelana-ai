"use client";

import { useState } from "react";

import {
  createTrip,
  formatCurrency,
  generateItinerary,
  type Trip,
} from "@/lib/api";

const categoryStyles: Record<string, string> = {
  Backpacker: "bg-brand-100 text-brand-700",
  Standard: "bg-sunset-100 text-sunset-700",
  Luxury: "bg-ink-800 text-white",
};

type TripPlannerProps = {
  destination: string;
  onDestinationChange: (value: string) => void;
};

export default function TripPlanner({
  destination,
  onDestinationChange,
}: TripPlannerProps) {
  const [days, setDays] = useState("5");
  const [budget, setBudget] = useState("1500");

  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setTrip(null);
    setIsSaving(true);

    try {
      const created = await createTrip({
        destination: destination.trim(),
        days: Number(days),
        budget: Number(budget),
      });
      setTrip(created);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerate() {
    if (!trip) return;

    setError(null);
    setIsGenerating(true);

    try {
      setTrip(await generateItinerary(trip.id));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section id="plan" className="relative z-10 -mt-12 sm:-mt-16 lg:-mt-20">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-2xl shadow-ink-900/10 sm:p-8 lg:p-10">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
              Build your itinerary
            </h2>
            <p className="mt-1.5 text-sm text-ink-600">
              Three details is all KelanaAI needs to get started.
            </p>
          </div>

          {/* Stacks on mobile, sits on one row from md up */}
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 md:grid-cols-12"
          >
            <div className="md:col-span-5">
              <label
                htmlFor="destination"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400"
              >
                Destination
              </label>
              <input
                id="destination"
                name="destination"
                type="text"
                required
                value={destination}
                onChange={(event) => onDestinationChange(event.target.value)}
                placeholder="Kyoto, Japan"
                className="w-full rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
              />
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="days"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400"
              >
                Days
              </label>
              <input
                id="days"
                name="days"
                type="number"
                min={1}
                max={60}
                required
                value={days}
                onChange={(event) => setDays(event.target.value)}
                className="w-full rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
              />
            </div>

            <div className="md:col-span-4">
              <label
                htmlFor="budget"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400"
              >
                Total budget (USD)
              </label>
              <input
                id="budget"
                name="budget"
                type="number"
                min={1}
                step="any"
                required
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                className="w-full rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15"
              />
            </div>

            <div className="md:col-span-12">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                {isSaving ? "Saving your trip..." : "Create trip plan"}
              </button>
            </div>
          </form>

          {error && (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {trip && (
            <div className="animate-rise mt-8 border-t border-ink-100 pt-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      categoryStyles[trip.category] ?? "bg-ink-100 text-ink-600"
                    }`}
                  >
                    {trip.category}
                  </span>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900">
                    {trip.destination}
                  </h3>
                  <p className="mt-1 text-sm text-ink-600">
                    {trip.days} days &middot; trip #{trip.id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sunset-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sunset-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? "Asking Bedrock..." : "Generate AI itinerary"}
                </button>
              </div>

              <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-ink-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Total budget
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-ink-900">
                    {formatCurrency(trip.budget)}
                  </dd>
                </div>
                <div className="rounded-2xl bg-ink-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Daily budget
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-brand-600">
                    {formatCurrency(trip.daily_budget)}
                  </dd>
                </div>
                <div className="rounded-2xl bg-ink-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Length
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-ink-900">
                    {trip.days} days
                  </dd>
                </div>
              </dl>

              {trip.ai_recommendation && (
                <article className="animate-rise mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-5 sm:p-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-brand-700">
                    Your day-by-day plan
                  </h4>
                  <p className="itinerary mt-3 text-sm leading-relaxed text-ink-800">
                    {trip.ai_recommendation}
                  </p>
                </article>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
