import Link from "next/link";

const footerLinks = [
  {
    heading: "Product",
    links: [
      { label: "Plan a trip", href: "#plan" },
      { label: "Destinations", href: "#destinations" },
      { label: "How it works", href: "#how-it-works" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "API docs", href: "http://127.0.0.1:8000/docs" },
      { label: "Health check", href: "http://127.0.0.1:8000/health" },
      { label: "GitHub", href: "https://github.com/Vrilll/kelana-ai" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-ink-900">
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
              <span className="text-lg font-extrabold tracking-tight text-ink-900">
                Kelana<span className="text-brand-600">AI</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-600">
              An AI travel planner built with Python, Next.js and Amazon
              Bedrock.
            </p>
          </div>

          {footerLinks.map((group) => (
            <div key={group.heading}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400">
                {group.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-ink-600 transition-colors hover:text-brand-600"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-ink-100 pt-8 sm:flex-row sm:justify-between">
          <p className="text-sm text-ink-400">
            &copy; {new Date().getFullYear()} KelanaAI. All rights reserved.
          </p>
          <p className="text-sm text-ink-400">
            Built for the KelanaAI bootcamp &middot; Session 6
          </p>
        </div>
      </div>
    </footer>
  );
}
