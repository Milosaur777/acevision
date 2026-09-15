/**
 * Download ATP headshots by intercepting image responses during rankings page load.
 * The headshots load as <img> sub-resources — Cloudflare allows these.
 * 
 * Run: node scripts/download-avatars.mjs
 */

import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();

const supabase = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("SUPABASE_SERVICE_ROLE_KEY")
);

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function download() {
  const scraped = JSON.parse(fs.readFileSync("scripts/scraped-players.json", "utf8"));
  console.log(`Loaded ${scraped.length} scraped players`);

  const { data: dbPlayers } = await supabase.from("players").select("id, name, avatar_url");
  const dbByName = new Map(dbPlayers.map((p) => [p.name.toLowerCase().trim(), p]));
  const needsAvatar = scraped.filter((s) => {
    const db = dbByName.get(s.name.toLowerCase().trim());
    return db && !db.avatar_url && s.atpId;
  });

  console.log(`${needsAvatar.length} players need avatars`);
  if (needsAvatar.length === 0) { console.log("All done!"); return; }

  // Build lookup: atpId -> player info
  const byAtpId = new Map();
  for (const s of needsAvatar) {
    byAtpId.set(s.atpId, s);
  }

  console.log("Launching Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");

  // Create bucket
  try { await supabase.storage.createBucket("player-avatars", { public: true }); } catch (e) {}

  // Intercept headshot image responses
  const imageBuffers = new Map(); // atpId -> { buffer, contentType }

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    req.continue();
  });

  page.on("response", async (response) => {
    const url = response.url();
    const match = url.match(/\/player-headshot\/([a-z0-9]+)/i);
    if (match && response.ok()) {
      const atpId = match[1];
      try {
        const buffer = await response.buffer();
        const contentType = response.headers()["content-type"] || "image/png";
        imageBuffers.set(atpId, { buffer, contentType });
      } catch (e) { /* response already consumed */ }
    }
  });

  // Load all rankings pages to intercept headshots
  for (let pageNum = 1; pageNum <= 8; pageNum++) {
    // Only need enough pages to cover the top 100 (but we scraped 8 pages worth)
    // Rankings page shows 100 per page, but pagination doesn't work via URL
    // So we load the main page which has all 100 headshots
    if (pageNum > 1) break; // ATP only shows 100, no real pagination
  }

  console.log("Loading rankings page to capture headshots...");
  await page.goto("https://www.atptour.com/en/rankings/singles", { waitUntil: "networkidle2", timeout: 30000 });
  
  // Scroll to trigger lazy loading of images
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 5000));

  console.log(`Captured ${imageBuffers.size} headshot images`);

  // Also try loading page 2 in case there are more
  // (Even though URL pagination didn't work for scraping, images might differ)

  // Upload captured images
  let updated = 0;
  let failed = 0;

  for (const [atpId, { buffer, contentType }] of imageBuffers) {
    const player = byAtpId.get(atpId);
    if (!player) continue;

    const dbPlayer = dbByName.get(player.name.toLowerCase().trim());
    if (!dbPlayer) continue;

    const ext = contentType.includes("jpeg") ? "jpg" : "png";
    const path = `avatars/${dbPlayer.id}.${ext}`;

    const { error } = await supabase.storage
      .from("player-avatars")
      .upload(path, buffer, { contentType, upsert: true });

    if (!error) {
      const { data: urlData } = supabase.storage.from("player-avatars").getPublicUrl(path);
      await supabase.from("players").update({ avatar_url: urlData.publicUrl }).eq("id", dbPlayer.id);
      updated++;
      console.log(`✓ ${dbPlayer.name} (${buffer.length} bytes)`);
    } else {
      console.log(`✗ ${dbPlayer.name} (storage: ${error.message})`);
      failed++;
    }
  }

  // Check which players we missed
  const missed = needsAvatar.filter((p) => !imageBuffers.has(p.atpId));
  if (missed.length > 0) {
    console.log(`\n${missed.length} players not on rankings page (lower-ranked)`);
  }

  await browser.close();
  console.log(`\nDone: ${updated} updated, ${failed} failed, ${imageBuffers.size} images captured`);
}

download().catch(console.error);
