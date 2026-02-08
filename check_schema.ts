
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ceyreqvxiwhznpshxtvu.supabase.co";
const SUPABASE_KEY = "sb_publishable_SRElA9VrbVWJOJhNoEU6zQ_AnIpp3yD";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const checkSchema = async () => {
    const { data, error } = await supabase.from("visits").select("*").limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log("Keys in visits table:", data && data.length > 0 ? Object.keys(data[0]) : "No data found to infer keys");
    }
};

checkSchema();
