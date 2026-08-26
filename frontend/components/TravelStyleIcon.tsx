import type { StyleIconName } from "@/lib/trip-display";

/**
 * Inline SVG rather than emoji: emoji people/family glyphs render at wildly
 * different sizes across platforms, and the family sequence falls apart on
 * systems without ZWJ support.
 */
export default function TravelStyleIcon({ name }: { name: StyleIconName }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-3.5 w-3.5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "solo") {
    return (
      <svg {...common}>
        <circle cx="12" cy="7.5" r="3.5" />
        <path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      </svg>
    );
  }

  if (name === "couple") {
    return (
      <svg {...common}>
        <circle cx="8" cy="7.5" r="3" />
        <circle cx="16" cy="7.5" r="3" />
        <path d="M2.5 20c0-3.1 2.5-5 5.5-5s5.5 1.9 5.5 5" />
        <path d="M14 15.4c.6-.3 1.3-.4 2-.4 3 0 5.5 1.9 5.5 5" />
      </svg>
    );
  }

  if (name === "family") {
    return (
      <svg {...common}>
        <circle cx="7" cy="7" r="2.8" />
        <circle cx="17" cy="7" r="2.8" />
        <circle cx="12" cy="13.5" r="2.2" />
        <path d="M1.8 19c0-2.9 2.3-4.7 5.2-4.7" />
        <path d="M22.2 19c0-2.9-2.3-4.7-5.2-4.7" />
        <path d="M8.5 21c0-2 1.6-3.2 3.5-3.2S15.5 19 15.5 21" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.9c-.6.2-.9.7-.9 1.3v.5" />
      <path d="M12 17.4h.01" />
    </svg>
  );
}
