import { chromium } from "playwright";
import fs from "node:fs/promises";

const BASE_URL = (process.env.BASE_URL || "https://dovui-nu.vercel.app").replace(/\/$/, "");
const USERS = Number(process.env.USERS || 20);
const ROOM_CODE = (process.env.ROOM_CODE || "").trim();
const JOIN_ROOM = process.env.JOIN_ROOM === "true";
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 30000);

const results = [];
const browser = await chromium.launch({ headless: true });
const started = Date.now();

try {
  const jobs = Array.from({ length: USERS }, async (_, i) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", msg => { if (msg.type() === "error") errors.push(`console: ${msg.text()}`); });
    const row = { user: i + 1, loadMs: null, joined: null, errors };
    try {
      const url = JOIN_ROOM && ROOM_CODE
        ? `${BASE_URL}/?join=${encodeURIComponent(ROOM_CODE)}`
        : BASE_URL;
      const t0 = Date.now();
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
      await page.getByText("ĐỐ VUI ONLINE", { exact: false }).first().waitFor({ timeout: TIMEOUT_MS });
      row.loadMs = Date.now() - t0;
      row.httpStatus = response?.status() ?? null;

      if (JOIN_ROOM) {
        await page.getByLabel("Mã phòng").fill(ROOM_CODE);
        await page.getByLabel("Tên người chơi").fill(`TEST-${String(i + 1).padStart(2, "0")}`);
        await page.getByRole("button", { name: /Vào phòng chơi/ }).click();
        await page.getByText(/Đang vào phòng/).waitFor({ state: "hidden", timeout: TIMEOUT_MS }).catch(() => {});
        // Successful join renders the player's in-room interface; errors/validation text are captured.
        row.joined = await page.getByText(/Đã vào phòng!|Đã khóa câu trả lời|Chính xác!|Chưa chính xác|MÃ PHÒNG/).first()
          .isVisible({ timeout: 2500 }).catch(() => false);
        row.pageText = (await page.locator("body").innerText()).slice(0, 800);
      }
    } catch (e) {
      row.failure = e instanceof Error ? e.message : String(e);
    } finally {
      results.push(row);
      await context.close();
    }
  });

  await Promise.all(jobs);
} finally {
  await browser.close();
}

const successfulLoads = results.filter(r => r.httpStatus >= 200 && r.httpStatus < 400 && r.loadMs !== null).length;
const loadTimes = results.map(r => r.loadMs).filter(Number.isFinite).sort((a,b)=>a-b);
const percentile = p => loadTimes.length ? loadTimes[Math.min(loadTimes.length - 1, Math.ceil(p * loadTimes.length) - 1)] : null;
const summary = {
  target: BASE_URL,
  users: USERS,
  mode: JOIN_ROOM ? "page-load-and-room-join" : "page-load-only",
  roomCode: JOIN_ROOM ? ROOM_CODE : null,
  durationMs: Date.now() - started,
  successfulLoads,
  failedLoads: USERS - successfulLoads,
  successfulJoins: JOIN_ROOM ? results.filter(r => r.joined).length : null,
  loadMs: { min: loadTimes[0] ?? null, median: percentile(0.5), p95: percentile(0.95), max: loadTimes.at(-1) ?? null },
  errors: results.reduce((n, r) => n + r.errors.length + (r.failure ? 1 : 0), 0),
  results
};
await fs.mkdir("test-results", { recursive: true });
await fs.writeFile("test-results/report.json", JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, results: results.map(({ user, loadMs, httpStatus, joined, failure, errors }) => ({ user, loadMs, httpStatus, joined, failure, errors })) }, null, 2));
if (summary.failedLoads > 0 || summary.errors > 0 || (JOIN_ROOM && summary.successfulJoins !== USERS)) process.exitCode = 1;
