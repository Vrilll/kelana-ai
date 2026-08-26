"use client";

type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

const buttonBase =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Builds a compact page list with gaps, e.g. 1 … 4 5 6 … 12, so the control
 * stays one row wide no matter how many trips are saved.
 */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const items = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const pages = [...items]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  const withGaps: (number | "gap")[] = [];
  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) withGaps.push("gap");
    withGaps.push(value);
  });

  return withGaps;
}

export default function Pagination({
  page,
  pageCount,
  onPageChange,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Trip history pages"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className={`${buttonBase} border border-ink-100 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700`}
      >
        Previous
      </button>

      {pageItems(page, pageCount).map((item, index) =>
        item === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 text-sm text-ink-400"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={`${buttonBase} ${
              item === page
                ? "bg-ink-900 text-white"
                : "border border-ink-100 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700"
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount}
        className={`${buttonBase} border border-ink-100 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700`}
      >
        Next
      </button>
    </nav>
  );
}
