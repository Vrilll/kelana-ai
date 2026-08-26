import Link from "next/link";

const links = [
  { href: "#plan", label: "Plan a trip" },
  { href: "#destinations", label: "Destinations" },
  { href: "#how-it-works", label: "How it works" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-900/80 backdrop-blur-md">
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
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-ink-100/80 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#plan"
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-900 transition-transform hover:-translate-y-0.5 hover:bg-brand-100 sm:px-5"
        >
          Start planning
        </a>
      </nav>
    </header>
  );
}
