/**
 * ATP Headshot Scraper
 * 
 * Fetches player headshots from atptour.com and stores URLs in Supabase.
 * Run: node scripts/scrape-avatars.mjs
 * 
 * ATP headshot URL pattern:
 *   https://www.atptour.com/-/media/alias/player/headshot/{slug}.png
 *   Slug = lowercase, hyphens, no accents (e.g. "jannik-sinner", "carlos-alcaraz")
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read env
const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();

const supabase = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("SUPABASE_SERVICE_ROLE_KEY")
);

function nameToSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "")    // strip special chars
    .replace(/\s+/g, "-")            // spaces to hyphens
    .replace(/-+/g, "-")             // collapse hyphens
    .replace(/^-|-$/g, "");          // trim hyphens
}

async function checkImageExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.ok;
  } catch {
    return false;
  }
}

async function scrapeAvatars(limit = 50) {
  // Get players without avatars
  const { data: players, error } = await supabase
    .from("players")
    .select("id, name")
    .is("avatar_url", null)
    .order("name")
    .limit(limit);

  if (error) {
    console.error("Fetch error:", error.message);
    return;
  }

  console.log(`Found ${players.length} players without avatars`);

  let updated = 0;
  let failed = 0;

  for (const player of players) {
    const slug = nameToSlug(player.name);
    const url = `https://www.atptour.com/-/media/alias/player/headshot/${slug}.png`;

    const exists = await checkImageExists(url);
    if (exists) {
      const { error: updErr } = await supabase
        .from("players")
        .update({ avatar_url: url })
        .eq("id", player.id);

      if (!updErr) {
        updated++;
        console.log(`✓ ${player.name} → ${slug}.png`);
      } else {
        failed++;
        console.log(`✗ ${player.name} (update failed): ${updErr.message}`);
      }
    } else {
      failed++;
      console.log(`✗ ${player.name} (no image at ${slug}.png)`);
    }

    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed`);
}

scrapeAvatars(100);
