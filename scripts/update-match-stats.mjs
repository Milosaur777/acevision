import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

async function main() {
  const urls = [
    "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2023.csv",
    "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2024.csv",
    "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2025.csv",
  ];

  let totalUpdated = 0;
  let errors = 0;

  for (const url of urls) {
    const year = url.match(/(\d{4})\.csv/)[1];
    console.log(`\n=== ${year} ===`);
    const csv = await fetch(url).then((r) => r.text());
    const lines = csv.split("\n").filter((l) => l.trim());
    const headers = lines[0].split(",").map((h) => h.trim());
    console.log(`CSV: ${lines.length - 1} rows`);

    let batchUpdated = 0;
    const batch = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",");
      const row = {};
      headers.forEach((h, j) => (row[h] = vals[j]?.trim() || ""));

      if (!row.winner_id || !row.loser_id) continue;
      const matchId = row.match_num && row.tourney_id ? `${row.tourney_id}-${row.match_num}` : null;
      if (!matchId) continue;

      batch.push({
        id: matchId,
        p1_ace: parseInt(row.w_ace) || 0,
        p1_df: parseInt(row.w_df) || 0,
        p1_svpt: parseInt(row.w_svpt) || 0,
        p1_1stin: parseInt(row.w_1stIn) || 0,
        p1_1stwon: parseInt(row.w_1stWon) || 0,
        p1_2ndwon: parseInt(row.w_2ndWon) || 0,
        p1_svgms: parseInt(row.w_SvGms) || 0,
        p1_bpsaved: parseInt(row.w_bpSaved) || 0,
        p1_bpfaced: parseInt(row.w_bpFaced) || 0,
        p2_ace: parseInt(row.l_ace) || 0,
        p2_df: parseInt(row.l_df) || 0,
        p2_svpt: parseInt(row.l_svpt) || 0,
        p2_1stin: parseInt(row.l_1stIn) || 0,
        p2_1stwon: parseInt(row.l_1stWon) || 0,
        p2_2ndwon: parseInt(row.l_2ndWon) || 0,
        p2_svgms: parseInt(row.l_SvGms) || 0,
        p2_bpsaved: parseInt(row.l_bpSaved) || 0,
        p2_bpfaced: parseInt(row.l_bpFaced) || 0,
      });

      if (batch.length >= 200) {
        const { error } = await supabase.from("matches").upsert(batch, { onConflict: "id" });
        if (error) { errors++; console.log("Batch error:", error.message.substring(0, 80)); }
        else batchUpdated += batch.length;
        batch.length = 0;
        process.stdout.write(`\r  ${batchUpdated} updated...`);
      }
    }

    if (batch.length > 0) {
      const { error } = await supabase.from("matches").upsert(batch, { onConflict: "id" });
      if (error) { errors++; console.log("Batch error:", error.message.substring(0, 80)); }
      else batchUpdated += batch.length;
    }

    totalUpdated += batchUpdated;
    console.log(`\n  ${year}: ${batchUpdated} updated`);
  }

  console.log(`\nTotal: ${totalUpdated} updated, ${errors} errors`);

  // Verify
  const { data } = await supabase.from("matches").select("id, score, p1_ace, p1_svpt, p2_ace, p2_svpt").gt("p1_svpt", 0).limit(5);
  console.log("\nSample with stats:");
  data?.forEach((d) => console.log(`  ${d.score} | P1: ${d.p1_ace}A ${d.p1_svpt}SPT | P2: ${d.p2_ace}A ${d.p2_svpt}SPT`));
}

main().catch(console.error);
