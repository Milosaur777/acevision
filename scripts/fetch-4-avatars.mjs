import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const targets = [
  { name: "Andrey Rublev", atpId: "re44" },
  { name: "Casper Ruud", atpId: "ru44" },
  { name: "Novak Djokovic", atpId: "d643" },
  { name: "Tommy Paul", atpId: "tp44" },
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-web-security"],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");

  // Warm up — get Cloudflare cookies from rankings page
  console.log("Warming up on rankings page...");
  try {
    await page.goto("https://www.atptour.com/en/rankings/singles", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));
    console.log("  Rankings page loaded, cookies set");
  } catch (e) {
    console.log("  Warm-up timeout, trying anyway...");
  }

  try { await supabase.storage.createBucket("player-avatars", { public: true }); } catch (e) {}

  // Build HTML with img tags for all targets
  const imgHtml = targets.map((t, i) =>
    `<img id="p${i}" src="https://www.atptour.com/-/media/alias/player-headshot/${t.atpId}" crossorigin="anonymous" onload="msg('ok${i}')" onerror="msg('err${i}')" style="width:300px;margin:10px;">`
  ).join("");

  const fullHtml = `<!DOCTYPE html><html><head><script>
    window._results = {};
    window.msg = function(s) { window._results[s] = true; };
  </script></head><body>
    <h3>Loading headshots...</h3>
    ${imgHtml}
    <pre id="log">waiting...</pre>
  </body></html>`;

  // Navigate to data URL
  const dataUrl = "data:text/html;base64," + Buffer.from(fullHtml).toString("base64");
  console.log("Loading headshot page...");
  await page.goto(dataUrl, { waitUntil: "load", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 8000));

  // Check results
  const loadResults = await page.evaluate(() => {
    const imgs = document.querySelectorAll("img");
    return Array.from(imgs).map((img, i) => ({
      index: i,
      loaded: img.complete && img.naturalWidth > 0,
      width: img.naturalWidth,
      src: img.src.substring(0, 80),
    }));
  });

  console.log("Load results:");
  loadResults.forEach((r) => {
    console.log(`  ${targets[r.index]?.name}: ${r.loaded ? `loaded (${r.width}px)` : "FAILED"}`);
  });

  // Extract loaded images as base64
  let updated = 0;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const lr = loadResults[i];
    if (!lr?.loaded) { console.log(`  Skipping ${t.name} (not loaded)`); continue; }

    const { data: db } = await supabase.from("players").select("id, avatar_url").ilike("name", t.name).single();
    if (db?.avatar_url) { console.log(`  ${t.name}: already has avatar`); continue; }
    if (!db) { console.log(`  ${t.name}: not in DB`); continue; }

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
      updated++;
      console.log(`  ✓ ${t.name} (${buffer.length} bytes)`);
    } else {
      console.log(`  ✗ ${t.name} (canvas extraction failed)`);
    }
  }

  console.log(`\nDone: ${updated} updated`);

  // Final check
  const { count } = await supabase.from("players").select("*", { count: "exact", head: true }).not("avatar_url", "is", null);
  console.log(`Total players with avatars: ${count}`);

  await browser.close();
}

main().catch(console.error);
