/**
 * Batch update avatars from scraped data.
 * Run scrape-avatars-puppeteer.mjs first to generate scraped-players.json,
 * then run this to batch update the DB.
 * 
 * Run: node scripts/update-avatars-batch.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();

const supabase = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("SUPABASE_SERVICE_ROLE_KEY")
);

async function batchUpdate() {
  const scraped = JSON.parse(fs.readFileSync("scripts/scraped-players.json", "utf8"));
  console.log(`Loaded ${scraped.length} scraped players`);

  // Get all DB players
  const { data: dbPlayers } = await supabase.from("players").select("id, name, avatar_url");
  const dbByName = new Map(dbPlayers.map((p) => [p.name.toLowerCase().trim(), p]));

  let matched = 0;
  let updated = 0;
  let skipped = 0;

  // Build batch updates
  const updates = [];
  for (const player of scraped) {
    const normalName = player.name.toLowerCase().trim();
    const dbPlayer = dbByName.get(normalName);

    if (!dbPlayer) { skipped++; continue; }
    if (dbPlayer.avatar_url) { skipped++; continue; }
    if (!player.atpId) { skipped++; continue; }

    matched++;
    const avatarUrl = `https://www.atptour.com/-/media/alias/player-headshot/${player.atpId}`;
    updates.push({ id: dbPlayer.id, avatar_url: avatarUrl, name: dbPlayer.name });
  }

  console.log(`Matched: ${matched}, Already has avatar: ${skipped}`);

  // Update in batches of 50
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50);
    const promises = batch.map((u) =>
      supabase.from("players").update({ avatar_url: u.avatar_url }).eq("id", u.id)
    );
    const results = await Promise.all(promises);
    const errors = results.filter((r) => r.error);
    updated += batch.length - errors.length;
    console.log(`Batch ${Math.floor(i / 50) + 1}: ${batch.length - errors.length}/${batch.length} ok`);
    if (errors.length > 0) {
      errors.forEach((e) => console.error("  Error:", e.error.message));
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

batchUpdate().catch(console.error);
