"use client";

import { useState } from "react";

import DestinationGrid from "@/components/DestinationGrid";
import TripPlanner from "@/components/TripPlanner";

/**
 * Holds the destination shared between the planner form and the destination
 * cards, so picking a card fills the form in instead of only linking to it.
 */
export default function PlannerExperience() {
  const [destination, setDestination] = useState("");

  function handleSelect(name: string) {
    setDestination(name);
    document.getElementById("plan")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <TripPlanner
        destination={destination}
        onDestinationChange={setDestination}
      />
      <DestinationGrid onSelect={handleSelect} />
    </>
  );
}
