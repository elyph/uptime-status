// monitor.js (Node 18+)
const fs = require("fs/promises");

const TARGETS_FILE = "targets.json";
const DATA_FILE = "site/data.json";

// 5 dk aralıkta 24 saat = 288 kayıt
const MAX_POINTS = 288;
const TIMEOUT_MS = 10000;

function nowISO() {
  return new Date().toISOString();
}

function percentile(arr, p) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

async function readJson(path, fallback) {
  try {
    const s = await fs.readFile(path, "utf8");
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

async function writeJson(path, obj) {
  await fs.mkdir("site", { recursive: true });
  await fs.writeFile(path, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const start = Date.now();
  try {
    // GET daha uyumlu; istersen health endpoint için GET şart.
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    const ms = Date.now() - start;
    clearTimeout(timer);
    return { ok: res.ok, status: res.status, ms };
  } catch (e) {
    const ms = Date.now() - start;
    clearTimeout(timer);
    return { ok: false, status: 0, ms, error: String(e.message || e) };
  }
}

async function sendDiscord(webhookUrl, message) {
  if (!webhookUrl) return;
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: message })
  });
}

(async () => {
  const targets = await readJson(TARGETS_FILE, []);
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("targets.json boş. En az 1 URL ekle.");
  }

  const data = await readJson(DATA_FILE, { generatedAt: null, targets: [] });

  // hedefleri map’le
  const byUrl = new Map();
  for (const t of (data.targets || [])) byUrl.set(t.url, t);

  const webhook = process.env.DISCORD_WEBHOOK_URL;

  const newTargets = [];
  for (const t of targets) {
    const prev = byUrl.get(t.url) || { name: t.name, url: t.url, history: [] };
    const history = Array.isArray(prev.history) ? prev.history : [];

    const result = await checkUrl(t.url);
    const point = { t: nowISO(), ok: result.ok, status: result.status, ms: result.ms };
    history.push(point);
    while (history.length > MAX_POINTS) history.shift();

    // 24h metrikleri
    const okCount = history.filter(x => x.ok).length;
    const uptime24h = Math.round((okCount / history.length) * 1000) / 10; // 99.9 gibi
    const msOk = history.filter(x => x.ok && typeof x.ms === "number").map(x => x.ms);
    const p95ms24h = percentile(msOk, 95);

    // state değişimi alert
    const last = history[history.length - 1];
    const before = history[history.length - 2];
    if (before && before.ok !== last.ok) {
      const tag = last.ok ? "🟢 RECOVERED" : "🔴 DOWN";
      const msg =
        `${tag} — ${t.name}\n` +
        `URL: ${t.url}\n` +
        `Status: ${last.status} | Latency: ${last.ms}ms\n` +
        `Time: ${last.t}`;
      try { await sendDiscord(webhook, msg); } catch {}
    }

    newTargets.push({
      name: t.name,
      url: t.url,
      last,
      uptime24h,
      p95ms24h,
      history
    });
  }

  const out = { generatedAt: nowISO(), targets: newTargets };
  await writeJson(DATA_FILE, out);

  console.log("OK: Updated", DATA_FILE);
})();
