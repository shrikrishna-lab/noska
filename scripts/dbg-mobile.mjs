// TEMPORARY debug probe
import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 393, height: 852, isMobile: true });
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 400)));
await page.evaluateOnNewDocument(`(function() {
  window.__TAURI_INTERNALS__ = { transformCallback: (c) => c, invoke: () => Promise.resolve(null), plugins: {} };
  Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" });
  Object.defineProperty(navigator, "maxTouchPoints", { get: () => 5 });
  localStorage.setItem("pages", JSON.stringify("[{\"id\": \"pg-welcome\", \"title\": \"Welcome to Noska\", \"icon\": \"\ud83d\ude80\", \"blocks\": [{\"id\": \"b1\", \"type\": \"text\", \"text\": \"QA page\"}]}, {\"id\": \"pg-tasks\", \"title\": \"Tasks\", \"icon\": \"\u2705\", \"blocks\": [{\"id\": \"t1\", \"type\": \"todo\", \"text\": \"Ship\"}]}]"));
  localStorage.setItem("activeId", JSON.stringify("pg-welcome"));
  localStorage.setItem("workspaceName", JSON.stringify("Noska QA"));
  localStorage.setItem("noska_user_id", "qa-user");
  localStorage.setItem("noska_setup_completed", "1");
})();`);
await page.goto("http://localhost:5188/dashboard", { waitUntil: "networkidle2", timeout: 45000 });
for (let i = 0; i < 10; i++) {
  await new Promise((r) => setTimeout(r, 600));
  const snap = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("pages") || "[]").map((p) => p.title).join(" | "); }
    catch { return "parse-error"; }
  });
  console.log(`t=${((i + 1) * 0.6).toFixed(1)}s pages: ${snap}`);
}
await new Promise((r) => setTimeout(r, 3000));
const tasksId = await page.evaluate(() => {
  const pages = JSON.parse(localStorage.getItem("pages") || "[]");
  window.__pagesDump = JSON.stringify(pages.map((p) => ({ id: p.id, title: p.title, trashed: p.trashed })));
  return (pages.find((p) => p.title === "Tasks") || {}).id;
});
console.log("tasksId =", tasksId); console.log("DUMP:", await page.evaluate(() => window.__pagesDump));
await page.goto("http://localhost:5188/app/page/" + tasksId, { waitUntil: "domcontentloaded" });
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 500));
  const s2 = await page.evaluate(() => ({
    url: location.pathname,
    header: document.querySelector(".mobile-ws-name")?.textContent ?? null,
  }));
  console.log(`t=${((i + 1) * 0.5).toFixed(1)}s ${s2.url} :: ${s2.header}`);
}
await new Promise((r) => setTimeout(r, 7000));
const info = await page.evaluate(() => ({
  ua: navigator.userAgent.slice(0, 50),
  tauri: "__TAURI_INTERNALS__" in window,
  text: (document.body.innerText || "").slice(0, 200),
  header: document.querySelector(".mobile-shell__header")?.innerText ?? null,
  activeId: null,
  rootKids: document.getElementById("root")?.children.length ?? -1,
  url: location.href,
}));
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: "mobile-e2e-out/dbg.png" });
await browser.close();
