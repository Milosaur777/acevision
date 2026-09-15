import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

// Warm up
await page.goto("https://www.atptour.com/en/rankings/singles", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise((r) => setTimeout(r, 3000));

// Go to Paul's player page
await page.goto("https://www.atptour.com/en/players/tommy-paul/pl56/overview", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise((r) => setTimeout(r, 3000));

// Extract headshot URL
const imgUrl = await page.evaluate(() => {
  const selectors = [
    ".player-headshot img",
    ".headshot img",
    "img[src*=\"player-headshot\"]",
    "img[src*=\"atptour.com/-/media\"]",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el.src;
  }
  const imgs = document.querySelectorAll("img");
  for (const img of imgs) {
    if (img.src && (img.src.includes("headshot") || img.src.includes("player"))) return img.src;
  }
  return null;
});

console.log("Found image URL:", imgUrl);

if (imgUrl) {
  const res = await fetch(imgUrl, { method: "HEAD" });
  console.log("Status:", res.status, "Size:", res.headers.get("content-length"));
}

await browser.close();
