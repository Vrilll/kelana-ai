import Image from "next/image";

const stats = [
  { value: "120+", label: "Destinations covered" },
  { value: "3 sec", label: "Average plan time" },
  { value: "100%", label: "Tailored to your budget" },
];

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink-900">
      {/* Hero image — falls back to the gradient underneath if it cannot load */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ink-900 via-brand-700 to-ink-900">
        <Image
          src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=2000&q=80"
          alt="Yasaka Pagoda rising over a lantern-lit street in Kyoto at dusk"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-70"
        />
      </div>
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-900/85 via-ink-900/60 to-ink-900/95"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300/40 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />
            Powered by Amazon Bedrock
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Plan a trip you will
            <span className="block bg-gradient-to-r from-brand-300 to-sunset-400 bg-clip-text text-transparent">
              actually take.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-100/80 sm:text-lg">
            Tell KelanaAI where you are going, how long you have and what you can
            spend. You get a day-by-day itinerary — morning, afternoon and
            evening — built around your real budget.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#plan"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-semibold text-ink-900 shadow-xl shadow-brand-500/25 transition-transform hover:-translate-y-0.5 hover:bg-brand-300"
            >
              Plan my trip
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
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </a>
            <a
              href="#destinations"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Browse destinations
            </a>
          </div>
        </div>

        <dl className="mt-14 grid grid-cols-1 gap-4 border-t border-white/10 pt-8 sm:mt-16 sm:grid-cols-3 sm:gap-8">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-2xl font-extrabold text-white sm:text-3xl">
                {stat.value}
              </dt>
              <dd className="mt-1 text-sm text-ink-100/70">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
