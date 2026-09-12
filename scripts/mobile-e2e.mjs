// TEMPORARY: mobile UI E2E — runs the real mobile shell in Chrome with a
// spoofed Tauri iOS environment (window.__TAURI_INTERNALS__ + iPhone UA).
// Server 5188 = TEST_MODE (seeded workspace), 5189 = signed-out auth flow.
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "mobile-e2e-out";
fs.mkdirSync(OUT, { recursive: true });

const SPOOF = `(function() {
  window.__TAURI_INTERNALS__ = { transformCallback: (c) => c, invoke: () => Promise.resolve(null), plugins: {} };
  Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" });
  Object.defineProperty(navigator, "maxTouchPoints", { get: () => 5 });
})();`;

const iso = new Date().toISOString();
const seedPages = [
  { id: "6b2f9a10-1111-4a5e-9c33-0a1b2c3d4e01", title: "Welcome to Noska", icon: "🚀", cover: null, parentId: null, favorite: true, trashed: false, tags: ["qa"], createdAt: iso, updatedAt: iso, lineage: [], blocks: [
    { id: "b1", type: "text", text: "This is the mobile QA workspace." },
    { id: "b2", type: "h1", text: "Checklist" },
    { id: "b3", type: "todo", text: "Tap through every screen", checked: false, properties: { checked: false } },
    { id: "b4", type: "todo", text: "Test deep links", checked: true, properties: { checked: true } },
    { id: "b5", type: "bullet", text: "Bottom nav works" },
  ] },
  { id: "6b2f9a10-2222-4a5e-9c33-0a1b2c3d4e02", title: "Tasks", icon: "✅", cover: null, parentId: null, favorite: false, trashed: false, tags: [], createdAt: iso, updatedAt: iso, lineage: [], blocks: [
    { id: "t1", type: "todo", text: "Ship mobile", checked: false, properties: { checked: false } },
  ] },
  { id: "6b2f9a10-3333-4a5e-9c33-0a1b2c3d4e03", title: "Meeting Notes", icon: "🗓️", cover: null, parentId: null, favorite: false, trashed: false, tags: [], createdAt: iso, updatedAt: iso, lineage: [], blocks: [
    { id: "m1", type: "text", text: "Standup notes" },
  ] },
];
const SEED = `(function() {
  localStorage.setItem("pages", ${JSON.stringify(JSON.stringify(seedPages))});
  localStorage.setItem("activeId", ${JSON.stringify(JSON.stringify("pg-welcome"))});
  localStorage.setItem("workspaceName", ${JSON.stringify(JSON.stringify("Noska QA"))});
  localStorage.setItem("noska_user_id", "qa-user");
  localStorage.setItem("noska_setup_completed", "1");
})();`;

const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`); };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });

async function newPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(SPOOF);
  page.on("pageerror", (e) => console.log("PAGE ERROR:", String(e).slice(0, 200)));
  return page;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });
const text = (page) => page.evaluate(() => document.body.innerText);
const clickNav = (page, label) => page.evaluate((l) => {
  const btn = [...document.querySelectorAll(".mobile-nav-item")].find((b) => b.textContent.trim().startsWith(l));
  if (btn) btn.click();
  return !!btn;
}, label);
const waitShell = async (page) => { await page.waitForSelector('[data-testid="mobile-shell"]', { timeout: 20000 }); await sleep(900); };

/* ── A. Signed-out entry flow (5189) ─────────────────────────────────── */
{
  const page = await newPage();
  await page.goto("http://localhost:5189/dashboard", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(4500);
  const t = await text(page);
  ok("signed-out lands on mobile auth", /Welcome to Noska/.test(t) && /Sign in/.test(t));
  const authIdle = await page.$('[data-testid="mobile-auth-idle"]');
  ok("mobile auth screen testid present", !!authIdle);
  await shot(page, "m-01-auth");

  await page.goto("http://localhost:5189/pricing", { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(4500);
  const url = page.url();
  ok("mobile never renders marketing (/pricing gated)", !/Pricing plan/i.test(await text(page)) && /\/(login|dashboard)/.test(url), `ended at ${url}`);
  await page.close();
}

/* ── B. TEST_MODE workspace walkthrough (5188) ───────────────────────── */
{
  const page = await newPage();
  await page.evaluateOnNewDocument(SEED);
  await page.goto("http://localhost:5188/dashboard", { waitUntil: "networkidle2", timeout: 45000 });
  await waitShell(page);
  await sleep(800);
  const url = page.url();
  // Spec: valid session → load workspace → LAST page / Home (seeded activeId
  // ⇒ the editor for the last-opened page; either route is correct).
  ok("cold start lands in the workspace", /\/app\/(home|page\/)/.test(url), url);
  await clickNav(page, "Home");
  await sleep(1100);
  const t = await text(page);
  ok("home shows workspace + pages", /Noska QA/i.test(t) && /Welcome to Noska/i.test(t) && /Recent/i.test(t));
  const navCount = await page.$$eval(".mobile-nav-item", (n) => n.length);
  const hasCreate = !!(await page.$(".mobile-nav-create-btn"));
  ok("bottom nav has 4 tabs + create button", navCount === 4 && hasCreate);
  await shot(page, "m-02-home");

  const openWelcome = await page.evaluate(() => {
    const row = [...document.querySelectorAll(".mobile-page-row")].find((r) => r.textContent.includes("Welcome to Noska"));
    if (row) row.click();
    return !!row;
  });
  ok("tapping a page row opens the page screen", openWelcome && /6b2f9a10-1111/.test(page.url()), page.url());
  await sleep(1200);
  const editorText = await text(page);
  ok("editor renders seeded content", /This is the mobile QA workspace/.test(editorText) && /Checklist/.test(editorText));
  ok("editor toolbar present", !!(await page.$(".mobile-editor-toolbar")));
  const metaBelowTitle = await page.evaluate(() => {
    const title = document.querySelector(".mobile-page-row__title");
    const meta = document.querySelector(".mobile-page-row__meta");
    if (!title || !meta) return true;
    return meta.getBoundingClientRect().top >= title.getBoundingClientRect().bottom - 2;
  });
  ok("page-row meta renders below title (no inline concatenation)", metaBelowTitle);
  const headerTitle = await page.$eval(".mobile-shell__header", (h) => h.innerText).catch(() => "");
  ok("page header shows title", /Welcome to Noska/.test(headerTitle));
  await shot(page, "m-03-editor");

  await page.evaluate(() => document.querySelector('[aria-label="Page actions"]')?.click());
  await sleep(1100);
  ok("page actions sheet opens", /Page actions/.test(await text(page)));
  await shot(page, "m-04-actions");
  await page.keyboard.press("Escape");
  await sleep(500);

  const realTasksId = await page.evaluate(() => {
    const pages = JSON.parse(localStorage.getItem("pages") || "[]");
    return (pages.find((p) => p.title === "Tasks") || {}).id ?? null;
  });
  await page.goto(`http://localhost:5188/app/page/${realTasksId}`, { waitUntil: "domcontentloaded" });
  await waitShell(page);
  const tasksHeader = await page.$eval(".mobile-shell__header .mobile-ws-name", (h) => h.innerText).catch(() => "");
  ok("deep-link route /app/page/:id opens that page", /Tasks/.test(tasksHeader), tasksHeader);

  await clickNav(page, "Home");
  await sleep(700);
  await clickNav(page, "Search");
  await sleep(700);
  await page.type(".mobile-search-field input", "meeting");
  await sleep(600);
  const searchTxt = await text(page);
  ok("search filters to Meeting Notes", /Meeting Notes/.test(searchTxt) && !/Welcome to Noska/.test(searchTxt.replace(/Meeting Notes/g, "")));
  await shot(page, "m-05-search");

  await page.tap(".mobile-nav-create-btn");
  await sleep(700);
  const createTxt = await text(page);
  ok("create sheet shows templates + Ask AI", /Tasks tracker/.test(createTxt) && /Meeting notes/.test(createTxt) && /Ask AI/.test(createTxt));
  await shot(page, "m-06-create");
  await page.evaluate(() => { const c = [...document.querySelectorAll(".mobile-create-card")].find((c) => c.textContent.includes("New page")); if (c) c.click(); });
  await sleep(1400);
  const newUrl = page.url();
  ok("create makes a page and opens the editor", /\/app\/page\//.test(newUrl) && !/6b2f9a10-1111|6b2f9a10-2222|6b2f9a10-3333/.test(newUrl), newUrl);
  await page.goBack();
  await sleep(900);

  await clickNav(page, "Inbox");
  await sleep(1400);
  ok("inbox renders", /shared with you|invites/i.test(await text(page)));
  await shot(page, "m-07-inbox");

  await clickNav(page, "Profile");
  await sleep(800);
  const profTxt = await text(page);
  ok("profile shows user + workspace + settings", /Edit profile/.test(profTxt) && /Noska QA/.test(profTxt) && /Sign out/.test(profTxt));
  await shot(page, "m-08-profile");
  await page.evaluate(() => { const b = [...document.querySelectorAll(".mobile-segmented button")].find((b) => b.textContent.includes("Dark")); if (b) b.click(); });
  await sleep(700);
  ok("theme switch applies dark class", await page.evaluate(() => document.documentElement.classList.contains("dark")));
  await shot(page, "m-09-dark");

  await page.goBack();
  await sleep(800);
  ok("system back pops navigation", /app\/page\//.test(page.url()), page.url());

  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
