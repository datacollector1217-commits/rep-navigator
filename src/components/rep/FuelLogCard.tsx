import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Fuel, Plus, Trash2, CalendarDays, Gauge } from "lucide-react";
import { toast } from "sonner";

export interface FuelLog {
  id: string;
  user_id: string;
  fill_date: string;
  meter_reading: number;
  liters: number;
  created_at: string;
}

interface FuelLogCardProps {
  fuelLogs: FuelLog[];
  onAdd: (fillDate: string, meterReading: number, liters: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  locked?: boolean;
}

export default function FuelLogCard({ fuelLogs, onAdd, onDelete, locked = false }: FuelLogCardProps) {
  const [showForm, setShowForm] = useState(false);
  // Use format for local date
  const [fillDate, setFillDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [meterReading, setMeterReading] = useState("");
  const [liters, setLiters] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mrError, setMrError] = useState("");
  const [litersError, setLitersError] = useState("");
  const [dateError, setDateError] = useState("");

  const validateMeter = (value: string): string => {
    if (!value.trim()) return "Meter reading is required.";
    const val = Number(value);
    if (isNaN(val)) return "Enter a valid number.";
    if (val < 0) return "Cannot be negative.";
    if (val === 0) return "Must be greater than 0.";
    if (!Number.isInteger(val)) return "Must be a whole number.";
    if (val > 999999) return "Value seems too high.";
    return "";
  };

  const validateLiters = (value: string): string => {
    if (!value.trim()) return "Liters is required.";
    const val = Number(value);
    if (isNaN(val)) return "Enter a valid number.";
    if (val < 0) return "Cannot be negative.";
    if (val === 0) return "Must be greater than 0.";
    if (val > 500) return "Value seems too high (max 500L).";
    return "";
  };

  const validateDate = (value: string): string => {
    if (!value) return "Date is required.";
    const selected = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selected > today) return "Cannot be a future date.";
    return "";
  };

  const handleMeterChange = (value: string) => {
    setMeterReading(value);
    if (mrError) setMrError(validateMeter(value));
  };

  const handleLitersChange = (value: string) => {
    setLiters(value);
    if (litersError) setLitersError(validateLiters(value));
  };

  const handleDateChange = (value: string) => {
    setFillDate(value);
    if (dateError) setDateError(validateDate(value));
  };

  const handleSubmit = async () => {
    const dErr = validateDate(fillDate);
    const mErr = validateMeter(meterReading);
    const lErr = validateLiters(liters);

    setDateError(dErr);
    setMrError(mErr);
    setLitersError(lErr);

    if (dErr || mErr || lErr) {
      toast.error(dErr || mErr || lErr);
      return;
    }

    setSubmitting(true);
    try {
      await onAdd(fillDate, parseInt(meterReading, 10), Number(liters));
      setMeterReading("");
      setLiters("");
      setMrError("");
      setLitersError("");
      setDateError("");
      setShowForm(false);
      toast.success("Fuel log added successfully!");
    } catch (e) {
      // toast handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Fuel className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">Fuel Log</span>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {fuelLogs.length}
            </span>
          </span>
          {!locked && (
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Entry
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {fuelLogs.length === 0 ? (
          <div className="text-center py-8 px-4 border-2 border-dashed border-muted rounded-xl bg-muted/10">
            <Fuel className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No fuel entries this month</p>
            {!locked && <p className="text-xs text-muted-foreground/70 mt-1">Click Add Entry to record fuel.</p>}
          </div>
        ) : (
          <div className="grid gap-3">
            {fuelLogs.map((log) => (
              <div
                key={log.id}
                className="group flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/20"
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
                    <span className="text-xs font-bold uppercase">{new Date(log.fill_date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-lg font-bold leading-none">{new Date(log.fill_date).getDate()}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                      {log.meter_reading.toLocaleString()} km
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Fuel className="h-3.5 w-3.5" />
                      <span className="font-semibold text-foreground">{log.liters} L</span> filled
                    </div>
                  </div>
                </div>
                {!locked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(log.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Fuel className="h-5 w-5 text-primary" />
              </div>
              Add Fuel Entry
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Input
                type="date"
                value={fillDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`h-11 ${dateError ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                max={format(new Date(), "yyyy-MM-dd")}
              />
              {dateError && <p className="text-xs text-destructive font-medium">{dateError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  Meter (KM)
                </Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 45230"
                  value={meterReading}
                  onChange={(e) => handleMeterChange(e.target.value)}
                  className={`h-11 ${mrError ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                  min="0"
                />
                {mrError && <p className="text-xs text-destructive font-medium">{mrError}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                  Liters
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 25"
                  value={liters}
                  onChange={(e) => handleLitersChange(e.target.value)}
                  className={`h-11 ${litersError ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                  min="0"
                  step="0.1"
                />
                {litersError && <p className="text-xs text-destructive font-medium">{litersError}</p>}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="h-11">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="h-11 gradient-navy text-primary-foreground font-medium px-8"
            >
              {submitting ? "Saving..." : "Save Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
