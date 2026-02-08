import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Upload, Plus, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ShopRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  assigned_rep_id: string | null;
  rep_name?: string;
  bp_code?: string | null;
  town?: string | null;
  district?: string | null;
}

interface RepOption {
  user_id: string;
  full_name: string;
}

export default function ShopManagement() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [reps, setReps] = useState<RepOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [filterRep, setFilterRep] = useState("all");
  const [selectedShops, setSelectedShops] = useState<Set<string>>(new Set());
  const [newShop, setNewShop] = useState({ name: "", address: "", phone: "", assigned_rep_id: "" });
  const [editingShop, setEditingShop] = useState<ShopRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const [shopsRes, profilesRes, rolesRes] = await Promise.all([
      supabase.from("shops").select("*").order("name"),
      supabase.from("profiles").select("user_id, full_name"),
      supabase.from("user_roles").select("user_id, role").eq("role", "rep"),
    ]);

    const repUserIds = new Set((rolesRes.data || []).map((r) => r.user_id));
    const allProfiles = profilesRes.data || [];
    const repProfiles = allProfiles.filter((p) => repUserIds.has(p.user_id));
    setReps(repProfiles);

    const profileMap = new Map(allProfiles.map((p) => [p.user_id, p.full_name]));
    const shopData = (shopsRes.data || []).map((s) => ({
      ...s,
      rep_name: s.assigned_rep_id ? profileMap.get(s.assigned_rep_id) || "Unknown" : "Unassigned",
    }));
    setShops(shopData as ShopRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredShops = shops.filter((s) => {
    if (filterRep === "all") return true;
    if (filterRep === "unassigned") return !s.assigned_rep_id;
    return s.assigned_rep_id === filterRep;
  });

  const allFilteredSelected = filteredShops.length > 0 && filteredShops.every(s => selectedShops.has(s.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const newSelected = new Set(selectedShops);
      filteredShops.forEach(s => newSelected.delete(s.id));
      setSelectedShops(newSelected);
    } else {
      const newSelected = new Set(selectedShops);
      filteredShops.forEach(s => newSelected.add(s.id));
      setSelectedShops(newSelected);
    }
  };

  const toggleSelectShop = (id: string) => {
    const newSelected = new Set(selectedShops);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedShops(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedShops.size === 0) return;
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${selectedShops.size} shops? This action cannot be undone.`)) return;

    setSubmitting(true);
    const allIds = Array.from(selectedShops);
    const BATCH_SIZE = 20; // Chunk requests to avoid URL length limits (400 Bad Request)
    let successCount = 0;
    let failCount = 0;

    // Process in batches
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("shops").delete().in("id", batch);

      if (error) {
        console.error("Batch delete error:", error);
        failCount += batch.length; // Assume entire batch failed if request failed
      } else {
        successCount += batch.length;
      }
    }

    if (failCount > 0) {
      toast.warning(`Deleted ${successCount} shops. Failed to delete ${failCount} shops (likely referenced by visits/orders).`);
    } else {
      toast.success(`Successfully deleted ${successCount} shops.`);
    }

    setSelectedShops(new Set());
    fetchData();
    setSubmitting(false);
  };

  const handleBulkUnassign = async () => {
    if (selectedShops.size === 0) return;
    if (!window.confirm(`Are you sure you want to unassign ${selectedShops.size} shops? They will remain in the system but have no Rep.`)) return;

    setSubmitting(true);
    const allIds = Array.from(selectedShops);
    const BATCH_SIZE = 50;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("shops").update({ assigned_rep_id: null }).in("id", batch);

      if (error) {
        console.error("Batch unassign error:", error);
        failCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    if (failCount > 0) {
      toast.error(`Unassigned ${successCount} shops. Failed to unassign ${failCount} shops.`);
    } else {
      toast.success(`Successfully unassigned ${successCount} shops.`);
    }

    setSelectedShops(new Set());
    fetchData();
    setSubmitting(false);
  };

  const handleSaveShop = async () => {
    if (!newShop.name) return;
    setSubmitting(true);

    const shopData = {
      name: newShop.name,
      address: newShop.address || null,
      phone: newShop.phone || null,
      assigned_rep_id: newShop.assigned_rep_id || null,
    };

    let error;
    if (editingShop) {
      const { error: updateError } = await supabase
        .from("shops")
        .update(shopData)
        .eq("id", editingShop.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("shops")
        .insert(shopData);
      error = insertError;
    }

    if (error) {
      toast.error(`Failed to ${editingShop ? "update" : "add"} shop: ` + error.message);
    } else {
      toast.success(`Shop ${editingShop ? "updated" : "added"}!`);
      closeDialog();
      fetchData();
    }
    setSubmitting(false);
  };

  const openAddDialog = () => {
    setEditingShop(null);
    setNewShop({ name: "", address: "", phone: "", assigned_rep_id: "" });
    setShowAdd(true);
  };

  const openEditDialog = (shop: ShopRow) => {
    setEditingShop(shop);
    setNewShop({
      name: shop.name,
      address: shop.address || "",
      phone: shop.phone || "",
      assigned_rep_id: shop.assigned_rep_id || "",
    });
    setShowAdd(true);
  };

  const closeDialog = () => {
    setShowAdd(false);
    setEditingShop(null);
    setNewShop({ name: "", address: "", phone: "", assigned_rep_id: "" });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processData = async (rows: Record<string, any>[]) => {
      if (rows.length === 0) {
        toast.error("File is empty.");
        return;
      }

      setSubmitting(true);

      // 1. Build Maps
      const repNameMap = new Map(reps.map((r) => [r.full_name.toLowerCase().trim(), r.user_id]));
      const shopBpMap = new Map();
      shops.forEach((s) => {
        if (s.bp_code) shopBpMap.set(s.bp_code.toLowerCase().trim(), s);
      });

      const toUpsert: any[] = [];
      const toInsert: any[] = [];
      let updatedCount = 0;
      let insertedCount = 0;
      const processedIds = new Set<string>();
      const unmatchedRepNames = new Set<string>();

      // 2. Process Rows
      rows.forEach((row) => {
        const bpCode = (row["BP Code"] || row["bp_code"] || row["BP"] || row["Code"] || "").toString().trim();
        // Support "Assigned Rep" key which is in user's file
        const repNameRaw = (row["Assigned Rep Name"] || row["Assigned Rep"] || row["assigned_rep_name"] || row["Rep"] || "").toString().trim();
        const repName = repNameRaw.toLowerCase();

        let repId = repNameMap.get(repName) || null;

        // Fuzzy Match: Handle cases like "Isuru Sampath" vs "Isuru Sampath Jayawardana"
        if (!repId && repName) {
          for (const [dbName, id] of repNameMap.entries()) {
            // If the database has "Isuru Sampath" and Excel has "Isuru Sampath Jayawardana", repName.includes(dbName) is true.
            if (dbName.length > 3 && (dbName.includes(repName) || repName.includes(dbName))) {
              repId = id;
              break;
            }
          }
        }

        if (repNameRaw && !repId) {
          unmatchedRepNames.add(repNameRaw);
        }

        // Clean helper
        const getVal = (keys: string[]) => {
          for (const k of keys) {
            if (row[k]) return row[k].toString().trim();
          }
          return "";
        };

        const name = getVal(["Shop Name", "shop_name", "name", "Shop"]);
        const address = getVal(["Address", "address"]);
        const phone = getVal(["Phone Number", "phone_number", "phone", "Phone"]);

        // MATCH BY BP CODE
        if (bpCode && shopBpMap.has(bpCode.toLowerCase())) {
          const existing = shopBpMap.get(bpCode.toLowerCase());

          if (processedIds.has(existing.id)) return;
          processedIds.add(existing.id);

          const { rep_name, ...dbFields } = existing;

          toUpsert.push({
            ...dbFields,
            assigned_rep_id: repId !== null ? repId : dbFields.assigned_rep_id, // Update only if a valid Rep ID was found or explicitly cleared? 
            // Wait, if repId is null because of mismatch, we shouldn't wipe the existing rep unless the user intended to unassign.
            // If the user provided a name but it didn't match, 'repId' is null. If we use 'repId' here, we might UNASSIGN the shop unintentionally.
            // Logic update: If repName was provided but not found, KEEP existing. If repName was empty, KEEP existing.
            // Only update if repId is valid.
            // BUT: What if they want to unassign? They might leave it empty? 
            // Current logic: `repId || dbFields.assigned_rep_id`. If `repId` is null (match fail OR empty), we keep existing. This is safer.
          });
          updatedCount++;
        }
        // INSERT NEW SHOP
        else if (name) {
          toInsert.push({
            name: name,
            address: address || null,
            phone: phone || null,
            assigned_rep_id: repId, // Here successful match is required for assignment
            bp_code: bpCode || null,
          });
          insertedCount++;
        }
      });

      // 3. Execute Operations
      let errorMsg = "";

      if (toUpsert.length > 0) {
        const { error } = await supabase.from("shops").upsert(toUpsert);
        if (error) errorMsg += "Update failed: " + error.message + " ";
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from("shops").insert(toInsert);
        if (error) errorMsg += "Insert failed: " + error.message;
      }

      // 4. Feedback
      if (errorMsg) {
        toast.error(errorMsg);
      } else {
        if (updatedCount === 0 && insertedCount === 0) {
          toast.warning("No valid data found to import.");
        } else {
          // Show Rep Match Failures
          if (unmatchedRepNames.size > 0) {
            const missing = Array.from(unmatchedRepNames).slice(0, 3).join(", ");
            const more = unmatchedRepNames.size > 3 ? `(and ${unmatchedRepNames.size - 3} others)` : "";
            toast.warning(`Warning: Rep name(s) "${missing}" ${more} not found in system. shops assigned to them were NOT updated.`);
          }

          toast.success(`Success! Updated: ${updatedCount}, Added: ${insertedCount}`);
          setShowImport(false);
          setFilterRep("all");
          fetchData();
        }
      }
      setSubmitting(false);
    };

    if (file.name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processData(results.data as any[]),
        error: () => toast.error("Failed to parse CSV."),
      });
    } else {
      // Excel handling
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: "array" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          processData(data as Record<string, any>[]);
        } catch (err) {
          console.error(err);
          toast.error("Failed to parse Excel file.");
        }
      };
      reader.readAsArrayBuffer(file);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-success" />
            Shop Management ({filteredShops.length})
          </CardTitle>
          <div className="flex gap-2 items-center">
            {selectedShops.size > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleBulkUnassign}>
                  Unassign Selected ({selectedShops.size})
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected ({selectedShops.size})
                </Button>
              </div>
            )}
            <Select value={filterRep} onValueChange={setFilterRep}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Rep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reps</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {reps.map((r) => (
                  <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4 mr-1" />
              Import Excel or CSV
            </Button>
            <Button onClick={openAddDialog} className="gradient-navy text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" />
              Add Shop
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected && filteredShops.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all shops"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                  />
                </TableHead>
                <TableHead>BP Code</TableHead>
                <TableHead>Shop Name</TableHead>
                <TableHead>Town</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Assigned Rep</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filteredShops.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No shops found</TableCell>
                </TableRow>
              ) : (
                filteredShops.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedShops.has(s.id)}
                        onChange={() => toggleSelectShop(s.id)}
                        aria-label={`Select shop ${s.name}`}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.bp_code || "—"}</TableCell>
                    <TableCell className="font-semibold">{s.name}</TableCell>
                    <TableCell>{s.town || "—"}</TableCell>
                    <TableCell>{s.phone || "—"}</TableCell>
                    <TableCell>{s.rep_name}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(s)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add/Edit Shop Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingShop ? "Edit Shop" : "Add New Shop"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Shop Name *</label>
              <Input value={newShop.name} onChange={(e) => setNewShop({ ...newShop, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Address</label>
              <Input value={newShop.address} onChange={(e) => setNewShop({ ...newShop, address: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Phone</label>
              <Input value={newShop.phone} onChange={(e) => setNewShop({ ...newShop, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Assign Rep</label>
              <Select value={newShop.assigned_rep_id} onValueChange={(v) => setNewShop({ ...newShop, assigned_rep_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a rep..." />
                </SelectTrigger>
                <SelectContent>
                  {reps.map((r) => (
                    <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveShop} disabled={submitting || !newShop.name} className="gradient-navy text-primary-foreground">
              {submitting ? "Saving..." : (editingShop ? "Save Changes" : "Add Shop")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-success" />
              Import Shops
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
              <p className="font-semibold">File Format (Excel or CSV):</p>
              <code className="text-xs block bg-background p-2 rounded">
                Shop Name, Address, Phone Number, Assigned Rep Name
              </code>
              <p className="text-muted-foreground text-xs">
                Rep names must match exactly.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileUpload}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
