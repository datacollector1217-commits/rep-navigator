import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, MapPin, Clock, Car } from "lucide-react";
import { format } from "date-fns";
import type { HistoryLog, HistoryVisit } from "./DailyHistory";

const OUTCOME_STYLES: Record<string, string> = {
  order_taken: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  collection: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  just_visit: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  shop_closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const OUTCOME_LABELS: Record<string, string> = {
  order_taken: "Order Taken",
  collection: "Collection",
  just_visit: "Just Visit",
  shop_closed: "Shop Closed",
};

interface HistoryLogItemProps {
  log: HistoryLog;
  visits: HistoryVisit[];
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export default function HistoryLogItem({ log, visits, isOpen, onToggle }: HistoryLogItemProps) {
  const totalKm = log.end_meter && log.start_meter
    ? log.end_meter - log.start_meter
    : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted/80 transition-colors">
          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-sm font-bold">
                {format(new Date(log.log_date), "EEE, dd MMM yyyy")}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  {totalKm} km
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {visits.length} visit{visits.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={log.status === "completed" ? "default" : "secondary"}
              className="text-[10px] uppercase"
            >
              {log.status}
            </Badge>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-1 ml-2 pl-3 border-l-2 border-primary/20 space-y-2 pb-2">
          <div className="flex gap-4 text-xs text-muted-foreground py-1">
            <span>Start: <strong className="text-foreground">{log.start_meter ?? "—"}</strong></span>
            <span>End: <strong className="text-foreground">{log.end_meter ?? "—"}</strong></span>
            <span>Official: <strong className="text-foreground">{log.official_km} km</strong></span>
            {log.personal_km > 0 && (
              <span>Personal: <strong className="text-foreground">{log.personal_km} km</strong></span>
            )}
          </div>

          {visits.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No visits recorded</p>
          ) : (
            visits.map((v) => (
              <div
                key={v.id}
                className="flex items-start justify-between p-2 rounded-md bg-background border border-border"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {v.shops?.name || "Unknown Shop"}
                  </p>
                  {v.shops?.town && (
                    <p className="text-xs text-muted-foreground">{v.shops.town}</p>
                  )}
                  {v.note && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">"{v.note}"</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                  <div className="flex flex-col gap-1 items-end">
                    {v.outcome.split(",").map((o) => (
                      <Badge key={o} variant="outline" className={`text-[10px] ${OUTCOME_STYLES[o] || ""}`}>
                        {OUTCOME_LABELS[o] || o}
                      </Badge>
                    ))}
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {format(new Date(v.visit_time), "hh:mm a")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
