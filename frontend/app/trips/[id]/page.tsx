import type { Metadata } from "next";

import RequireAuth from "@/components/RequireAuth";
import TripDetail from "@/components/TripDetail";

export const metadata: Metadata = {
  title: "Trip detail | KelanaAI",
  description: "The full itinerary and budget breakdown for one saved trip.",
};

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RequireAuth>
      <TripDetail tripId={Number(id)} />
    </RequireAuth>
  );
}
