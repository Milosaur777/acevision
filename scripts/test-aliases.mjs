import puppeteer from "puppeteer-core";

const aliases = ["z355", "ag37", "s0ag", "s0s1", "td51", "dh58", "mm58", "c0e9", "a0e2", "fb98"];
const browser = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0");

// Warm up
await page.goto("https://www.atptour.com/en/rankings/singles", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise((r) => setTimeout(r, 3000));

for (const alias of aliases) {
  const html = `<img id="img" src="https://www.atptour.com/-/media/alias/player-headshot/${alias}" crossorigin="anonymous" style="width:300px;" onload="window._ok=true"><script>window._ok=false</script>`;
  await page.goto("data:text/html," + encodeURIComponent(html), { waitUntil: "networkidle0", timeout: 20000 });
  await new Promise((r) => setTimeout(r, 3000));

  const data = await page.evaluate(() => {
    const img = document.getElementById("img");
    if (!img || !img.complete || img.naturalWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  });

  if (data) {
    const size = Buffer.from(data.replace(/^data:image\/png;base64,/, ""), "base64").length;
    console.log(alias, "->", size, "bytes", size > 10000 ? "(real?)" : "(silhouette)");
  } else {
    console.log(alias, "-> failed to load");
  }
}
await browser.close();
