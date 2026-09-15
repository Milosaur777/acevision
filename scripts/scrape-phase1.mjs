/**
 * Phase 1: Scrape ATP headshot URLs via Puppeteer.
 * Saves to scraped-players.json. Fast — no DB calls.
 * 
 * Run: node scripts/scrape-phase1.mjs
 */

import puppeteer from "puppeteer-core";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function scrape() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");

  const allPlayers = [];

  for (let pageNum = 1; pageNum <= 8; pageNum++) {
    const url = `https://www.atptour.com/en/rankings/singles?page=${pageNum}`;
    process.stdout.write(`Page ${pageNum}... `);

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((r) => setTimeout(r, 1500));

      const players = await page.evaluate(() => {
        const rows = document.querySelectorAll("table.mega-table.desktop-table tr");
        const results = [];
        for (const row of rows) {
          const rankCell = row.querySelector("td.rank");
          const nameLink = row.querySelector("td.player a[href*='/players/']");
          const img = row.querySelector("img[class*='headShot']");
          if (nameLink && rankCell) {
            const href = nameLink.getAttribute("href") || "";
            const idMatch = href.match(/\/players\/[^/]+\/([a-z0-9]+)\//i);
            results.push({
              name: nameLink.textContent?.trim() || "",
              atpId: idMatch ? idMatch[1] : "",
              image: img ? img.getAttribute("src") : "",
              rank: parseInt(rankCell.textContent?.trim()) || 0,
            });
          }
        }
        return results;
      });

      console.log(`${players.length} players`);
      allPlayers.push(...players);
    } catch (err) {
      console.log(`error: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  await browser.close();

  fs.writeFileSync("scripts/scraped-players.json", JSON.stringify(allPlayers, null, 2));
  console.log(`\nSaved ${allPlayers.length} players to scraped-players.json`);
}

scrape().catch(console.error);
