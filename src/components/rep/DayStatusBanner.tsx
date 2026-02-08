import { DailyLog } from "@/hooks/useRepWorkflow";
import { Clock, MapPin, CheckCircle2 } from "lucide-react";

interface DayStatusBannerProps {
  todayLog: DailyLog | null;
}

export default function DayStatusBanner({ todayLog }: DayStatusBannerProps) {
  if (!todayLog) {
    return (
      <div className="rounded-xl bg-muted p-4 flex items-center gap-3">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-semibold text-foreground">Not Started</p>
          <p className="text-sm text-muted-foreground">Start your day to begin tracking.</p>
        </div>
      </div>
    );
  }

  if (todayLog.status === "completed") {
    return (
      <div className="rounded-xl bg-success/10 border border-success/20 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <div>
          <p className="font-semibold text-foreground">Day Completed</p>
          <p className="text-sm text-muted-foreground">
            Start: {todayLog.start_meter} · End: {todayLog.end_meter} · Official: {todayLog.official_km} km
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl gradient-success text-success-foreground p-4 flex items-center gap-3 animate-pulse-success">
      <MapPin className="h-5 w-5" />
      <div>
        <p className="font-semibold">On Duty</p>
        <p className="text-sm opacity-90">
          Start Meter: {todayLog.start_meter} km
        </p>
      </div>
    </div>
  );
}
