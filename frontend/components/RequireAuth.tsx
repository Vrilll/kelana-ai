"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/AuthProvider";

/**
 * Client-side guard for the pages that need an account.
 *
 * This is a UX convenience, not the security boundary: the real protection is
 * the API, which requires a bearer token and answers 403 for somebody else's
 * trip. A visitor who skips this guard still cannot read any data.
 */
export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isSigningOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // On an explicit sign-out, logout() is already navigating to /login and
    // there is nothing worth coming back to.
    if (isSigningOut) return;

    if (!isLoading && !user) {
      // Remember where they were headed so login can send them back.
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, isSigningOut, router, pathname]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-ink-100" />
        <div className="mt-4 h-4 w-72 animate-pulse rounded bg-ink-100" />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-52 animate-pulse rounded-3xl border border-ink-100 bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    // The redirect above is already running; render nothing in the meantime.
    return null;
  }

  return <>{children}</>;
}
