/**
 * ATP Headshot Scraper via Playwright
 * 
 * Uses a real browser to bypass Cloudflare.
 * Scrapes the ATP rankings page for headshot URLs.
 * 
 * Run: node scripts/scrape-avatars-playwright.mjs
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function scrapeHeadshots() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // Scrape rankings page (shows ~100 players per page)
  const allPlayers = [];

  for (let page_num = 1; page_num <= 8; page_num++) {
    const url = `https://www.atptour.com/en/rankings/singles?page=${page_num}`;
    console.log(`Fetching page ${page_num}...`);

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000); // Let Cloudflare settle

      // Extract player data from the rankings table
      const players = await page.evaluate(() => {
        const rows = document.querySelectorAll("table.rankings-table tbody tr, .ranking-row, [class*='RankRow'], [class*='ranking']");
        const results = [];

        // Try multiple selectors for the rankings
        // Method 1: Table rows
        if (rows.length > 0) {
          rows.forEach((row) => {
            const nameEl = row.querySelector("a.player-name, .name-cell a, td a[href*='/players/']");
            const imgEl = row.querySelector("img[src*='headshot'], img[src*='player'], img[alt]");
            const rankEl = row.querySelector(".rank-cell, td:first-child, [class*='rank']");

            if (nameEl) {
              results.push({
                name: nameEl.textContent?.trim() || "",
                href: nameEl.getAttribute("href") || "",
                image: imgEl?.getAttribute("src") || "",
                rank: rankEl?.textContent?.trim() || "",
              });
            }
          });
        }

        // Method 2: Look for player cards/links if no table found
        if (results.length === 0) {
          const links = document.querySelectorAll("a[href*='/players/']");
          links.forEach((link) => {
            const img = link.querySelector("img") || link.closest("div")?.querySelector("img");
            if (img && img.src) {
              results.push({
                name: link.textContent?.trim() || "",
                href: link.getAttribute("href") || "",
                image: img.src || "",
                rank: "",
              });
            }
          });
        }

        // Method 3: Just get ALL images that look like headshots
        if (results.length === 0) {
          const imgs = document.querySelectorAll("img");
          imgs.forEach((img) => {
            const src = img.src || "";
            if (src.includes("headshot") || src.includes("player") || src.includes("person")) {
              results.push({
                name: img.alt || "",
                href: "",
                image: src,
                rank: "",
              });
            }
          });
        }

        return results;
      });

      console.log(`  Found ${players.length} players on page ${page_num}`);
      allPlayers.push(...players);
    } catch (err) {
      console.error(`  Error on page ${page_num}:`, err.message);
    }

    await page.waitForTimeout(1500); // Be polite
  }

  await browser.close();

  console.log(`\nTotal scraped: ${allPlayers.length} players`);

  // Debug: show first 5
  if (allPlayers.length > 0) {
    console.log("\nSample:");
    allPlayers.slice(0, 5).forEach((p) => {
      console.log(`  ${p.name} → ${p.image || "(no image)"}`);
    });
  }

  // Match to database players and update
  const { data: dbPlayers } = await supabase.from("players").select("id, name, avatar_url");
  const dbByName = new Map(dbPlayers.map((p) => [p.name.toLowerCase(), p]));

  let matched = 0;
  let updated = 0;

  for (const scraped of allPlayers) {
    const normalName = scraped.name.toLowerCase().trim();
    const dbPlayer = dbByName.get(normalName);

    if (dbPlayer && scraped.image && !dbPlayer.avatar_url) {
      matched++;
      // Fix relative URLs
      let imgUrl = scraped.image;
      if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
      else if (imgUrl.startsWith("/")) imgUrl = "https://www.atptour.com" + imgUrl;

      const { error } = await supabase
        .from("players")
        .update({ avatar_url: imgUrl })
        .eq("id", dbPlayer.id);

      if (!error) {
        updated++;
        console.log(`✓ ${dbPlayer.name} → ${imgUrl.substring(0, 80)}...`);
      }
    }
  }

  console.log(`\nDone: ${matched} matched, ${updated} updated in database`);

  // Save raw scrape for debugging
  fs.writeFileSync("scripts/scraped-players.json", JSON.stringify(allPlayers, null, 2));
  console.log("Raw data saved to scripts/scraped-players.json");
}

scrapeHeadshots().catch(console.error);
