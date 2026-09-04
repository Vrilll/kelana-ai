"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

const signedInLinks = [
  { href: "/plan", label: "Plan a trip" },
  { href: "/dashboard", label: "Trip history" },
  { href: "/chat", label: "Chat" },
  { href: "/profile", label: "Profile" },
];

const signedOutLinks = [
  { href: "/#destinations", label: "Destinations" },
  { href: "/#how-it-works", label: "How it works" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  const links = user ? signedInLinks : signedOutLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-900/95 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8"
        aria-label="Main"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-ink-900 shadow-lg shadow-brand-500/30">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Kelana<span className="text-brand-300">AI</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => {
            // startsWith too, so "Chat" stays highlighted on /chat/[id].
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`text-sm font-medium transition-colors hover:text-white ${
                    isActive ? "text-brand-300" : "text-ink-100/80"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Rendered only once the stored session has been read, so the bar does
            not flash "Sign in" at somebody who is already logged in. */}
        {isLoading ? (
          <span className="h-9 w-28 animate-pulse rounded-full bg-white/10" />
        ) : user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="hidden max-w-[10rem] truncate text-sm font-medium text-ink-100/80 transition-colors hover:text-white sm:block"
            >
              {user.full_name || user.email}
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-900 transition-transform hover:-translate-y-0.5 hover:bg-brand-100 sm:px-5"
            >
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
