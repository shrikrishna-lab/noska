// Loads the built desktop renderer over HTTP in headless Chromium and dumps
// every boot-time error, so bundle crashes (stuck preloader) are visible.
import puppeteer from "puppeteer-core";
import http from "http";
import fs from "fs";
import path from "path";

const root = path.resolve("dist-desktop");
const types = {
  ".js": "text/javascript", ".css": "text/css", ".html": "text/html",
  ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".json": "application/json", ".wasm": "application/wasm",
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(root, p);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  } else if (!path.extname(p)) {
    res.setHeader("Content-Type", "text/html");
    fs.createReadStream(path.join(root, "index.html")).pipe(res);
  } else {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((r) => server.listen(8123, "127.0.0.1", r));

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + (e.stack || e.message)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("CONSOLE: " + m.text());
});
page.on("requestfailed", (r) => {
  const u = r.url();
  if (!u.includes("posthog") && !u.includes("sentry") && !u.includes("clerk")) {
    errors.push("REQFAIL: " + u + " " + (r.failure()?.errorText ?? ""));
  }
});

await page.goto("http://127.0.0.1:8123/login", { waitUntil: "networkidle2", timeout: 60000 }).catch((e) => errors.push("GOTO: " + e.message));
await new Promise((r) => setTimeout(r, 15000));

const state = await page.evaluate(() => ({
  preloader: !!document.getElementById("preloader"),
  rootChildren: document.getElementById("root")?.childElementCount ?? -1,
  bodyText: (document.body.innerText || "").slice(0, 300),
}));

console.log("preloader present:", state.preloader, "| #root children:", state.rootChildren);
console.log("body text:", JSON.stringify(state.bodyText));
console.log("errors (" + errors.length + "):");
const seen = new Set();
for (const e of errors) {
  const key = e.slice(0, 120);
  if (seen.has(key)) continue;
  seen.add(key);
  console.log("---", e.slice(0, 600));
}
await browser.close();
server.close();
