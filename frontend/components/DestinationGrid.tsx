"use client";

import Image from "next/image";

const destinations = [
  {
    name: "Kyoto",
    country: "Japan",
    blurb: "Temples at dawn, kaiseki at dusk.",
    price: "from $1,400",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=80",
    alt: "The Kyoto skyline and a pagoda at sunset",
  },
  {
    name: "Bali",
    country: "Indonesia",
    blurb: "Rice terraces, reef dives and warungs.",
    price: "from $650",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    alt: "Pura Ulun Danu Beratan temple mirrored in a Balinese lake",
  },
  {
    name: "Santorini",
    country: "Greece",
    blurb: "White cliffs and very long sunsets.",
    price: "from $1,900",
    image:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
    alt: "Whitewashed houses stacked down the cliffs of Santorini at dusk",
  },
  {
    name: "Paris",
    country: "France",
    blurb: "Museums, markets and morning pastries.",
    price: "from $1,600",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    alt: "The Eiffel Tower above the Seine at sunset",
  },
  {
    name: "Reykjavik",
    country: "Iceland",
    blurb: "Black sand coastlines and glacier air.",
    price: "from $2,100",
    image:
      "https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1200&q=80",
    alt: "Vestrahorn mountain above a black sand beach in Iceland",
  },
  {
    name: "Marrakech",
    country: "Morocco",
    blurb: "Souks, riads and mint tea on rooftops.",
    price: "from $900",
    image:
      "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1200&q=80",
    alt: "A tiled Moroccan fountain framed by carved stucco arches",
  },
];

type DestinationGridProps = {
  onSelect: (destination: string) => void;
};

export default function DestinationGrid({ onSelect }: DestinationGridProps) {
  return (
    <section id="destinations" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="max-w-2xl">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-600">
          Popular right now
        </span>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Destinations travellers keep asking for
        </h2>
        <p className="mt-4 text-base leading-relaxed text-ink-600">
          Pick one to prefill the planner, or type your own. Every plan is built
          from your budget, not a template.
        </p>
      </div>

      {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((destination) => (
          <article
            key={destination.name}
            className="group overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink-900/10"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100">
              <Image
                src={destination.image}
                alt={destination.alt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink-800 backdrop-blur">
                {destination.price}
              </span>
            </div>

            <div className="p-5 sm:p-6">
              <h3 className="text-lg font-bold text-ink-900">
                {destination.name}
                <span className="ml-2 text-sm font-medium text-ink-400">
                  {destination.country}
                </span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {destination.blurb}
              </p>
              <button
                type="button"
                onClick={() =>
                  onSelect(`${destination.name}, ${destination.country}`)
                }
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
              >
                Plan this trip
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
