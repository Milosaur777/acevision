import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

const imageUrls = [];
page.on("response", (response) => {
  const url = response.url();
  if (url.includes("player-headshot") || url.includes("headshot")) {
    imageUrls.push(url);
  }
});

// Warm up
await page.goto("https://www.atptour.com/en/rankings/singles", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise((r) => setTimeout(r, 3000));

// Go to Paul's player page
await page.goto("https://www.atptour.com/en/players/tommy-paul/pl56/overview", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise((r) => setTimeout(r, 5000));

console.log("Found headshot URLs:", imageUrls);

for (const url of imageUrls) {
  const res = await fetch(url, { method: "HEAD" });
  console.log(url, "->", res.status, res.headers.get("content-length") + " bytes");
}

await browser.close();
