"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ActivityFeed, type ActivityRow } from "@/components/dashboard/ActivityFeed";
import { Pagination, type PageMeta } from "@/components/ui/Pagination";

type ListResponse = {
  activities: ActivityRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next?: boolean;
  has_prev?: boolean;
};

type Props = {
  pageSize?: number;
  /** Reset to page 1 when this changes */
  refreshKey?: number;
  emptyMessage?: string;
};

export function PaginatedActivitiesSection({
  pageSize = 15,
  refreshKey = 0,
  emptyMessage = "No activities synced yet.",
}: Props) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ListResponse>(
        `/api/activities?page=${page}&page_size=${pageSize}`
      );
      setRows(data.activities);
      setMeta({
        page: data.page,
        page_size: data.page_size,
        total: data.total,
        total_pages: data.total_pages,
        has_next: data.has_next,
        has_prev: data.has_prev,
      });
    } catch {
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [refreshKey]);

  if (loading && !rows.length) {
    return <p className="text-sm text-[var(--text-muted)] py-8 text-center">Loading activities…</p>;
  }

  if (!rows.length) {
    return <p className="text-sm text-[var(--text-muted)] py-8 text-center">{emptyMessage}</p>;
  }

  return (
    <div className={loading ? "opacity-60 pointer-events-none" : ""}>
      <ActivityFeed activities={rows} />
      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </div>
  );
}
