/**
 * Visit ATP profile pages to capture headshots via Puppeteer interception.
 * Each profile page loads ~10 headshots (player + opponents).
 * 
 * Run: node scripts/scrape-profiles.mjs
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

async function scrapeProfiles() {
  const scraped = JSON.parse(fs.readFileSync("scripts/scraped-players.json", "utf8"));
  const { data: dbPlayers } = await supabase.from("players").select("id, name, avatar_url");
  const dbByName = new Map(dbPlayers.map((p) => [p.name.toLowerCase().trim(), p]));
  const byAtpId = new Map(scraped.map((s) => [s.atpId, s]));

  const needsAvatar = scraped
    .filter((s) => {
      const db = dbByName.get(s.name.toLowerCase().trim());
      return db && !db.avatar_url;
    })
    .sort((a, b) => a.rank - b.rank);

  console.log(`${needsAvatar.length} players still need avatars`);

  // Visit profiles for top 25 players without avatars
  const toVisit = needsAvatar.slice(0, 25);
  console.log(`Visiting ${toVisit.length} profile pages...\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");

  try { await supabase.storage.createBucket("player-avatars", { public: true }); } catch (e) {}

  const captured = new Map();

  await page.setRequestInterception(true);
  page.on("request", (r) => r.continue());
  page.on("response", async (res) => {
    const url = res.url();
    const match = url.match(/\/player-headshot\/([a-z0-9]+)/i);
    if (match && res.ok()) {
      try {
        captured.set(match[1], await res.buffer());
      } catch (e) {}
    }
  });

  // Warm up
  console.log("Warming up...");
  await page.goto("https://www.atptour.com/en/rankings/singles", { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));

  for (const player of toVisit) {
    const profileUrl = "https://www.atptour.com" + player.href;
    process.stdout.write(`  ${player.name} (#${player.rank})... `);
    try {
      await page.goto(profileUrl, { waitUntil: "networkidle2", timeout: 20000 });
      await new Promise((r) => setTimeout(r, 2000));
      console.log(`ok (${captured.size} total)`);
    } catch (e) {
      console.log(`error: ${e.message.substring(0, 50)}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  await browser.close();
  console.log(`\nTotal captured: ${captured.size} unique headshots`);

  // Upload captured headshots to DB
  let updated = 0;
  for (const [atpId, buffer] of captured) {
    const player = byAtpId.get(atpId);
    if (!player) continue;
    const dbPlayer = dbByName.get(player.name.toLowerCase().trim());
    if (!dbPlayer || dbPlayer.avatar_url) continue;

    const path = `avatars/${dbPlayer.id}.png`;
    const { error } = await supabase.storage
      .from("player-avatars")
      .upload(path, buffer, { contentType: "image/png", upsert: true });

    if (!error) {
      const { data: urlData } = supabase.storage.from("player-avatars").getPublicUrl(path);
      await supabase.from("players").update({ avatar_url: urlData.publicUrl }).eq("id", dbPlayer.id);
      updated++;
      console.log(`  ✓ ${dbPlayer.name}`);
    }
  }

  console.log(`\nDone: ${updated} newly updated in DB`);

  // Final count
  const { count } = await supabase.from("players").select("*", { count: "exact", head: true }).not("avatar_url", "is", null);
  console.log(`Total players with avatars: ${count}`);
}

scrapeProfiles().catch(console.error);
