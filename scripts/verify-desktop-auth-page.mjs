// Verifies the LIVE /desktop-auth page renders the sign-in UI for a
// legacy-`state`-param desktop URL (no "Invalid sign-in link").
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
const url =
  "https://www.noska.me/desktop-auth?tx=d96f0c17cda66c1bf30b63eee33bd16f&provider=google&state=3nR5I_ZohQvTiQmMN4Sx-E-T427dxjJ5";
await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));
const text = await page.evaluate(() => document.body.innerText.replace(/\n+/g, " | ").slice(0, 300));
console.log("PAGE:", JSON.stringify(text));
console.log(
  text.includes("Invalid sign-in link")
    ? "STILL BROKEN — page still rejects the state param"
    : "FIXED — sign-in UI is rendering"
);
await browser.close();
