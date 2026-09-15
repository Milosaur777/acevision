/**
 * Populate player rankings based on match wins.
 * More wins = higher rank (lower number).
 * Run: node scripts/populate-rankings.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();

const supabase = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("SUPABASE_SERVICE_ROLE_KEY")
);

async function populateRankings() {
  // 1. Get all players
  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("id, name");
  if (pErr) { console.error("Players fetch error:", pErr.message); return; }
  console.log(`Found ${players.length} players`);

  // 2. Count wins per player
  const winCounts = new Map();
  for (const p of players) winCounts.set(p.id, 0);

  // Fetch all matches (in batches of 1000)
  let offset = 0;
  const batchSize = 1000;
  while (true) {
    const { data: matches, error: mErr } = await supabase
      .from("matches")
      .select("winner_id")
      .range(offset, offset + batchSize - 1);
    if (mErr) { console.error("Matches fetch error:", mErr.message); break; }
    if (!matches || matches.length === 0) break;
    for (const m of matches) {
      if (m.winner_id && winCounts.has(m.winner_id)) {
        winCounts.set(m.winner_id, winCounts.get(m.winner_id) + 1);
      }
    }
    offset += batchSize;
    if (matches.length < batchSize) break;
  }
  console.log(`Counted wins across ${offset} match records`);

  // 3. Sort by wins descending, assign rank
  const ranked = players
    .map((p) => ({ id: p.id, wins: winCounts.get(p.id) || 0 }))
    .sort((a, b) => b.wins - a.wins);

  // 4. Batch update rankings
  let updated = 0;
  for (let i = 0; i < ranked.length; i += 50) {
    const batch = ranked.slice(i, i + 50).map((p, j) => ({
      id: p.id,
      ranking: i + j + 1,
    }));
    const { error } = await supabase
      .from("players")
      .upsert(batch, { onConflict: "id" });
    if (!error) updated += batch.length;
    else console.error("Update batch error:", error.message);
  }

  console.log(`\nDone: ${updated} players ranked`);
  console.log("Top 10:");
  ranked.slice(0, 10).forEach((p, i) => {
    const name = players.find((x) => x.id === p.id)?.name || p.id;
    console.log(`  ${i + 1}. ${name} (${p.wins} wins)`);
  });
}

populateRankings();
