import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { FuelLog } from "@/components/rep/FuelLogCard";

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  start_meter: number | null;
  end_meter: number | null;
  personal_km: number;
  official_km: number;
  status: "started" | "completed";
}

export interface Shop {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  assigned_rep_id: string | null;
  town?: string | null;
  bp_code?: string | null;
}

export interface Visit {
  id: string;
  daily_log_id: string;
  shop_id: string;
  user_id: string;
  visit_time: string;
  gps_lat: number | null;
  gps_lng: number | null;
  meter_reading: number | null;
  outcome: string; // Comma-separated or single value
  note: string | null;
}

export function useRepWorkflow() {
  const { user, profile } = useAuth();
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.substring(0, 7); // YYYY-MM

  const fetchTodayData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [year, month] = currentMonth.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

      const [logRes, shopsRes, fuelRes] = await Promise.all([
        supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("log_date", today)
          .maybeSingle(),
        supabase
          .from("shops")
          .select("*")
          .eq("assigned_rep_id", user.id),
        supabase
          .from("fuel_logs")
          .select("*")
          .eq("user_id", user.id)
          .gte("fill_date", startDate)
          .lt("fill_date", endDate)
          .order("fill_date"),
      ]);

      if (logRes.data) {
        setTodayLog(logRes.data as unknown as DailyLog);
        // Fetch visits for today's log
        const visitsRes = await supabase
          .from("visits")
          .select("*")
          .eq("daily_log_id", logRes.data.id)
          .order("visit_time", { ascending: false });
        setVisits((visitsRes.data || []) as unknown as Visit[]);
      } else {
        setTodayLog(null);
        setVisits([]);
      }

      setShops((shopsRes.data || []) as unknown as Shop[]);
      setFuelLogs((fuelRes.data || []) as unknown as FuelLog[]);
    } catch (err) {
      console.error("Error fetching rep data:", err);
    } finally {
      setLoading(false);
    }
  }, [user, today, currentMonth]);

  useEffect(() => {
    fetchTodayData();
  }, [fetchTodayData]);

  const startDay = async (startMeter: number, vehicleNumber?: string) => {
    if (!user) return;

    // 1. Update vehicle number if provided
    if (vehicleNumber) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ vehicle_number: vehicleNumber })
        .eq("user_id", user.id);

      if (profileError) {
        console.error("Failed to update vehicle number:", profileError);
        toast.error("Could not update vehicle number: " + profileError.message);
        return; // Stop execution if vehicle update fails, to ensure data integrity
      }
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .insert({
        user_id: user.id,
        log_date: today,
        start_meter: startMeter,
        status: "started",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to start day: " + error.message);
      return;
    }
    setTodayLog(data as unknown as DailyLog);
    toast.success("Day started! Drive safe 🚗");
  };

  const endDay = async (endMeter: number, personalKm: number) => {
    if (!user || !todayLog) return;
    const officialKm = endMeter - (todayLog.start_meter || 0) - personalKm;
    const { data, error } = await supabase
      .from("daily_logs")
      .update({
        end_meter: endMeter,
        personal_km: personalKm,
        official_km: Math.max(0, officialKm),
        status: "completed",
      })
      .eq("id", todayLog.id)
      .select()
      .single();

    if (error) {
      toast.error("Failed to end day: " + error.message);
      return;
    }
    setTodayLog(data as unknown as DailyLog);
    toast.success(`Day completed! Official KM: ${Math.max(0, officialKm)}`);
  };

  const recordVisit = async (
    shopId: string,
    outcome: Visit["outcome"],
    note: string,
    gpsLat: number | null,
    gpsLng: number | null
  ) => {
    if (!user || !todayLog) return;
    const { data, error } = await supabase
      .from("visits")
      .insert({
        daily_log_id: todayLog.id,
        shop_id: shopId,
        user_id: user.id,
        outcome: outcome as any,
        note: note || null,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to record visit: " + error.message);
      return;
    }
    setVisits((prev) => [data as unknown as Visit, ...prev]);
    toast.success("Visit recorded ✓");
  };

  const addFuelLog = async (fillDate: string, meterReading: number, liters: number) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("fuel_logs")
      .insert({
        user_id: user.id,
        fill_date: fillDate,
        meter_reading: meterReading,
        liters: liters,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to save fuel entry: " + error.message);
      return;
    }
    setFuelLogs((prev) => [...prev, data as unknown as FuelLog].sort(
      (a, b) => a.fill_date.localeCompare(b.fill_date)
    ));
    toast.success("Fuel entry saved ⛽");
  };

  const deleteFuelLog = async (id: string) => {
    const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete fuel entry: " + error.message);
      return;
    }
    setFuelLogs((prev) => prev.filter((f) => f.id !== id));
    toast.success("Fuel entry removed");
  };

  const updateVisit = async (
    visitId: string,
    outcome: Visit["outcome"],
    note: string
  ) => {
    if (!user) return;
    const { error } = await supabase
      .from("visits")
      .update({
        outcome: outcome as any, // Cast to any for text compatibility
        note: note || null,
      })
      .eq("id", visitId);

    if (error) {
      toast.error("Failed to update visit: " + error.message);
      return;
    }

    setVisits((prev) =>
      prev.map((v) => (v.id === visitId ? { ...v, outcome, note } : v))
    );
    toast.success("Visit updated ✓");
  };

  return { todayLog, shops, visits, fuelLogs, loading, profile, startDay, endDay, recordVisit, updateVisit, addFuelLog, deleteFuelLog, refresh: fetchTodayData };
}
