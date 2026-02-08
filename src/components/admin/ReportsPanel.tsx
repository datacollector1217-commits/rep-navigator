import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Eye, X, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ekwayLogo from "@/assets/ekway-logo.png";

const loadLogoBase64 = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = ekwayLogo;
  });
};

interface RepOption {
  user_id: string;
  full_name: string;
  vehicle_number: string | null;
}

const OUTCOME_LABELS: Record<string, string> = {
  order_taken: "Order Taken",
  collection: "Collection",
  just_visit: "Just Visit",
  shop_closed: "Shop Closed",
};

// ─── Preview data types ───
interface PreviewRow {
  date: string;
  customer: string;
  description: string;
  startMeter: string;
  endMeter: string;
  kmsRun: string;
}

interface FuelRow {
  id: string;
  date: string;
  mr: string;
  ltrs: string;
  originalDate: string;
  originalMr: number;
  originalLtrs: number;
}

interface PreviewData {
  repName: string;
  vehicleNo: string;
  monthLabel: string;
  rows: PreviewRow[];
  fuelRows: FuelRow[];
  summary: {
    thisMonthEnd: number;
    lastMonthEnd: number;
    totalKms: number;
    officialKms: number;
    personalKms: number;
    totalLtrs: number;
    avgKmsPerLtr: string;
    personalLtrs: string;
    workingDays: number;
    totalVisits: number;
  };
}

export default function ReportsPanel() {
  const [reps, setReps] = useState<RepOption[]>([]);
  const [selectedRep, setSelectedRep] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // Fuel Management State
  const [showFuelManager, setShowFuelManager] = useState(false);
  const [editingFuel, setEditingFuel] = useState<any>(null);
  const [isFuelSubmitting, setIsFuelSubmitting] = useState(false);

  // Cache fetched data for PDF generation
  const reportDataRef = useRef<any>(null);

  useEffect(() => {
    const fetchReps = async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, vehicle_number"),
        supabase.from("user_roles").select("user_id").eq("role", "rep"),
      ]);
      const repIds = new Set((rolesRes.data || []).map((r) => r.user_id));
      setReps((profilesRes.data || []).filter((p) => repIds.has(p.user_id)) as RepOption[]);
    };
    fetchReps();
  }, []);

  // ─── Fetch report data ───
  const fetchReportData = async () => {
    if (!selectedRep || !selectedMonth) return null;

    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;

    const rep = reps.find((r) => r.user_id === selectedRep);

    const [logsRes, prevLogRes] = await Promise.all([
      supabase.from("daily_logs").select("*").eq("user_id", selectedRep)
        .gte("log_date", startDate).lt("log_date", endDate).order("log_date"),
      supabase.from("daily_logs").select("*").eq("user_id", selectedRep)
        .gte("log_date", prevStartDate).lt("log_date", startDate)
        .order("log_date", { ascending: false }).limit(1),
    ]);

    const logs = logsRes.data || [];
    const prevLastLog = prevLogRes.data?.[0] || null;

    const logIds = logs.map((l) => l.id);
    let visits: any[] = [];
    if (logIds.length > 0) {
      const { data } = await supabase.from("visits")
        .select("*, shops(name, town)").in("daily_log_id", logIds).order("visit_time");
      visits = data || [];
    }

    const { data: fuelData } = await supabase.from("fuel_logs").select("*")
      .eq("user_id", selectedRep).gte("fill_date", startDate).lt("fill_date", endDate)
      .order("fill_date");
    const fuelLogs = fuelData || [];

    const monthName = new Date(year, month - 1).toLocaleString("en", { month: "long" });

    // Build preview rows
    const rows: PreviewRow[] = [];
    let totalVisitCount = 0;

    for (const log of logs) {
      const dayVisits = visits.filter((v: any) => v.daily_log_id === log.id);
      const dateStr = new Date(log.log_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
      const kmsRun = (log.start_meter != null && log.end_meter != null)
        ? (Number(log.end_meter) - Number(log.start_meter)).toString() : "";

      if (dayVisits.length === 0) {
        rows.push({ date: dateStr, customer: "No visits", description: "", startMeter: log.start_meter?.toString() || "", endMeter: log.end_meter?.toString() || "", kmsRun });
      } else {
        dayVisits.forEach((v: any, i: number) => {
          totalVisitCount++;
          rows.push({
            date: i === 0 ? dateStr : "",
            customer: v.shops?.name || "Unknown",
            description: v.shops?.town || "",
            startMeter: i === 0 ? (log.start_meter?.toString() || "") : "",
            endMeter: i === 0 ? (log.end_meter?.toString() || "") : "",
            kmsRun: i === 0 ? kmsRun : "",
          });
        });
      }
    }

    // Fuel rows
    const fuelRows: FuelRow[] = fuelLogs.map((fl: any) => ({
      id: fl.id,
      date: new Date(fl.fill_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" }),
      mr: fl.meter_reading.toString(),
      ltrs: fl.liters.toString(),
      originalDate: fl.fill_date,
      originalMr: fl.meter_reading,
      originalLtrs: fl.liters,
    }));

    // Summary
    const thisMonthEndMeter = logs.length > 0 ? Number(logs[logs.length - 1].end_meter) || 0 : 0;
    const thisMonthStartMeter = logs.length > 0 ? Number(logs[0].start_meter) || 0 : 0;
    const lastMonthEndMeter = prevLastLog ? Number(prevLastLog.end_meter) || 0 : 0;
    const totalKmsRun = thisMonthEndMeter > 0 && (lastMonthEndMeter > 0 || thisMonthStartMeter > 0)
      ? thisMonthEndMeter - (lastMonthEndMeter > 0 ? lastMonthEndMeter : thisMonthStartMeter) : 0;
    const totalPersonal = logs.reduce((acc: number, l: any) => acc + (Number(l.personal_km) || 0), 0);
    const totalOfficial = logs.reduce((acc: number, l: any) => acc + (Number(l.official_km) || 0), 0);

    // Fix floating point errors in fuel sum
    const totalLitersRaw = fuelLogs.reduce((acc: number, f: any) => acc + (Number(f.liters) || 0), 0);
    const totalLiters = Number(totalLitersRaw.toFixed(2));

    const avgKmsPerLtr = totalLiters > 0 ? (totalKmsRun / totalLiters).toFixed(2) : "—";
    const personalLtrs = totalLiters > 0 && totalKmsRun > 0
      ? ((totalPersonal / totalKmsRun) * totalLiters).toFixed(2) : "—";

    const preview: PreviewData = {
      repName: rep?.full_name || "Unknown",
      vehicleNo: rep?.vehicle_number || "—",
      monthLabel: `${monthName} ${year}`,
      rows,
      fuelRows,
      summary: {
        thisMonthEnd: thisMonthEndMeter,
        lastMonthEnd: lastMonthEndMeter,
        totalKms: totalKmsRun,
        officialKms: totalOfficial,
        personalKms: totalPersonal,
        totalLtrs: totalLiters,
        avgKmsPerLtr,
        personalLtrs,
        workingDays: logs.length,
        totalVisits: totalVisitCount,
      },
    };

    // Store raw data for PDF generation
    reportDataRef.current = { rep, logs, visits, fuelLogs, prevLastLog, year, month, monthName };

    return preview;
  };

  // ─── Fuel Actions ───
  const handleDeleteFuel = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this fuel entry?")) return;
    setIsFuelSubmitting(true);
    const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete fuel log: " + error.message);
    } else {
      toast.success("Fuel log deleted");
      // Refresh
      const data = await fetchReportData();
      if (data) setPreviewData(data);
    }
    setIsFuelSubmitting(false);
  };

  const handleUpdateFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFuel) return;
    setIsFuelSubmitting(true);

    const { error } = await supabase.from("fuel_logs").update({
      fill_date: editingFuel.originalDate,
      meter_reading: editingFuel.originalMr,
      liters: editingFuel.originalLtrs
    }).eq("id", editingFuel.id);

    if (error) {
      toast.error("Failed to update fuel log: " + error.message);
    } else {
      toast.success("Fuel log updated");
      setEditingFuel(null);
      // Refresh
      const data = await fetchReportData();
      if (data) setPreviewData(data);
    }
    setIsFuelSubmitting(false);
  };

  // ─── Page numbers helper ───
  const addPageNumbers = (doc: jsPDF) => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 5, { align: "center" });
      doc.text(
        `Generated: ${new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        pageW - 14, pageH - 5, { align: "right" }
      );
      doc.text("EKWAY LANKA (PVT) LTD", 14, pageH - 5);
      doc.setTextColor(0, 0, 0);
    }
  };

  // ─── Build PDF from cached data ───
  const buildAndDownloadPDF = async () => {
    const d = reportDataRef.current;
    if (!d || !previewData) return;

    const { rep, logs, visits, fuelLogs, prevLastLog, year, month, monthName } = d;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Logo + Title
    let logoBase64: string | null = null;
    try { logoBase64 = await loadLogoBase64(); } catch { /* ignore */ }

    const logoSize = 12;
    const titleY = 15;
    if (logoBase64) doc.addImage(logoBase64, "PNG", 14, titleY - 9, logoSize, logoSize);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("EKWAY LANKA (PVT) LTD", logoBase64 ? 14 + logoSize + 3 : 14, titleY - 3);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Vehicle Itinerary System", logoBase64 ? 14 + logoSize + 3 : 14, titleY + 1);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("VEHICLE TOUR ITINERARY & RUNNING CHART", pageW / 2, titleY + 10, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const headerY = titleY + 18;
    doc.text(`VEHICLE NO : ${rep?.vehicle_number || ".................."}`, 14, headerY);
    doc.text(`USER : ${rep?.full_name || ".................."}`, 90, headerY);
    doc.text(`MONTH  ${monthName} ${year}`, 160, headerY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("TOUR ITINERARY", 14, headerY + 6);
    doc.text("RUNNING CHART", 160, headerY + 6);

    // Main table
    const tableRows = previewData.rows.map((r) => [r.date, r.customer, r.description, r.startMeter, r.endMeter, r.kmsRun]);
    const minRows = Math.max(tableRows.length + 3, 10);
    while (tableRows.length < minRows) tableRows.push(["", "", "", "", "", ""]);

    autoTable(doc, {
      startY: headerY + 9,
      head: [["DATE", "CUSTOMER", "DESCRIPTION",
        { content: "METER\nREADING\nSTART", styles: { halign: "center" as const } },
        { content: "METER\nREADING\nEND", styles: { halign: "center" as const } },
        { content: "KMS\nRUN", styles: { halign: "center" as const } },
      ]],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 7, fontStyle: "bold", lineWidth: 0.3, lineColor: [0, 0, 0], halign: "center", valign: "middle" },
      bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: 0.3, lineColor: [0, 0, 0], cellPadding: 0.8, minCellHeight: 3.5 },
      columnStyles: { 0: { cellWidth: 16 }, 3: { cellWidth: 20, halign: "center" }, 4: { cellWidth: 20, halign: "center" }, 5: { cellWidth: 16, halign: "center" } },
      styles: { overflow: "linebreak" },
      margin: { left: 14, right: 14, bottom: 15 },
    });

    let finalY = (doc as any).lastAutoTable?.finalY || 200;
    const pageH = doc.internal.pageSize.getHeight();
    if (finalY + 70 > pageH - 15) { doc.addPage(); finalY = 15; }

    // Fuel table
    finalY += 3;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("FUEL PUMPED", 14, finalY);

    const fuelSlots = 12; // Fixed number of slots for uniform width
    const dateRow: string[] = ["DATE"], mrRow: string[] = ["MR"], ltrsRow: string[] = ["LTRS"];

    for (let i = 0; i < fuelSlots; i++) {
      const fl = fuelLogs[i];
      dateRow.push(fl ? new Date(fl.fill_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" }) : "");
      mrRow.push(fl ? fl.meter_reading.toString() : "");
      ltrsRow.push(fl ? fl.liters.toString() : "");
    }

    // Calculate equal column widths
    // Page width ~210mm, margins 14mm -> ~182mm usable
    // Label col ~22mm -> ~160mm remaining for 12 slots -> ~13.3mm each
    const fuelColStyles: any = { 0: { cellWidth: 22, fontStyle: "bold", halign: "left" } };
    for (let i = 1; i <= fuelSlots; i++) {
      fuelColStyles[i] = { cellWidth: 13.3, halign: "center" };
    }

    autoTable(doc, {
      startY: finalY + 2,
      body: [dateRow, mrRow, ltrsRow],
      theme: "grid",
      bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: 0.3, lineColor: [0, 0, 0], minCellHeight: 4, cellPadding: 1 },
      columnStyles: fuelColStyles,
      margin: { left: 14, right: 14, bottom: 15 },
    });

    finalY = (doc as any).lastAutoTable?.finalY || finalY + 25;

    // Summary table
    const s = previewData.summary;
    finalY += 2;
    autoTable(doc, {
      startY: finalY,
      head: [[
        { content: "a", styles: { halign: "center" as const } }, "",
        { content: "b\nc=(a-b)", styles: { halign: "center" as const } },
        { content: "d", styles: { halign: "center" as const } },
        { content: "e", styles: { halign: "center" as const } },
        { content: "f=(c-d-e)", styles: { halign: "center" as const } }, "", "",
      ]],
      body: [
        [
          { content: "METER READING\n@ END OF", styles: { fontStyle: "bold" as const, fontSize: 6 } }, "",
          { content: "TOTAL KMS\nRUN", styles: { fontStyle: "bold" as const, halign: "center" as const, fontSize: 6 } },
          { content: "OFFICIAL\nEXTRA KMS", styles: { fontStyle: "bold" as const, halign: "center" as const, fontSize: 6 } },
          { content: "PERSONAL\nUSED", styles: { fontStyle: "bold" as const, halign: "center" as const, fontSize: 6 } },
          { content: "TOTAL\nLTRS", styles: { fontStyle: "bold" as const, halign: "center" as const, fontSize: 6 } },
          { content: "AVG KMS\nPER LTR", styles: { fontStyle: "bold" as const, halign: "center" as const, fontSize: 6 } },
          { content: "PERSONAL\nUSED LTRS", styles: { fontStyle: "bold" as const, halign: "center" as const, fontSize: 6 } },
        ],
        [
          { content: "THIS MONTH", styles: { fontStyle: "bold" as const, fontSize: 6 } },
          { content: "LAST MONTH", styles: { fontStyle: "bold" as const, fontSize: 6 } },
          "", "", "", "", "", "",
        ],
        [
          s.thisMonthEnd > 0 ? s.thisMonthEnd.toString() : "",
          s.lastMonthEnd > 0 ? s.lastMonthEnd.toString() : "",
          s.totalKms > 0 ? s.totalKms.toString() : "",
          s.officialKms > 0 ? s.officialKms.toString() : "",
          s.personalKms > 0 ? s.personalKms.toString() : "",
          s.totalLtrs > 0 ? s.totalLtrs.toString() : "",
          s.avgKmsPerLtr, s.personalLtrs,
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 6, fontStyle: "bold", lineWidth: 0.3, lineColor: [0, 0, 0], halign: "center" },
      bodyStyles: { fontSize: 6, textColor: [0, 0, 0], lineWidth: 0.3, lineColor: [0, 0, 0], minCellHeight: 5, cellPadding: 0.8, halign: "center" },
      margin: { left: 14, right: 14, bottom: 15 },
    });

    finalY = (doc as any).lastAutoTable?.finalY || finalY + 30;

    finalY += 3;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Summary: ${s.workingDays} working day(s) | ${s.totalVisits} visit(s) | ${s.totalKms} km total | ${s.totalLtrs} L fuel`, 14, finalY);

    finalY += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("USER'S SIGNATURE : ................................", 14, finalY);
    doc.text("HEAD OF DEPARTMENT : ................................", pageW / 2 + 10, finalY);

    addPageNumbers(doc);

    const fileName = `EKWAY_VRC_${rep?.full_name || "Report"}_${monthName}_${year}.pdf`;
    doc.save(fileName);
    toast.success("PDF downloaded!");
  };

  // ─── Handlers ───
  const handlePreview = async () => {
    if (!selectedRep || !selectedMonth) return;
    setGenerating(true);
    try {
      const data = await fetchReportData();
      if (!data) return;
      setPreviewData(data);
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate report preview.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      await buildAndDownloadPDF();
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF.");
    }
    setPreviewOpen(false);
    setPreviewData(null);
    reportDataRef.current = null;
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
    reportDataRef.current = null;
  };

  // ─── Render ───
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Vehicle Running Chart (PDF)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Select Rep</label>
              <Select value={selectedRep} onValueChange={setSelectedRep}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a rep..." />
                </SelectTrigger>
                <SelectContent>
                  {reps.map((r) => (
                    <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <Button
            onClick={handlePreview}
            disabled={!selectedRep || !selectedMonth || generating}
            className="w-full sm:w-auto gradient-navy text-primary-foreground"
          >
            <Eye className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Preview & Download PDF"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) handleClosePreview(); }}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Report Preview — {previewData?.monthLabel}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 px-6">
            {previewData && (
              <div className="space-y-4 pb-4">
                {/* Header info */}
                <div className="flex flex-wrap gap-4 text-sm bg-muted/50 p-3 rounded-lg border">
                  <span><strong>Rep:</strong> {previewData.repName}</span>
                  <span><strong>Vehicle:</strong> {previewData.vehicleNo}</span>
                  <span><strong>Month:</strong> {previewData.monthLabel}</span>
                </div>

                {/* Main table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border px-2 py-1.5 text-left font-bold">Date</th>
                        <th className="border border-border px-2 py-1.5 text-left font-bold">Customer</th>
                        <th className="border border-border px-2 py-1.5 text-left font-bold">Description</th>
                        <th className="border border-border px-2 py-1.5 text-center font-bold">MR Start</th>
                        <th className="border border-border px-2 py-1.5 text-center font-bold">MR End</th>
                        <th className="border border-border px-2 py-1.5 text-center font-bold">KMS Run</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.length === 0 ? (
                        <tr><td colSpan={6} className="border border-border px-2 py-4 text-center text-muted-foreground">No data for this period</td></tr>
                      ) : (
                        previewData.rows.map((row, idx) => (
                          <tr key={idx} className={row.date ? "border-t-2 border-border/50" : ""}>
                            <td className="border border-border px-2 py-1 font-medium">{row.date}</td>
                            <td className="border border-border px-2 py-1">{row.customer}</td>
                            <td className="border border-border px-2 py-1 text-muted-foreground">{row.description}</td>
                            <td className="border border-border px-2 py-1 text-center">{row.startMeter}</td>
                            <td className="border border-border px-2 py-1 text-center">{row.endMeter}</td>
                            <td className="border border-border px-2 py-1 text-center font-semibold">{row.kmsRun}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Fuel table */}
                <div>
                  <div className="flex items-center justify-between mb-2 mt-4">
                    <h4 className="text-xs font-bold">FUEL PUMPED</h4>
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setShowFuelManager(true)}>
                      <Pencil className="w-3 h-3 mr-1" /> Manage Fuel
                    </Button>
                  </div>
                  {previewData.fuelRows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="text-xs border-collapse border border-border">
                        <tbody>
                          <tr>
                            <td className="border border-border px-2 py-1 font-bold bg-muted">DATE</td>
                            {previewData.fuelRows.map((f, i) => (
                              <td key={i} className="border border-border px-2 py-1 text-center">{f.date}</td>
                            ))}
                          </tr>
                          <tr>
                            <td className="border border-border px-2 py-1 font-bold bg-muted">MR</td>
                            {previewData.fuelRows.map((f, i) => (
                              <td key={i} className="border border-border px-2 py-1 text-center">{f.mr}</td>
                            ))}
                          </tr>
                          <tr>
                            <td className="border border-border px-2 py-1 font-bold bg-muted">LTRS</td>
                            {previewData.fuelRows.map((f, i) => (
                              <td key={i} className="border border-border px-2 py-1 text-center">{f.ltrs}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-xs text-muted-foreground">No fuel records found.</p>}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-2 border">
                    <span className="text-muted-foreground">Working Days</span>
                    <p className="font-bold text-lg">{previewData.summary.workingDays}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2 border">
                    <span className="text-muted-foreground">Total Visits</span>
                    <p className="font-bold text-lg">{previewData.summary.totalVisits}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2 border">
                    <span className="text-muted-foreground">Total KM</span>
                    <p className="font-bold text-lg">{previewData.summary.totalKms}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2 border">
                    <span className="text-muted-foreground">Total Fuel</span>
                    <p className="font-bold text-lg">{previewData.summary.totalLtrs} L</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2 border">
                    <span className="text-muted-foreground">Avg KM/L</span>
                    <p className="font-bold text-lg">{previewData.summary.avgKmsPerLtr}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2 border">
                    <span className="text-muted-foreground">Official KM</span>
                    <p className="font-bold text-lg">{previewData.summary.officialKms}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2 border">
                    <span className="text-muted-foreground">Personal KM</span>
                    <p className="font-bold text-lg">{previewData.summary.personalKms}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2 border">
                    <span className="text-muted-foreground">Personal Ltrs</span>
                    <p className="font-bold text-lg">{previewData.summary.personalLtrs}</p>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="px-6 pb-6 pt-3 flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleClosePreview}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleDownload} className="gradient-navy text-primary-foreground">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showFuelManager} onOpenChange={setShowFuelManager}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Fuel Logs</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Edit Form */}
              {editingFuel && (
                <div className="bg-muted/30 p-4 rounded-lg border space-y-3 mb-4">
                  <h4 className="font-semibold text-sm">Edit Fuel Entry</h4>
                  <form onSubmit={handleUpdateFuel} className="space-y-3">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input id="date" type="date" required
                        value={editingFuel.originalDate}
                        onChange={e => setEditingFuel({ ...editingFuel, originalDate: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="mr">Meter Reading</Label>
                        <Input id="mr" type="number" required
                          value={editingFuel.originalMr}
                          onChange={e => setEditingFuel({ ...editingFuel, originalMr: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ltrs">Liters</Label>
                        <Input id="ltrs" type="number" step="0.01" required
                          value={editingFuel.originalLtrs}
                          onChange={e => setEditingFuel({ ...editingFuel, originalLtrs: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingFuel(null)}>Cancel</Button>
                      <Button type="submit" size="sm" disabled={isFuelSubmitting}>Save Changes</Button>
                    </div>
                  </form>
                </div>
              )}

              {/* List */}
              <div className="space-y-2">
                {previewData?.fuelRows.map(fuel => (
                  <div key={fuel.id} className="flex items-center justify-between p-3 border rounded-md bg-white">
                    <div>
                      <p className="font-medium text-sm">{fuel.date}</p>
                      <p className="text-xs text-muted-foreground">{fuel.ltrs} L @ {fuel.mr} km</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => setEditingFuel(fuel)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteFuel(fuel.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
