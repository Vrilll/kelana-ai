/**
 * Presentation helpers shared by the planner and the history dashboard:
 * how a trip's destination, budget, category and travel style are rendered.
 */

/**
 * Keyword -> ISO 3166-1 alpha-2 country code. Cities are listed alongside
 * their country so that "Kyoto, Japan", "kyoto" and "Japan" all resolve to JP.
 *
 * Codes rather than flag emoji on purpose: Windows ships no country-flag font,
 * so an emoji flag degrades into bare letters there. A code maps to a real
 * flag image instead, which looks the same on every platform.
 */
const COUNTRY_CODES: Record<string, string> = {
  japan: "jp",
  tokyo: "jp",
  kyoto: "jp",
  osaka: "jp",
  indonesia: "id",
  bali: "id",
  jakarta: "id",
  yogyakarta: "id",
  bandung: "id",
  lombok: "id",
  greece: "gr",
  santorini: "gr",
  athens: "gr",
  france: "fr",
  paris: "fr",
  nice: "fr",
  iceland: "is",
  reykjavik: "is",
  morocco: "ma",
  marrakech: "ma",
  casablanca: "ma",
  italy: "it",
  rome: "it",
  venice: "it",
  milan: "it",
  spain: "es",
  barcelona: "es",
  madrid: "es",
  thailand: "th",
  bangkok: "th",
  phuket: "th",
  "chiang mai": "th",
  vietnam: "vn",
  hanoi: "vn",
  "ho chi minh": "vn",
  singapore: "sg",
  malaysia: "my",
  "kuala lumpur": "my",
  "south korea": "kr",
  korea: "kr",
  seoul: "kr",
  busan: "kr",
  china: "cn",
  beijing: "cn",
  shanghai: "cn",
  "hong kong": "hk",
  taiwan: "tw",
  taipei: "tw",
  india: "in",
  delhi: "in",
  mumbai: "in",
  "united kingdom": "gb",
  england: "gb",
  london: "gb",
  scotland: "gb",
  edinburgh: "gb",
  ireland: "ie",
  dublin: "ie",
  germany: "de",
  berlin: "de",
  munich: "de",
  netherlands: "nl",
  amsterdam: "nl",
  switzerland: "ch",
  zurich: "ch",
  austria: "at",
  vienna: "at",
  portugal: "pt",
  lisbon: "pt",
  porto: "pt",
  norway: "no",
  oslo: "no",
  sweden: "se",
  stockholm: "se",
  denmark: "dk",
  copenhagen: "dk",
  finland: "fi",
  helsinki: "fi",
  turkey: "tr",
  istanbul: "tr",
  egypt: "eg",
  cairo: "eg",
  "south africa": "za",
  "cape town": "za",
  kenya: "ke",
  nairobi: "ke",
  "united states": "us",
  usa: "us",
  "new york": "us",
  "los angeles": "us",
  "san francisco": "us",
  hawaii: "us",
  canada: "ca",
  toronto: "ca",
  vancouver: "ca",
  mexico: "mx",
  brazil: "br",
  "rio de janeiro": "br",
  argentina: "ar",
  "buenos aires": "ar",
  peru: "pe",
  cusco: "pe",
  chile: "cl",
  australia: "au",
  sydney: "au",
  melbourne: "au",
  "new zealand": "nz",
  auckland: "nz",
  queenstown: "nz",
  "united arab emirates": "ae",
  uae: "ae",
  dubai: "ae",
  "abu dhabi": "ae",
  "saudi arabia": "sa",
  qatar: "qa",
  philippines: "ph",
  manila: "ph",
  cambodia: "kh",
  laos: "la",
  nepal: "np",
  "sri lanka": "lk",
  maldives: "mv",
  georgia: "ge",
  tbilisi: "ge",
};

export type DestinationCountry = {
  /** ISO alpha-2, lowercase */
  code: string;
  /** Uppercase code, used as the image's alt text and offline fallback */
  label: string;
  flagUrl: string;
};

/**
 * Best-effort country for a destination string. Returns null when the
 * destination is not in the table rather than guessing a wrong country -
 * callers render a neutral globe for that case.
 */
export function getDestinationCountry(
  destination: string,
): DestinationCountry | null {
  const haystack = destination.toLowerCase();

  // Longest key first, so "south korea" is not shadowed by "korea" and
  // "venice" is not mistaken for "nice".
  const match = Object.keys(COUNTRY_CODES)
    .sort((a, b) => b.length - a.length)
    .find((key) => haystack.includes(key));

  if (!match) return null;

  const code = COUNTRY_CODES[match];
  return {
    code,
    label: code.toUpperCase(),
    flagUrl: `https://flagcdn.com/w80/${code}.png`,
  };
}

/**
 * Renders 2000 as "USD 2,000" rather than a bare number. Intl joins the code
 * and the amount with a non-breaking space, which is what we want - it stops
 * "USD" from wrapping onto its own line inside a narrow card.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(value);
}

export type BadgeStyle = { label: string; className: string };

const CATEGORY_BADGES: Record<string, BadgeStyle> = {
  Backpacker: {
    label: "Backpacker",
    className: "bg-brand-100 text-brand-700 ring-brand-300/50",
  },
  Standard: {
    label: "Standard",
    className: "bg-sunset-100 text-sunset-700 ring-sunset-400/50",
  },
  Luxury: {
    label: "Luxury",
    className: "bg-ink-800 text-white ring-ink-800/40",
  },
};

export function getCategoryBadge(category: string): BadgeStyle {
  return (
    CATEGORY_BADGES[category] ?? {
      label: category,
      className: "bg-ink-100 text-ink-600 ring-ink-400/40",
    }
  );
}

export type StyleIconName = "solo" | "couple" | "family" | "unknown";

export type StyleBadge = BadgeStyle & { icon: StyleIconName };

const TRAVEL_STYLE_BADGES: Record<string, StyleBadge> = {
  Solo: {
    label: "Solo",
    icon: "solo",
    className: "bg-sky-100 text-sky-800 ring-sky-400/50",
  },
  Couple: {
    label: "Couple",
    icon: "couple",
    className: "bg-rose-100 text-rose-800 ring-rose-400/50",
  },
  Family: {
    label: "Family",
    icon: "family",
    className: "bg-violet-100 text-violet-800 ring-violet-400/50",
  },
};

export const TRAVEL_STYLES = ["Solo", "Couple", "Family"] as const;

export type TravelStyle = (typeof TRAVEL_STYLES)[number];

/**
 * Trips saved before the travel_style column existed have none. Those get a
 * neutral badge instead of being labelled with a style nobody picked.
 */
export function getTravelStyleBadge(style: string | null): StyleBadge {
  if (!style) {
    return {
      label: "Style not set",
      icon: "unknown",
      className: "bg-ink-100 text-ink-400 ring-ink-400/30",
    };
  }

  return (
    TRAVEL_STYLE_BADGES[style] ?? {
      label: style,
      icon: "unknown",
      className: "bg-ink-100 text-ink-600 ring-ink-400/40",
    }
  );
}
