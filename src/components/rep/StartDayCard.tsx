import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, Truck } from "lucide-react";
import { toast } from "sonner";

interface StartDayCardProps {
  onStart: (startMeter: number, vehicleNumber: string) => Promise<void>;
  initialVehicleNumber?: string | null;
}

export default function StartDayCard({ onStart, initialVehicleNumber }: StartDayCardProps) {
  const [meter, setMeter] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState(initialVehicleNumber || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [vehicleError, setVehicleError] = useState("");

  useEffect(() => {
    if (initialVehicleNumber) {
      setVehicleNumber(initialVehicleNumber);
    }
  }, [initialVehicleNumber]);

  const validateMeter = (value: string): string => {
    if (!value.trim()) return "Meter reading is required.";
    const val = parseFloat(value);
    if (isNaN(val)) return "Please enter a valid number.";
    if (val < 0) return "Meter reading cannot be negative.";
    if (!Number.isInteger(val)) return "Meter reading must be a whole number.";
    if (val > 999999) return "Meter reading seems too high. Please check.";
    return "";
  };

  const handleMeterChange = (value: string) => {
    setMeter(value);
    if (error) setError(validateMeter(value));
  };

  const handleVehicleChange = (value: string) => {
    setVehicleNumber(value);
    if (!value.trim()) setVehicleError("Vehicle number is required.");
    else setVehicleError("");
  };

  const handleStart = async () => {
    const meterErr = validateMeter(meter);
    const vehicleErr = !vehicleNumber.trim() ? "Vehicle number is required." : "";

    setError(meterErr);
    setVehicleError(vehicleErr);

    if (meterErr || vehicleErr) {
      if (meterErr) toast.error(meterErr);
      if (vehicleErr) toast.error(vehicleErr);
      return;
    }

    const val = parseInt(meter, 10);
    setSubmitting(true);
    await onStart(val, vehicleNumber);
    setSubmitting(false);
  };

  return (
    <Card className="border-2 border-success/30 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PlayCircle className="h-5 w-5 text-success" />
          Start Your Day
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-1.5 flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Vehicle Number
          </label>
          {initialVehicleNumber ? (
            <div className="h-11 flex items-center px-3 border rounded-md bg-muted font-medium text-foreground">
              {initialVehicleNumber}
            </div>
          ) : (
            <>
              <Input
                placeholder="e.g. WP CAX-1234"
                value={vehicleNumber}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className={`h-11 ${vehicleError ? "border-destructive" : ""}`}
              />
              {vehicleError && <p className="text-xs text-destructive mt-1">{vehicleError}</p>}
            </>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-1.5 block">
            Start Meter Reading (km)
          </label>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="e.g. 45230"
            value={meter}
            onChange={(e) => handleMeterChange(e.target.value)}
            className={`h-14 text-2xl font-mono text-center ${error ? "border-destructive" : ""}`}
          />
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>

        <Button
          onClick={handleStart}
          disabled={!meter || !vehicleNumber || submitting}
          className="w-full h-16 text-xl font-bold gradient-success text-success-foreground hover:opacity-90 transition-opacity"
        >
          {submitting ? "Starting..." : "START DAY"}
        </Button>
      </CardContent>
    </Card>
  );
}
