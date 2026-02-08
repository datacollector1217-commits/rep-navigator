
import { createClient } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";

// Configuration
const SUPABASE_URL = "https://ceyreqvxiwhznpshxtvu.supabase.co";
const SUPABASE_KEY = "sb_publishable_SRElA9VrbVWJOJhNoEU6zQ_AnIpp3yD"; // Using ANON key is fine if RLS allows inserts or we use service role if needed (but we don't have service role readily available in context, try anon first).
// Actually, RLS might block inserts if not authenticated.
// The script runs as 'anon'. If RLS is enabled, we might need to sign in as a user first.
// Or we can just use the service role key if we had it, but we don't.
// Let's try to sign in as the rep first using a known email/password or create a user.
// Wait, we can fetch users with the anon key only if RLS allows reading users (unlikely for strict security).
// However, the earlier `upload_shops.py` worked fine. Maybe RLS is still permissive?
// The user said "RLS policies were initially set to 'Enable all access for now'". So anon key should work for inserting into tables.
// But we still need a valid user_id for the foreign keys.

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const generateDummyData = async () => {
    console.log("Starting dummy data generation...");

    // 1. Login as Admin (Ashen) to get access
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: "ashenf@douglas.lk",
        password: "Dsl@1234",
    });

    if (authError || !authData.user) {
        console.error("Error signing in:", authError);
        return;
    }
    console.log("Logged in as Admin:", authData.user.email);

    // 2. Find target user "Isuru Sampath"
    const { data: targetProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('full_name', '%Isuru Sampath%')
        .limit(1)
        .single();

    if (profileError || !targetProfile) {
        console.error("Could not find Rep 'Isuru Sampath' in profiles table.", profileError);
        return;
    }

    const repId = targetProfile.user_id;
    console.log("Found Isuru Sampath. ID:", repId);
    console.log("Generating dummy data for January 2026...");


    // 1.5 Clean up existing data for this rep
    console.log("Cleaning up existing data for this rep...");

    // Delete visits first (due to foreign key constraints, if any, on daily_log_id)
    const { error: delVisitsError } = await supabase.from("visits").delete().eq("user_id", repId);
    if (delVisitsError) console.error("Error deleting visits:", delVisitsError);

    // Delete daily logs next
    const { error: delLogsError } = await supabase.from("daily_logs").delete().eq("user_id", repId);
    if (delLogsError) console.error("Error deleting daily logs:", delLogsError);

    // Delete fuel logs
    const { error: delFuelError } = await supabase.from("fuel_logs").delete().eq("user_id", repId);
    if (delFuelError) console.error("Error deleting fuel logs:", delFuelError);

    console.log("Cleanup complete. Starting generation...");

    // 2. Get shops assigned to this rep
    let { data: shops } = await supabase
        .from("shops")
        .select("id, name, town")
        .eq("assigned_rep_id", repId);

    if (!shops || shops.length === 0) {
        console.log("No shops assigned, fetching random shops...");
        const { data: allShops } = await supabase.from("shops").select("id, name, town").limit(50);
        shops = allShops || [];
    }

    if (shops.length === 0) {
        console.error("No shops available to visit!");
        return;
    }

    // 3. Generate Daily Logs for January 2026
    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-01-31");
    let currentMeter = 45000; // Starting meter reading

    // Loop through dates
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Skip Sundays (0)
        if (d.getDay() === 0) continue;

        const dateStr = d.toISOString().split("T")[0];
        // We will calculate endMeter based on visits now
        const startMeter = currentMeter;

        console.log(`Creating log for ${dateStr}: Start ${startMeter}`);

        // Check if log exists
        const { data: existingLog } = await supabase.from("daily_logs").select("id").eq("user_id", repId).eq("log_date", dateStr).single();

        let logId;

        if (existingLog) {
            logId = existingLog.id;
        } else {
            // Create Daily Log
            const { data: log, error: logError } = await supabase
                .from("daily_logs")
                .insert({
                    user_id: repId,
                    log_date: dateStr,
                    start_meter: startMeter,
                    status: "started", // Set as started initially
                })
                .select()
                .single();

            if (logError) {
                console.error("Error creating log:", logError);
                continue;
            }
            logId = log.id;
        }



        // 4. Generate Visits for this day
        const numVisits = faker.number.int({ min: 5, max: 15 });
        const dailyShops = faker.helpers.arrayElements(shops, numVisits);

        let visitTime = new Date(d);
        visitTime.setHours(8, 30, 0); // Start at 8:30 AM

        // Adjust time to local string for DB if needed, but ISO string works usually.
        // Supabase timestamptz expects ISO string.

        for (const shop of dailyShops) {
            // Advance time by random 15-45 mins
            visitTime.setMinutes(visitTime.getMinutes() + faker.number.int({ min: 15, max: 45 }));

            // Calculate distance for this visit (simple simulation)
            const visitDistance = faker.number.int({ min: 2, max: 15 });
            const visitMeterRating = currentMeter; // Reading at arrival
            currentMeter += visitDistance; // Increment for next visit

            console.log(`    Visit: ${shop.name} - Meter: ${visitMeterRating}`);

            // Note: We are updating currentMeter inside the loop now to simulate travel between shops
            // The daily end_meter will be the final currentMeter after all visits + return trip

            // Simulate multiple outcomes sometimes (10% chance)
            const numOutcomes = faker.datatype.boolean(0.1) ? 2 : 1;
            const outcomes = faker.helpers.arrayElements(
                ["order_taken", "collection", "just_visit", "shop_closed"],
                numOutcomes
            );
            // Ensure unique outcomes
            const uniqueOutcomes = Array.from(new Set(outcomes));

            // If "shop_closed" is present, it should be the only outcome
            if (uniqueOutcomes.includes("shop_closed") && uniqueOutcomes.length > 1) {
                uniqueOutcomes.length = 0;
                uniqueOutcomes.push("shop_closed");
            }

            const outcome = uniqueOutcomes.join(",");

            const { error: visitError } = await supabase.from("visits").insert({
                daily_log_id: logId,
                user_id: repId,
                shop_id: shop.id,
                visit_time: visitTime.toISOString(),
                outcome: outcome,
                gps_lat: faker.location.latitude(),
                gps_lng: faker.location.longitude(),
                meter_reading: visitMeterRating, // Add meter reading
                note: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null,
            });

            if (visitError) console.error("Error creating visit:", visitError);
        }

        // Calculate final end meter (add some return trip distance)
        const returnTrip = faker.number.int({ min: 5, max: 15 });
        currentMeter += returnTrip;

        const dayEndMeter = currentMeter;
        const totalKm = dayEndMeter - startMeter;
        const personalKm = faker.datatype.boolean(0.2) ? faker.number.int({ min: 5, max: 15 }) : 0;
        const officialKm = Math.max(0, totalKm - personalKm);

        console.log(`  -> Day Complete: End ${dayEndMeter} (Total ${totalKm}km)`);

        // Update Daily Log
        if (logId) {
            const { error: updateError } = await supabase
                .from("daily_logs")
                .update({
                    end_meter: dayEndMeter,
                    personal_km: personalKm,
                    official_km: officialKm,
                    status: "completed"
                })
                .eq("id", logId);

            if (updateError) console.error("Error updating log:", updateError);
        }
    }

    // 5. Generate Fuel Logs
    // Every ~300-400km or every 4-5 days
    let fuelDate = new Date(startDate);
    let lastFuelMeter = 45000;

    while (fuelDate <= endDate) {
        fuelDate.setDate(fuelDate.getDate() + faker.number.int({ min: 3, max: 6 }));

        // Only proceed if date is within range
        if (fuelDate > endDate) break;

        // Calculate approx meter reading
        const daysPassed = (fuelDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
        const estimatedMeter = 45000 + (daysPassed * 80);

        if (estimatedMeter - lastFuelMeter > 100) {
            const liters = parseFloat(faker.number.float({ min: 10, max: 30, multipleOf: 0.1 }).toFixed(1));

            await supabase.from("fuel_logs").insert({
                user_id: repId,
                fill_date: fuelDate.toISOString().split("T")[0],
                meter_reading: Math.floor(estimatedMeter),
                liters: liters
            });
            console.log(`Fuel log: ${fuelDate.toISOString().split("T")[0]} - ${liters}L`);
            lastFuelMeter = estimatedMeter;
        }
    }

    console.log("Dummy data generation complete!");
};

generateDummyData();
