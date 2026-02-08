import { useState } from "react";
import { useRepWorkflow } from "@/hooks/useRepWorkflow";
import AppHeader from "@/components/AppHeader";
import StartDayCard from "@/components/rep/StartDayCard";
import EndDayCard from "@/components/rep/EndDayCard";
import ShopList from "@/components/rep/ShopList";
import VisitLog from "@/components/rep/VisitLog";
import FuelLogCard from "@/components/rep/FuelLogCard";
import DayStatusBanner from "@/components/rep/DayStatusBanner";
import DailyHistory from "@/components/rep/DailyHistory";
import { Loader2 } from "lucide-react";

export default function RepDashboard() {
  const { todayLog, shops, visits, fuelLogs, loading, profile, startDay, endDay, recordVisit, updateVisit, addFuelLog, deleteFuelLog } = useRepWorkflow();
  const [showEndDay, setShowEndDay] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dayStarted = todayLog !== null;
  const dayCompleted = todayLog?.status === "completed";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Day Status */}
        <DayStatusBanner todayLog={todayLog} />

        {/* Start Day */}
        {!dayStarted && <StartDayCard onStart={startDay} initialVehicleNumber={profile?.vehicle_number} />}

        {/* Active Day */}
        {dayStarted && !dayCompleted && (
          <>
            <ShopList shops={shops} visits={visits} onVisit={recordVisit} onUpdateVisit={updateVisit} />
            <EndDayCard
              todayLog={todayLog}
              showEndDay={showEndDay}
              setShowEndDay={setShowEndDay}
              onEnd={endDay}
            />
          </>
        )}

        {/* Visit History */}
        {visits.length > 0 && <VisitLog visits={visits} shops={shops} />}

        {/* Fuel Log — always visible when day is started */}
        {dayStarted && (
          <FuelLogCard fuelLogs={fuelLogs} onAdd={addFuelLog} onDelete={deleteFuelLog} locked={dayCompleted} />
        )}

        {/* Day Completed */}
        {dayCompleted && (
          <div className="text-center py-8">
            <div className="text-6xl mb-3">🏁</div>
            <h3 className="text-xl font-bold text-foreground">Day Complete</h3>
            <p className="text-muted-foreground mt-1">
              Official KM: <span className="font-bold text-success">{todayLog.official_km}</span>
            </p>
          </div>
        )}

        {/* Past Daily History */}
        <DailyHistory />
      </main>
    </div>
  );
}
