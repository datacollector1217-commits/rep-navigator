import { useState } from "react";
import { DailyLog } from "@/hooks/useRepWorkflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StopCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface EndDayCardProps {
  todayLog: DailyLog;
  showEndDay: boolean;
  setShowEndDay: (v: boolean) => void;
  onEnd: (endMeter: number, personalKm: number) => Promise<void>;
}

export default function EndDayCard({ todayLog, showEndDay, setShowEndDay, onEnd }: EndDayCardProps) {
  const [endMeter, setEndMeter] = useState("");
  const [hasPersonal, setHasPersonal] = useState(false);
  const [personalKm, setPersonalKm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [endError, setEndError] = useState("");
  const [personalError, setPersonalError] = useState("");

  const startMeter = todayLog.start_meter || 0;
  const endVal = parseFloat(endMeter);
  const personalVal = hasPersonal ? parseFloat(personalKm) || 0 : 0;

  const validateEnd = (value: string): string => {
    if (!value.trim()) return "End meter reading is required.";
    const val = parseFloat(value);
    if (isNaN(val)) return "Please enter a valid number.";
    if (val < 0) return "Meter reading cannot be negative.";
    if (!Number.isInteger(val)) return "Meter reading must be a whole number.";
    if (val > 999999) return "Meter reading seems too high. Please check.";
    if (val === startMeter) return "End meter cannot be the same as start meter.";
    if (val < startMeter) return `End meter must be greater than start (${startMeter} km).`;
    return "";
  };

  const validatePersonal = (value: string): string => {
    if (!hasPersonal || !value.trim()) return "";
    const val = parseFloat(value);
    if (isNaN(val)) return "Please enter a valid number.";
    if (val < 0) return "Personal KM cannot be negative.";
    const totalKm = !isNaN(endVal) ? endVal - startMeter : 0;
    if (val > totalKm) return `Personal KM cannot exceed total (${totalKm} km).`;
    return "";
  };

  const handleEndChange = (value: string) => {
    setEndMeter(value);
    if (endError) setEndError(validateEnd(value));
    if (personalError && hasPersonal) setPersonalError(validatePersonal(personalKm));
  };

  const handlePersonalChange = (value: string) => {
    setPersonalKm(value);
    if (personalError) setPersonalError(validatePersonal(value));
  };

  const isValid = !isNaN(endVal) && endVal > startMeter && !validateEnd(endMeter) && !validatePersonal(personalKm);
  const totalKm = isValid ? endVal - startMeter : 0;
  const officialKm = Math.max(0, totalKm - personalVal);

  const handleEnd = async () => {
    const endErr = validateEnd(endMeter);
    const persErr = validatePersonal(personalKm);
    if (endErr) {
      setEndError(endErr);
      toast.error(endErr);
      return;
    }
    if (persErr) {
      setPersonalError(persErr);
      toast.error(persErr);
      return;
    }
    setSubmitting(true);
    await onEnd(parseInt(endMeter, 10), personalVal);
    setSubmitting(false);
  };

  return (
    <Card className="border-2 border-destructive/30">
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setShowEndDay(!showEndDay)}
      >
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <StopCircle className="h-5 w-5 text-destructive" />
            End Day
          </span>
          {showEndDay ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>

      {showEndDay && (
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <span className="text-xs text-muted-foreground">Start Meter: </span>
            <span className="font-mono font-bold text-sm">{startMeter} km</span>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-1.5 block">
              End Meter Reading (km)
            </label>
            <Input
              type="number"
              inputMode="numeric"
              min={startMeter + 1}
              placeholder={`Must be > ${startMeter}`}
              value={endMeter}
              onChange={(e) => handleEndChange(e.target.value)}
              className={`h-14 text-2xl font-mono text-center ${endError ? "border-destructive" : ""}`}
            />
            {endError && <p className="text-xs text-destructive mt-1">{endError}</p>}
          </div>

          <div className="flex items-center justify-between bg-muted rounded-lg p-3">
            <Label htmlFor="personal" className="text-sm font-semibold">
              Any personal trips?
            </Label>
            <Switch
              id="personal"
              checked={hasPersonal}
              onCheckedChange={(checked) => {
                setHasPersonal(checked);
                if (!checked) {
                  setPersonalKm("");
                  setPersonalError("");
                }
              }}
            />
          </div>

          {hasPersonal && (
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-1.5 block">
                Personal KM
              </label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="e.g. 15"
                value={personalKm}
                onChange={(e) => handlePersonalChange(e.target.value)}
                className={`h-12 text-xl font-mono text-center ${personalError ? "border-destructive" : ""}`}
              />
              {personalError && <p className="text-xs text-destructive mt-1">{personalError}</p>}
            </div>
          )}

          {isValid && (
            <div className="bg-muted rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total KM</span>
                <span className="font-mono font-bold">{totalKm}</span>
              </div>
              {hasPersonal && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Personal KM</span>
                  <span className="font-mono font-bold text-warning">{personalVal}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-border pt-1">
                <span className="font-semibold">Official KM</span>
                <span className="font-mono font-bold text-success">{officialKm}</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleEnd}
            disabled={!isValid || submitting}
            className="w-full h-16 text-xl font-bold gradient-danger text-destructive-foreground hover:opacity-90 transition-opacity"
          >
            {submitting ? "Ending..." : "END DAY"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
