/**
 * Presentation helpers for the chat interface: how a message timestamp and a
 * conversation's last-active time are rendered.
 */

/**
 * A message bubble's timestamp: "14:32" for something sent today, otherwise
 * "Sep 3, 14:32" so an old message in a long-running conversation still says
 * which day it was without the reader having to guess.
 */
export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (isToday) return time;

  const day = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);

  return `${day}, ${time}`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
});

/** A conversation list row's "last active": "3 hours ago", "just now". */
export function formatRelativeTime(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;

  if (seconds < 45) return "just now";

  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (seconds >= unitSeconds) {
      return relativeFormatter.format(-Math.round(seconds / unitSeconds), unit);
    }
  }

  return relativeFormatter.format(-Math.round(seconds / 60), "minute");
}
