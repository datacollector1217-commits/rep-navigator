import { useState } from "react";
import { Shop, Visit } from "@/hooks/useRepWorkflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Store, Phone, CheckCircle2, Navigation, Loader2, AlertTriangle, Search, Building2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// ... (keep outcomes constant if not changing, but I need to include it if I replace the whole file or chunk. I'll rely on smart replace)

const OUTCOMES: { value: Visit["outcome"]; label: string }[] = [
  { value: "order_taken", label: "📦 Order Taken" },
  { value: "collection", label: "💰 Collection" },
  { value: "just_visit", label: "👋 Just Visit" },
  { value: "shop_closed", label: "🔒 Shop Closed" },
];

interface ShopListProps {
  shops: Shop[];
  visits: Visit[];
  onVisit: (
    shopId: string,
    outcome: Visit["outcome"],
    note: string,
    gpsLat: number | null,
    gpsLng: number | null
  ) => Promise<void>;
  onUpdateVisit?: (
    visitId: string,
    outcome: Visit["outcome"],
    note: string
  ) => Promise<void>;
}

export default function ShopList({ shops, visits, onVisit, onUpdateVisit }: ShopListProps) {
  const [search, setSearch] = useState("");
  const [visitingShop, setVisitingShop] = useState<Shop | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [selectedOutcomes, setSelectedOutcomes] = useState<Set<Visit["outcome"]>>(new Set(["just_visit"]));
  const [note, setNote] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(false);

  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  const [bypassGps, setBypassGps] = useState(false);

  // ... (keep visitedShopIds and filteredShops if not changed, relying on context match)
  const visitedShopIds = new Set(visits.map((v) => v.shop_id));

  const filteredShops = shops.filter((shop) => {
    const term = search.toLowerCase();
    return (
      shop.name.toLowerCase().includes(term) ||
      (shop.town && shop.town.toLowerCase().includes(term)) ||
      (shop.bp_code && shop.bp_code.toLowerCase().includes(term))
    );
  });

  const toggleOutcome = (outcome: Visit["outcome"]) => {
    setSelectedOutcomes((prev) => {
      const next = new Set(prev);
      if (next.has(outcome)) {
        if (next.size > 1) next.delete(outcome);
      } else {
        next.add(outcome);
      }
      return next;
    });
  };

  const fetchGps = async () => {
    setGpsLoading(true);
    setGpsError(false);
    setGpsErrorMsg(null);
    setGps(null);
    setBypassGps(false);

    if (!navigator.geolocation) {
      setGpsLoading(false);
      setGpsError(true);
      setGpsErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    const getPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
    };

    try {
      // First try with high accuracy
      try {
        const pos = await getPosition({ timeout: 10000, enableHighAccuracy: true });
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
        return;
      } catch (e) {
        console.warn("High accuracy GPS failed, trying low accuracy...", e);
      }

      // Fallback to low accuracy
      const pos = await getPosition({ timeout: 20000, enableHighAccuracy: false });
      setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (err: any) {
      console.error("GPS error:", err);
      setGpsError(true);
      let msg = "Could not retrieve location.";
      if (err.code === 1) msg = "Location permission denied. Please enable it in browser settings.";
      else if (err.code === 2) msg = "Location unavailable. Check your GPS signal.";
      else if (err.code === 3) msg = "Location request timed out.";
      setGpsErrorMsg(msg);
    } finally {
      setGpsLoading(false);
    }
  };

  const openVisitDialog = (shop: Shop, existingVisit?: Visit) => {
    setVisitingShop(shop);
    setGpsError(false);
    setGpsErrorMsg(null);
    setBypassGps(false);

    if (existingVisit) {
      setEditingVisit(existingVisit);
      // Pre-fill fields
      const outcomes = existingVisit.outcome.split(",") as Visit["outcome"][];
      setSelectedOutcomes(new Set(outcomes));
      setNote(existingVisit.note || "");
      // For editing, we use existing GPS or don't require new GPS if we trust the original check-in
      // Standard practice: Keep original GPS, don't require fetching new one for metadata edit.
      if (existingVisit.gps_lat && existingVisit.gps_lng) {
        setGps({ lat: existingVisit.gps_lat, lng: existingVisit.gps_lng });
      } else {
        setGps(null);
      }
      setGpsLoading(false);
    } else {
      setEditingVisit(null);
      setSelectedOutcomes(new Set(["just_visit"]));
      setNote("");
      setGps(null);
      fetchGps();
    }
  };

  const handleCompleteVisit = async () => {
    if (!visitingShop) return;
    if (!gps && !bypassGps) {
      toast.error("GPS coordinates are required.");
      return;
    }
    if (selectedOutcomes.size === 0) {
      toast.error("Please select at least one outcome.");
      return;
    }
    setSubmitting(true);
    try {
      // Combine multiple outcomes into a comma-separated string
      const outcome = Array.from(selectedOutcomes).join(",");
      const lat = gps ? gps.lat : null;
      const lng = gps ? gps.lng : null;

      if (editingVisit && onUpdateVisit) {
        await onUpdateVisit(editingVisit.id, outcome as Visit["outcome"], note);
      } else {
        await onVisit(visitingShop.id, outcome as Visit["outcome"], note, lat, lng);
      }

      setVisitingShop(null);
      setEditingVisit(null);
    } catch (err) {
      console.error("Error recording visit:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const retryGps = () => {
    fetchGps();
  };

  if (shops.length === 0) {
    return (
      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No Shops Assigned</h3>
          <p className="text-muted-foreground">You haven't been assigned any shops yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col h-[600px]">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <span>My Shops</span>
            <Badge variant="secondary" className="ml-auto font-normal">
              {filteredShops.length} / {shops.length}
            </Badge>
          </CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, town, or BP code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-background/50 border-input/50 focus:bg-background transition-colors"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {filteredShops.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-20" />
              <p>No shops found matching "{search}"</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredShops.map((shop) => {
                const visited = visitedShopIds.has(shop.id);
                return (
                  <div
                    key={shop.id}
                    className={`flex items-start justify-between p-4 transition-all hover:bg-muted/30 ${visited ? "bg-success/5" : ""
                      }`}
                  >
                    <div className="flex-1 min-w-0 pr-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold text-sm truncate ${visited ? "text-success" : "text-foreground"}`}>
                          {shop.name}
                        </h4>
                        {shop.bp_code && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground border-muted-foreground/30">
                            {shop.bp_code}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {shop.town && (
                          <div className="flex items-center gap-1 text-primary/80 font-medium">
                            <Building2 className="h-3 w-3" />
                            {shop.town}
                          </div>
                        )}
                        {shop.address && (
                          <div className="flex items-center gap-1 truncate max-w-full">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{shop.address}</span>
                          </div>
                        )}
                      </div>

                      {shop.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          {shop.phone}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 self-center">
                      {visited ? (
                        <div
                          className="flex flex-col items-center justify-center w-10 h-10 rounded-full bg-success/20 text-success transform transition-all cursor-pointer hover:bg-success/30 hover:scale-105 active:scale-95 group relative"
                          onClick={() => {
                            const visit = visits.find((v) => v.shop_id === shop.id && v.daily_log_id === visits[0]?.daily_log_id);
                            // Simple check: edit only if it's today's visit (which is what visits usually contains in this context)
                            if (visit) openVisitDialog(shop, visit);
                          }}
                        >
                          <CheckCircle2 className="h-6 w-6" />
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/40 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-success/50 text-[8px] text-white items-center justify-center font-bold">✎</span>
                          </span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => openVisitDialog(shop)}
                          className="h-9 px-4 font-semibold shadow-sm active:scale-95 transition-all gradient-navy text-primary-foreground"
                        >
                          VISIT
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!visitingShop} onOpenChange={() => setVisitingShop(null)}>
        <DialogContent className="max-w-sm rounded-lg sm:rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Visit: {visitingShop?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* GPS Status - mandatory */}
            <div
              className={`p-3 rounded-lg border ${gpsLoading
                ? "bg-muted/50 border-muted"
                : gps
                  ? "bg-success/10 border-success/30"
                  : bypassGps
                    ? "bg-warning/10 border-warning/30"
                    : "bg-destructive/10 border-destructive/30"
                }`}
            >
              {gpsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting GPS location...
                </div>
              ) : gps ? (
                <div className="text-sm">
                  <p className="font-semibold text-success flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    GPS Location Found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    Lat: {gps.lat.toFixed(6)}, Lng: {gps.lng.toFixed(6)}
                  </p>
                </div>
              ) : bypassGps ? (
                <div className="text-sm">
                  <p className="font-semibold text-warning flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    Using Shop Location
                  </p>
                  <p className="font-medium text-foreground mt-1">
                    {visitingShop?.town ? visitingShop.town : (visitingShop?.address || "No location details")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    GPS coordinates skipped.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={retryGps}
                    className="mt-2 text-xs h-8"
                  >
                    Try GPS Again
                  </Button>
                </div>
              ) : (
                <div className="text-sm">
                  <p className="font-semibold text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    GPS Location Required
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {gpsErrorMsg || "Cannot submit without GPS coordinates."}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={retryGps}
                      className="text-xs h-8"
                    >
                      Retry GPS
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setBypassGps(true)}
                      className="text-xs h-8 text-muted-foreground hover:text-foreground"
                    >
                      Skip GPS
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Outcome - multi-select checkboxes */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Outcome (select all that apply)</label>
              <div className="space-y-2">
                {OUTCOMES.map((o) => (
                  <label
                    key={o.value}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${selectedOutcomes.has(o.value)
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card border-border hover:border-primary/20"
                      }`}
                  >
                    <Checkbox
                      checked={selectedOutcomes.has(o.value)}
                      onCheckedChange={() => toggleOutcome(o.value)}
                    />
                    <span className="text-sm font-medium">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-1.5 block">Note (optional)</label>
              <Textarea
                placeholder="Any details..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCompleteVisit}
              disabled={submitting || gpsLoading || (!gps && !bypassGps)}
              className="w-full h-14 text-lg font-bold gradient-success text-success-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : (!gps && !bypassGps)
                  ? "Waiting for GPS..."
                  : "COMPLETE VISIT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
