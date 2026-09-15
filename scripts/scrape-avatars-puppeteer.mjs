/**
 * ATP Headshot Scraper via Puppeteer (uses system Chrome)
 * 
 * Navigates rankings page, extracts headshot URLs + player names,
 * then downloads images in the same browser session (with Cloudflare cookies).
 * 
 * Run: node scripts/scrape-avatars-puppeteer.mjs
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

async function scrape() {
  console.log("Launching Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );

  const allPlayers = [];

  // Scrape rankings pages
  for (let pageNum = 1; pageNum <= 8; pageNum++) {
    const url = `https://www.atptour.com/en/rankings/singles?page=${pageNum}`;
    console.log(`\nPage ${pageNum}: ${url}`);

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));

      // Scroll to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((r) => setTimeout(r, 2000));

      // Extract headshot URLs and player info from the table
      const players = await page.evaluate(() => {
        const rows = document.querySelectorAll("table.mega-table.desktop-table tr");
        const results = [];

        for (const row of rows) {
          const rankCell = row.querySelector("td.rank");
          const nameLink = row.querySelector("td.player a[href*='/players/']");
          const img = row.querySelector("img.headShot, img[class*='headShot']");

          if (nameLink && rankCell) {
            const href = nameLink.getAttribute("href") || "";
            // Extract ATP ID from href: /en/players/name-slug/XXXX/overview
            const idMatch = href.match(/\/players\/[^/]+\/([a-z0-9]+)\//i);
            const atpId = idMatch ? idMatch[1] : "";

            results.push({
              name: nameLink.textContent?.trim() || "",
              href,
              atpId,
              image: img ? img.getAttribute("src") : "",
              rank: parseInt(rankCell.textContent?.trim()) || 0,
            });
          }
        }
        return results;
      });

      console.log(`  Found ${players.length} players`);
      allPlayers.push(...players);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\nTotal scraped: ${allPlayers.length}`);

  // Now download headshot images in the same browser session (has Cloudflare cookies)
  console.log("\nDownloading headshots...");

  let updated = 0;
  let failed = 0;

  for (const player of allPlayers) {
    if (!player.atpId) {
      failed++;
      continue;
    }

    // Check if player exists in DB and doesn't have avatar
    const { data: dbPlayer } = await supabase
      .from("players")
      .select("id, name, avatar_url")
      .ilike("name", player.name)
      .single();

    if (!dbPlayer || dbPlayer.avatar_url) continue;

    // Fetch the headshot image via the browser (has cookies)
    try {
      const imageUrl = `https://www.atptour.com/-/media/alias/player-headshot/${player.atpId}`;

      // Use page.evaluate to fetch the image as a blob and convert to base64
      const imageData = await page.evaluate(async (url) => {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }, imageUrl);

      if (imageData && imageData.startsWith("data:image")) {
        // Convert base64 to buffer
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Determine extension from MIME type
        const mimeMatch = imageData.match(/data:image\/(\w+);/);
        const ext = mimeMatch ? mimeMatch[1] : "png";

        // Upload to Supabase Storage
        const storagePath = `avatars/${dbPlayer.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("player-avatars")
          .upload(storagePath, buffer, {
            contentType: `image/${ext}`,
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("player-avatars")
            .getPublicUrl(storagePath);

          await supabase
            .from("players")
            .update({ avatar_url: urlData.publicUrl })
            .eq("id", dbPlayer.id);

          updated++;
          console.log(`✓ ${dbPlayer.name} (rank #${player.rank})`);
        } else {
          // Storage bucket might not exist — fall back to direct URL
          await supabase
            .from("players")
            .update({ avatar_url: imageUrl })
            .eq("id", dbPlayer.id);
          updated++;
          console.log(`✓ ${dbPlayer.name} (direct URL fallback)`);
        }
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
    }

    // Small delay between requests
    await new Promise((r) => setTimeout(r, 200));
  }

  await browser.close();

  console.log(`\nDone: ${updated} updated, ${failed} failed`);

  // Save raw data
  fs.writeFileSync("scripts/scraped-players.json", JSON.stringify(allPlayers, null, 2));
  console.log("Raw data saved to scripts/scraped-players.json");
}

scrape().catch(console.error);
