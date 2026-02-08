import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Loader2, Filter, X } from "lucide-react";
import HistoryDateFilter from "./HistoryDateFilter";
import HistoryLogItem from "./HistoryLogItem";

const PAGE_SIZE = 10;

export interface HistoryLog {
  id: string;
  log_date: string;
  start_meter: number | null;
  end_meter: number | null;
  personal_km: number;
  official_km: number;
  status: "started" | "completed";
}

export interface HistoryVisit {
  id: string;
  shop_id: string;
  visit_time: string;
  outcome: string;
  note: string | null;
  shops: { name: string; town: string | null } | null;
}

export default function DailyHistory() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [visitsByLog, setVisitsByLog] = useState<Record<string, HistoryVisit[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Use local date format for 'today' to avoid UTC shifts
  const today = format(new Date(), "yyyy-MM-dd");

  const fetchPage = useCallback(async (offset: number) => {
    if (!user) return;

    const isInitial = offset === 0;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      let query = supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .lt("log_date", today)
        .order("log_date", { ascending: false });

      // Apply date range filters using proper formatting
      if (dateFrom) {
        query = query.gte("log_date", format(dateFrom, "yyyy-MM-dd"));
      }
      if (dateTo) {
        query = query.lte("log_date", format(dateTo, "yyyy-MM-dd"));
      }

      const { data: logsData } = await query.range(offset, offset + PAGE_SIZE - 1);

      const newLogs = (logsData || []) as unknown as HistoryLog[];

      if (newLogs.length < PAGE_SIZE) {
        setHasMore(false);
      }

      let newVisits: Record<string, HistoryVisit[]> = {};
      if (newLogs.length > 0) {
        const logIds = newLogs.map((l) => l.id);
        const { data: visitsData } = await supabase
          .from("visits")
          .select("id, daily_log_id, shop_id, visit_time, outcome, note, shops(name, town)")
          .in("daily_log_id", logIds)
          .order("visit_time");

        for (const v of (visitsData || []) as any[]) {
          if (!newVisits[v.daily_log_id]) newVisits[v.daily_log_id] = [];
          newVisits[v.daily_log_id].push(v);
        }
      }

      if (isInitial) {
        setLogs(newLogs);
        setVisitsByLog(newVisits);
      } else {
        setLogs((prev) => [...prev, ...newLogs]);
        setVisitsByLog((prev) => ({ ...prev, ...newVisits }));
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  }, [user, today, dateFrom, dateTo]);

  // Reset and re-fetch when filters change
  useEffect(() => {
    setLogs([]);
    setVisitsByLog({});
    setHasMore(true);
    fetchPage(0);
  }, [fetchPage]);

  const clearFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilter = dateFrom !== undefined || dateTo !== undefined;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading history...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-primary" />
            Daily History
          </CardTitle>
          <div className="flex items-center gap-1">
            {hasActiveFilter && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFilter} title="Clear filter">
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant={showFilter ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowFilter((v) => !v)}
              title="Filter by date"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showFilter && (
          <HistoryDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            {hasActiveFilter ? "No logs found for the selected period." : "No previous daily logs found."}
          </p>
        ) : (
          <>
            {logs.map((log) => (
              <HistoryLogItem
                key={log.id}
                log={log}
                visits={visitsByLog[log.id] || []}
                isOpen={openLogId === log.id}
                onToggle={(open) => setOpenLogId(open ? log.id : null)}
              />
            ))}

            {hasMore && (
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => fetchPage(logs.length)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
