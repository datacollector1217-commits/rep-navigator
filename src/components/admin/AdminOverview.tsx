import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Store, ClipboardList, Truck } from "lucide-react";

interface Stats {
  totalReps: number;
  totalShops: number;
  todayLogs: number;
  todayVisits: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({ totalReps: 0, totalShops: 0, todayLogs: 0, todayVisits: 0 });
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    const fetchStats = async () => {
      const [repsRes, shopsRes, logsRes, visitsRes] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "rep"),
        supabase.from("shops").select("id", { count: "exact", head: true }),
        supabase.from("daily_logs").select("id", { count: "exact", head: true }).eq("log_date", today),
        supabase.from("visits").select("id", { count: "exact", head: true }).gte("visit_time", today + "T00:00:00"),
      ]);
      setStats({
        totalReps: repsRes.count || 0,
        totalShops: shopsRes.count || 0,
        todayLogs: logsRes.count || 0,
        todayVisits: visitsRes.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, [today]);

  const cards = [
    { label: "Sales Reps", value: stats.totalReps, icon: Users, color: "text-primary" },
    { label: "Shops", value: stats.totalShops, icon: Store, color: "text-success" },
    { label: "Active Today", value: stats.todayLogs, icon: Truck, color: "text-warning" },
    { label: "Visits Today", value: stats.todayVisits, icon: ClipboardList, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold">{loading ? "—" : c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
