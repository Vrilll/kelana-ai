const steps = [
  {
    step: "01",
    title: "Tell us the basics",
    body: "Destination, number of days, total budget. The API saves the trip to PostgreSQL and works out your category and daily spend.",
  },
  {
    step: "02",
    title: "Bedrock writes the plan",
    body: "Amazon Bedrock turns those numbers into a structured day-by-day itinerary: morning, afternoon and evening for every single day.",
  },
  {
    step: "03",
    title: "Adjust and go",
    body: "Change the budget and the plan recalculates. Your trips stay saved, so you can come back and pick up where you left off.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-ink-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-300">
            How it works
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            From three inputs to a real itinerary
          </h2>
        </div>

        <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((item) => (
            <li
              key={item.step}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8"
            >
              <span className="text-sm font-extrabold tracking-widest text-sunset-400">
                {item.step}
              </span>
              <h3 className="mt-4 text-lg font-bold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-100/70">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
