// Temporary bulk import utility - processes the parsed Excel data
// This file contains the raw markdown lines from the parsed XLSX
// It will be used by the admin to trigger bulk import

import { supabase } from "@/integrations/supabase/client";

export async function bulkImportShops(rawLines: string[]): Promise<{inserted: number; errors: string[]}> {
  const shops: any[] = [];
  
  for (const line of rawLines) {
    if (!line.startsWith("|")) continue;
    const cols = line.split("|").map(c => c.trim());
    const name = cols[7] || "";
    if (!name || name === "BP Name" || /^-+$/.test(name)) continue;
    
    shops.push({
      name: name.substring(0, 255),
      bp_code: cols[2] || null,
      dsl_code: cols[3] || null,
      district: cols[6] || null,
      town: cols[14] || null,
      contact_person: cols[10] || null,
      is_suspended: cols[8] === "Y",
    });
  }

  // Insert in batches of 50 using supabase client
  const batchSize = 50;
  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < shops.length; i += batchSize) {
    const batch = shops.slice(i, i + batchSize);
    const { error } = await supabase.from("shops").insert(batch as any);
    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize)}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}
