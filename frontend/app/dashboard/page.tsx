import type { Metadata } from "next";

import RequireAuth from "@/components/RequireAuth";
import TripDashboard from "@/components/TripDashboard";

export const metadata: Metadata = {
  title: "Trip history | KelanaAI",
  description:
    "Every trip you have planned with KelanaAI, with budget, category and travel style at a glance.",
};

export default function DashboardPage() {
  return (
    <RequireAuth>
      <TripDashboard />
    </RequireAuth>
  );
}
