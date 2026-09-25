"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type PageMeta = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next?: boolean;
  has_prev?: boolean;
};

type Props = {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  className?: string;
  compact?: boolean;
};

export function Pagination({ meta, onPageChange, className, compact }: Props) {
  if (meta.total_pages <= 1) return null;

  const { page, total_pages, total } = meta;
  const from = (page - 1) * meta.page_size + 1;
  const to = Math.min(page * meta.page_size, total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border)]",
        className
      )}
    >
      {!compact && (
        <p className="text-xs font-mono text-[var(--text-muted)]">
          {from}–{to} of {total}
        </p>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="btn-ghost p-2 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-mono text-xs text-[var(--text-secondary)] min-w-[4.5rem] text-center">
          {page} / {total_pages}
        </span>
        <button
          type="button"
          disabled={page >= total_pages}
          onClick={() => onPageChange(page + 1)}
          className="btn-ghost p-2 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
