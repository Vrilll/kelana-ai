"use client";

import { useSearchParams } from "next/navigation";

import TripPlanner from "@/components/TripPlanner";

/**
 * The protected /plan page. Destination cards on the homepage link here with
 * ?destination=..., so the form arrives prefilled.
 */
export default function PlannerExperience() {
  const searchParams = useSearchParams();
  const initialDestination = searchParams.get("destination") ?? "";

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-8">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-600">
          Plan a trip
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Build your itinerary
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-600">
          Four details is all KelanaAI needs. The trip is saved to your account,
          then Amazon Bedrock writes the day-by-day plan.
        </p>
      </header>

      <TripPlanner initialDestination={initialDestination} />
    </section>
  );
}
