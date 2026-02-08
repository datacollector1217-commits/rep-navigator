import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseLines(text: string) {
  const lines = text.split("\n");
  const shops: any[] = [];
  
  for (let line of lines) {
    // Strip line number prefix (e.g. "7: |1|ELCA...")
    line = line.replace(/^\d+:\s*/, "");
    if (!line.startsWith("|")) continue;
    const cols = line.split("|").map(c => c.trim());
    const name = cols[7] || "";
    if (!name || name === "BP Name" || /^-+$/.test(name) || name.length === 0) continue;
    // Skip empty/generic entries
    if (!name || name === "N") continue;
    
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
  return shops;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { dataUrl } = await req.json();
    
    if (!dataUrl) {
      return new Response(JSON.stringify({ error: "No dataUrl provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the data file
    const response = await fetch(dataUrl);
    const text = await response.text();
    const shops = parseLines(text);

    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < shops.length; i += batchSize) {
      const batch = shops.slice(i, i + batchSize);
      const { error } = await supabase.from("shops").insert(batch);
      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize)}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ inserted, total: shops.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
