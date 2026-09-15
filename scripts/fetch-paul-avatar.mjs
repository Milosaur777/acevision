import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const target = { name: "Tommy Paul", atpId: "tp44", playerId: "126205" };

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-web-security"],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");

  // Warm up on rankings page
  console.log("Warming up on rankings page...");
  try {
    await page.goto("https://www.atptour.com/en/rankings/singles", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));
    console.log("  Rankings page loaded, cookies set");
  } catch (e) {
    console.log("  Warm-up timeout, trying anyway...");
  }

  // Load player page via data URL with img tag
  const imgUrl = `https://www.atptour.com/-/media/alias/player-headshot/${target.atpId}`;
  const html = `<!DOCTYPE html><html><head></head><body>
    <img id="headshot" src="${imgUrl}" crossorigin="anonymous" style="width:300px;">
    <script>window._loaded = false; document.getElementById('headshot').onload = () => { window._loaded = true; };</script>
  </body></html>`;

  console.log(`Loading ${target.name} headshot...`);
  await page.goto(`data:text/html,${encodeURIComponent(html)}`, { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 5000));

  // Extract image via canvas
  const imgData = await page.evaluate(async () => {
    const img = document.getElementById("headshot");
    if (!img || !img.complete) return null;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 300;
    canvas.height = img.naturalHeight || 300;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  });

  if (!imgData) {
    console.log(`  FAILED: image not loaded for ${target.name}`);
    await browser.close();
    process.exit(1);
  }

  // Convert to buffer
  const base64 = imgData.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  console.log(`  Extracted: ${buffer.length} bytes`);

  if (buffer.length < 1000) {
    console.log(`  WARNING: image too small (${buffer.length} bytes), likely a placeholder`);
    await browser.close();
    process.exit(1);
  }

  // Upload to Supabase
  const fileName = `avatars/${target.playerId}.png`;
  const { error: upErr } = await supabase.storage.from("player-avatars").upload(fileName, buffer, {
    contentType: "image/png",
    upsert: true,
  });

  if (upErr) {
    console.log(`  Upload error:`, upErr.message);
    await browser.close();
    process.exit(1);
  }

  const { data: urlData } = supabase.storage.from("player-avatars").getPublicUrl(fileName);
  console.log(`  Uploaded: ${urlData.publicUrl}`);

  // Update DB
  const { error: dbErr } = await supabase.from("players").update({ avatar_url: urlData.publicUrl }).eq("id", target.playerId);
  if (dbErr) {
    console.log(`  DB update error:`, dbErr.message);
    await browser.close();
    process.exit(1);
  }

  console.log(`  Updated ${target.name} in database ✓`);
  await browser.close();
}

main().catch(console.error);
