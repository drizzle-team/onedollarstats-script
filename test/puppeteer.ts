import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: false,
  args: ["--disable-blink-features=AutomationControlled"],
});
const page = await browser.newPage();

await page.setViewport({ width: 1080, height: 1024 });
await page.goto("http://google.com");
await page.goto("http://localhost:4321", { referer: "http://google.com" });

setTimeout(() => {}, 30000);
