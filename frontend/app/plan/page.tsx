import type { Metadata } from "next";
import { Suspense } from "react";

import PlannerExperience from "@/components/PlannerExperience";
import RequireAuth from "@/components/RequireAuth";

export const metadata: Metadata = {
  title: "Plan a trip | KelanaAI",
  description:
    "Turn a destination, a number of days and a budget into a day-by-day itinerary.",
};

export default function PlanPage() {
  return (
    <RequireAuth>
      {/* PlannerExperience reads ?destination= to prefill the form. */}
      <Suspense fallback={null}>
        <PlannerExperience />
      </Suspense>
    </RequireAuth>
  );
}
