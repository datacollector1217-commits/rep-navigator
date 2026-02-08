import { format, startOfMonth, subDays, subMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HistoryDateFilterProps {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
}

const PRESETS = [
  { label: "Last 7 days", getRange: () => {
    const to = subDays(new Date(), 1);
    const from = subDays(new Date(), 7);
    return { from, to };
  }},
  { label: "This month", getRange: () => {
    const from = startOfMonth(new Date());
    const to = subDays(new Date(), 1);
    return { from, to };
  }},
  { label: "Last month", getRange: () => {
    const lastMonth = subMonths(new Date(), 1);
    const from = startOfMonth(lastMonth);
    const to = subDays(startOfMonth(new Date()), 1);
    return { from, to };
  }},
];

export default function HistoryDateFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: HistoryDateFilterProps) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const applyPreset = (preset: typeof PRESETS[number]) => {
    const { from, to } = preset.getRange();
    onDateFromChange(from);
    onDateToChange(to);
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Quick presets */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="secondary"
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => applyPreset(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom date pickers */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal text-xs h-8 min-w-[130px]",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={onDateFromChange}
              disabled={(date) => date > yesterday || (dateTo ? date > dateTo : false)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <span className="text-xs text-muted-foreground">to</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal text-xs h-8 min-w-[130px]",
                !dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              {dateTo ? format(dateTo, "dd MMM yyyy") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={onDateToChange}
              disabled={(date) => date > yesterday || (dateFrom ? date < dateFrom : false)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
