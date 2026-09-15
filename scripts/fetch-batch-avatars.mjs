import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

// Top 30 players from scraped data, excluding ones that already have avatars
const scraped = JSON.parse(fs.readFileSync("scripts/scraped-players.json", "utf8"));

async function main() {
  const { data: existing } = await supabase.from("players").select("id, name, avatar_url").not("avatar_url", "is", null);
  const haveAvatars = new Set(existing.map((p) => p.name.toLowerCase()));

  const needsAvatar = scraped
    .filter((s) => !haveAvatars.has(s.name.toLowerCase()) && s.atpId)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 20);

  console.log(`${needsAvatar.length} players to fetch`);

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-web-security"],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");

  // Warm up
  console.log("Warming up...");
  try {
    await page.goto("https://www.atptour.com/en/rankings/singles", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));
  } catch (e) { console.log("Warm-up timeout, continuing..."); }

  try { await supabase.storage.createBucket("player-avatars", { public: true }); } catch (e) {}

  // Process in batches of 10
  for (let batch = 0; batch < needsAvatar.length; batch += 10) {
    const chunk = needsAvatar.slice(batch, batch + 10);
    console.log(`\nBatch ${Math.floor(batch / 10) + 1}: ${chunk.length} players`);

    const imgHtml = chunk.map((t, i) =>
      `<img id="p${i}" src="https://www.atptour.com/-/media/alias/player-headshot/${t.atpId}" crossorigin="anonymous" style="width:1px;height:1px;position:absolute;top:-9999px;">`
    ).join("");

    const html = `<!DOCTYPE html><html><body>${imgHtml}</body></html>`;
    const dataUrl = "data:text/html;base64," + Buffer.from(html).toString("base64");

    await page.goto(dataUrl, { waitUntil: "load", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 6000));

    for (let i = 0; i < chunk.length; i++) {
      const t = chunk[i];
      const { data: db } = await supabase.from("players").select("id").ilike("name", t.name).single();
      if (!db) continue;

      const base64 = await page.evaluate((idx) => {
        const img = document.querySelectorAll("img")[idx];
        if (!img || !img.complete || !img.naturalWidth) return null;
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        return c.toDataURL("image/png");
      }, i);

      if (base64) {
        const buffer = Buffer.from(base64.replace("data:image/png;base64,", ""), "base64");
        const path = `avatars/${db.id}.png`;
        await supabase.storage.from("player-avatars").upload(path, buffer, { contentType: "image/png", upsert: true });
        const { data: urlData } = supabase.storage.from("player-avatars").getPublicUrl(path);
        await supabase.from("players").update({ avatar_url: urlData.publicUrl }).eq("id", db.id);
        console.log(`  ✓ ${t.name} (rank #${t.rank})`);
      }
    }
  }

  const { count } = await supabase.from("players").select("*", { count: "exact", head: true }).not("avatar_url", "is", null);
  console.log(`\nTotal with avatars: ${count}`);

  await browser.close();
}

main().catch(console.error);
