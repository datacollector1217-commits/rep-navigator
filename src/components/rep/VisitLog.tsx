import { Visit, Shop } from "@/hooks/useRepWorkflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock } from "lucide-react";

interface VisitLogProps {
  visits: Visit[];
  shops: Shop[];
}

const outcomeLabels: Record<Visit["outcome"], string> = {
  order_taken: "📦 Order Taken",
  collection: "💰 Collection",
  just_visit: "👋 Just Visit",
  shop_closed: "🔒 Shop Closed",
};

export default function VisitLog({ visits, shops }: VisitLogProps) {
  const shopMap = new Map(shops.map((s) => [s.id, s.name]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Today's Visits ({visits.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visits.map((visit) => (
          <div
            key={visit.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{shopMap.get(visit.shop_id) || "Unknown Shop"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {new Date(visit.visit_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {visit.outcome.split(",").map((o) => (
                  <Badge key={o} variant="outline" className="text-[10px] h-5 px-1.5">
                    {outcomeLabels[o as keyof typeof outcomeLabels] || o}
                  </Badge>
                ))}
              </div>
              {visit.note && <p className="text-xs text-muted-foreground mt-1 italic">"{visit.note}"</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
