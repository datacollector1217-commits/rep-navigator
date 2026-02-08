
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ceyreqvxiwhznpshxtvu.supabase.co";
const SUPABASE_KEY = "sb_publishable_SRElA9VrbVWJOJhNoEU6zQ_AnIpp3yD";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const checkColumnType = async () => {
    // We can't easily check postgres types via standard client without rpc or checking information_schema
    // Trying to insert a test string with comma to see if it accepts text
    const { error } = await supabase.from("visits").insert({
        outcome: "test,comma", // If enum, this fails. If text, it passes.
        daily_log_id: "00000000-0000-0000-0000-000000000000", // Invalid FK will fail too.
    });

    // Better: Just check a row
    const { data } = await supabase.from("visits").select("outcome").limit(1);
    console.log("Sample outcome:", data?.[0]?.outcome);
    console.log("Typeof outcome:", typeof data?.[0]?.outcome);
};

checkColumnType();
