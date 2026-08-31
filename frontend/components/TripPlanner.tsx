"use client";

import Link from "next/link";
import { useState } from "react";

import TravelStyleIcon from "@/components/TravelStyleIcon";
import { createTrip, generateItinerary, type Trip } from "@/lib/api";
import {
  formatCurrency,
  getCategoryBadge,
  getTravelStyleBadge,
  TRAVEL_STYLES,
  type TravelStyle,
} from "@/lib/trip-display";

const inputClass =
  "w-full rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15";

const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-400";

const badgeClass =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1 ring-inset";

export default function TripPlanner({
  initialDestination = "",
}: {
  initialDestination?: string;
}) {
  const [destination, setDestination] = useState(initialDestination);
  const [days, setDays] = useState("5");
  const [budget, setBudget] = useState("1500");
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("Solo");

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
      setTrip(
        await createTrip({
          destination: destination.trim(),
          days: Number(days),
          budget: Number(budget),
          travel_style: travelStyle,
        }),
      );
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

  const category = trip ? getCategoryBadge(trip.category) : null;
  const style = trip ? getTravelStyleBadge(trip.travel_style) : null;

  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-xl shadow-ink-900/5 sm:p-8 lg:p-10">
      {/* Stacks on mobile, sits on one row from md up */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-12">
        <div className="md:col-span-4">
          <label htmlFor="destination" className={labelClass}>
            Destination
          </label>
          <input
            id="destination"
            name="destination"
            type="text"
            required
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Kyoto, Japan"
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="days" className={labelClass}>
            Days
          </label>
          <input
            id="days"
            name="days"
            type="number"
            min={1}
            max={365}
            required
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className={inputClass}
          />
        </div>

        <div className="md:col-span-3">
          <label htmlFor="budget" className={labelClass}>
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
            className={inputClass}
          />
        </div>

        <div className="md:col-span-3">
          <label htmlFor="travel-style" className={labelClass}>
            Travel style
          </label>
          <select
            id="travel-style"
            name="travel_style"
            value={travelStyle}
            onChange={(event) => setTravelStyle(event.target.value as TravelStyle)}
            className={`${inputClass} appearance-none`}
          >
            {TRAVEL_STYLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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

      {trip && category && style && (
        <div className="animate-rise mt-8 border-t border-ink-100 pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className={`${badgeClass} ${category.className}`}>
                  {category.label}
                </span>
                <span className={`${badgeClass} ${style.className}`}>
                  <TravelStyleIcon name={style.icon} />
                  {style.label}
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900">
                {trip.destination}
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                {trip.days} days &middot;{" "}
                <Link
                  href={`/trips/${trip.id}`}
                  className="font-semibold text-brand-600 hover:text-brand-700"
                >
                  open trip #{trip.id}
                </Link>
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
              <dt className={labelClass}>Total budget</dt>
              <dd className="mt-1 text-xl font-bold text-ink-900">
                {formatCurrency(trip.budget)}
              </dd>
            </div>
            <div className="rounded-2xl bg-ink-50 p-4">
              <dt className={labelClass}>Daily budget</dt>
              <dd className="mt-1 text-xl font-bold text-brand-600">
                {formatCurrency(trip.daily_budget)}
              </dd>
            </div>
            <div className="rounded-2xl bg-ink-50 p-4">
              <dt className={labelClass}>Length</dt>
              <dd className="mt-1 text-xl font-bold text-ink-900">
                {trip.days} days
              </dd>
            </div>
          </dl>

          {trip.ai_recommendation && (
            <article className="animate-rise mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-5 sm:p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-700">
                Your day-by-day plan
              </h3>
              <p className="itinerary mt-3 text-sm leading-relaxed text-ink-800">
                {trip.ai_recommendation}
              </p>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
