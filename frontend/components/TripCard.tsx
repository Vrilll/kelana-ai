import TravelStyleIcon from "@/components/TravelStyleIcon";
import type { Trip } from "@/lib/api";
import {
  formatCurrency,
  getCategoryBadge,
  getDestinationCountry,
  getTravelStyleBadge,
} from "@/lib/trip-display";

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1 ring-inset";

type TripCardProps = {
  trip: Trip;
};

export default function TripCard({ trip }: TripCardProps) {
  const country = getDestinationCountry(trip.destination);
  const category = getCategoryBadge(trip.category);
  const style = getTravelStyleBadge(trip.travel_style);

  return (
    <article className="flex h-full flex-col rounded-3xl border border-ink-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl hover:shadow-ink-900/10 sm:p-6">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-ink-50 ring-1 ring-ink-100">
          {country ? (
            // Plain img, not next/image: these are ~1KB flags and the alt text
            // doubles as the fallback if the CDN is unreachable.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={country.flagUrl}
              alt={country.label}
              width={32}
              height={24}
              loading="lazy"
              className="h-6 w-8 rounded object-cover text-[0.6rem] font-bold text-ink-400"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-ink-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Destination country unknown"
              role="img"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3Z" />
            </svg>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold tracking-tight text-ink-900">
            {trip.destination}
          </h3>
          <p className="mt-0.5 text-sm text-ink-400">
            {trip.days} {trip.days === 1 ? "day" : "days"} &middot; trip #
            {trip.id}
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`${badgeBase} ${category.className}`}>
          {category.label}
        </span>
        <span className={`${badgeBase} ${style.className}`}>
          <TravelStyleIcon name={style.icon} />
          {style.label}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-ink-50 p-3">
          <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-ink-400">
            Total budget
          </dt>
          <dd className="mt-1 text-base font-bold text-ink-900">
            {formatCurrency(trip.budget)}
          </dd>
        </div>
        <div className="rounded-2xl bg-ink-50 p-3">
          <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-ink-400">
            Per day
          </dt>
          <dd className="mt-1 text-base font-bold text-brand-600">
            {formatCurrency(trip.daily_budget)}
          </dd>
        </div>
      </dl>

      {/* mt-auto keeps this pinned to the bottom so cards in a row line up */}
      <footer className="mt-auto flex items-center gap-2 border-t border-ink-100 pt-4">
        {trip.ai_recommendation ? (
          <>
            <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
            <p className="truncate text-xs font-medium text-ink-600">
              AI itinerary ready
            </p>
          </>
        ) : (
          <>
            <span className="h-2 w-2 shrink-0 rounded-full bg-ink-100 ring-1 ring-ink-400/40" />
            <p className="truncate text-xs font-medium text-ink-400">
              No itinerary generated yet
            </p>
          </>
        )}
      </footer>
    </article>
  );
}
