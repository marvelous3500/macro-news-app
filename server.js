import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 5177);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = new URL(".", import.meta.url).pathname;
const PUBLIC_DIR = join(ROOT, "public");
const DATA_DIR = join(ROOT, "data");
const FUNDAMENTALS_FILE = join(DATA_DIR, "fundamentals.json");

const SOURCE_URLS = [
  "https://www.whitehouse.gov/news/",
  "https://www.whitehouse.gov/remarks/",
  "https://www.whitehouse.gov/briefings-statements/",
  "https://www.whitehouse.gov/fact-sheets/"
];
const X_QUERY = process.env.X_QUERY || "from:realDonaldTrump (tariff OR trade OR sanctions OR deficit OR debt OR rates OR inflation OR dollar OR Iran OR Israel OR Russia OR Ukraine OR NATO OR military OR war)";
const CALENDAR_FALLBACKS = {
  "2026-06-10": [
    { time: "2:30pm", currency: "USD", impact: "high", title: "Core CPI m/m", forecast: "0.3%", previous: "0.4%" },
    { time: "2:30pm", currency: "USD", impact: "high", title: "Core CPI y/y", forecast: "2.9%", previous: "2.8%" },
    { time: "2:30pm", currency: "USD", impact: "high", title: "CPI m/m", forecast: "0.5%", previous: "0.6%" },
    { time: "2:30pm", currency: "USD", impact: "high", title: "CPI y/y", forecast: "4.2%", previous: "3.8%" },
    { time: "5:35pm", currency: "USD", impact: "medium", title: "Crude Oil Inventories", forecast: "-3.0M", previous: "-8.0M" },
    { time: "8:00pm", currency: "USD", impact: "medium", title: "Federal Budget Balance", forecast: "-282.9B", previous: "215.0B" }
  ]
};

const MARKET_SYMBOLS = [
  { id: "dxy", label: "DXY", yahoo: "DX-Y.NYB" },
  { id: "us10y", label: "US10Y", yahoo: "^TNX", scale: 0.1 },
  { id: "gold", label: "XAU/USD", yahoo: "GC=F" },
  { id: "eurusd", label: "EUR/USD", yahoo: "EURUSD=X" },
  { id: "gbpusd", label: "GBP/USD", yahoo: "GBPUSD=X" },
  { id: "usdjpy", label: "USD/JPY", yahoo: "JPY=X" },
  { id: "nas100", label: "NAS100", yahoo: "NQ=F" },
  { id: "btc", label: "BTC/USD", yahoo: "BTC-USD" }
];

const MACRO_KEYWORDS = [
  "tariff", "trade", "sanction", "deficit", "debt", "rate", "inflation",
  "dollar", "treasury", "tax", "budget", "china", "middle east", "iran",
  "israel", "russia", "ukraine", "nato", "military", "defense", "war",
  "strike", "conflict", "alliance", "oil", "energy", "national security"
];

const USD_BULLISH = [
  "tariff", "sanction", "strong dollar", "higher rates", "rate hike",
  "deficit reduction", "cut spending", "trade deficit", "inflation fight"
];

const USD_BEARISH = [
  "lower rates", "rate cut", "weaker dollar", "debt ceiling",
  "increase debt", "larger deficit", "tax cut", "stimulus"
];

const RISK_KEYWORDS = [
  "war", "strike", "military", "attack", "retaliation", "missile",
  "troops", "iran", "israel", "middle east", "russia", "ukraine",
  "nato", "sanction", "conflict", "escalation", "national security"
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function json(res, code, payload) {
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function readFundamentals() {
  try {
    const file = await readFile(FUNDAMENTALS_FILE, "utf8");
    const data = JSON.parse(file);
    if (!data || typeof data !== "object") return { months: {} };
    if (!data.months || typeof data.months !== "object") return { months: {} };
    return data;
  } catch {
    return { months: {} };
  }
}

async function writeFundamentals(data) {
  const normalized = data && typeof data === "object" && data.months ? data : { months: {} };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FUNDAMENTALS_FILE, JSON.stringify(normalized, null, 2));
  return normalized;
}

async function sendWebhookAlert(payload) {
  const message = payload?.message || "";
  if (!message.trim()) return { sent: false, reason: "empty_message" };
  if (!process.env.WEBHOOK_URL) return { sent: false, reason: "WEBHOOK_URL_not_configured", message };

  const response = await fetch(process.env.WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: message, text: message })
  });

  return {
    sent: response.ok,
    status: response.status,
    message
  };
}

function cleanText(value = "") {
	return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
		.trim();
}

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesTerm(text, term) {
	const normalized = term.trim().toLowerCase();
	if (normalized.includes(" ")) {
		return text.includes(normalized);
	}
	return new RegExp(`\\b${escapeRegex(normalized)}\\b`, "i").test(text);
}

function todayKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function forexFactoryDaySlug(date = new Date()) {
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toLowerCase();
  return `${month}${date.getUTCDate()}.${date.getUTCFullYear()}`;
}

function eventIdFromCalendarTitle(title = "") {
  const lowered = title.toLowerCase();
  if (lowered.includes("cpi")) return "cpi";
  if (lowered.includes("ppi")) return "ppi";
  if (lowered.includes("non-farm") || lowered.includes("nonfarm") || lowered.includes("nfp")) return "nfp";
  if (lowered.includes("pmi")) return "pmi";
  return "";
}

function focusEventFromCalendar(events) {
  const priority = ["cpi", "ppi", "nfp", "pmi"];
  const ids = events.map((event) => eventIdFromCalendarTitle(event.title)).filter(Boolean);
  return priority.find((id) => ids.includes(id)) || "";
}

function normalizeMacroValue(value = "") {
  const cleaned = String(value).replace(/,/g, "").trim();
  if (!cleaned) return "";
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  return match ? match[0] : "";
}

function monthlyEventIdFromTitle(title = "") {
  const lowered = title.toLowerCase();
  if (lowered.includes("adp")) return "";
  if (lowered.includes("non-farm employment change") || lowered.includes("nonfarm payroll") || lowered.includes("non-farm payroll")) return "nfp";
  if (lowered === "ism manufacturing pmi" || lowered.includes("manufacturing pmi")) return "pmi";
  if (lowered === "ppi m/m" || lowered.includes(" ppi m/m") || lowered.startsWith("ppi m/m")) return "ppi";
  if (lowered === "cpi m/m" || lowered.includes(" cpi m/m") || lowered.startsWith("cpi m/m")) return "cpi";
  return "";
}

function eventPriority(title = "") {
  const lowered = title.toLowerCase();
  if (lowered === "ism manufacturing pmi") return 0;
  if (lowered.includes("non-farm employment change") && !lowered.includes("adp")) return 0;
  if (lowered.includes("core")) return 3;
  if (lowered.includes("flash")) return 2;
  return 1;
}

function scoreText(text) {
	const lowered = text.toLowerCase();
	let usd = 0;
	let risk = 0;

	for (const word of USD_BULLISH) {
		if (includesTerm(lowered, word)) usd += 1.8;
	}
	for (const word of USD_BEARISH) {
		if (includesTerm(lowered, word)) usd -= 1.8;
	}
	for (const word of RISK_KEYWORDS) {
		if (includesTerm(lowered, word)) risk += 0.9;
	}
	if (includesTerm(lowered, "direct military") || includesTerm(lowered, "retaliation")) risk += 2;
	if (includesTerm(lowered, "ceasefire") || includesTerm(lowered, "peace deal")) risk -= 2;

  return {
    USD_Impact: Math.max(-10, Math.min(10, Number(usd.toFixed(1)))),
    Geopolitical_Risk: Math.max(0, Math.min(10, Number(risk.toFixed(1))))
  };
}

function extractItems(html, sourceUrl) {
	const items = [];
	const linkRegex = /<h2[^>]*wp-block-post-title[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/gi;
	const seen = new Set();
	let match;

	while ((match = linkRegex.exec(html)) !== null) {
		const href = match[1];
		const title = cleanText(match[2]);

		if (!title || title.length < 12 || !href.includes("whitehouse.gov")) continue;
		if (seen.has(href)) continue;

		const haystack = title.toLowerCase();
		const isRelevant = MACRO_KEYWORDS.some((word) => includesTerm(haystack, word));
		if (!isRelevant) continue;

    seen.add(href);
    const score = scoreText(title);
    items.push({
      title,
      url: href,
      source: "White House",
      sourceUrl,
      publishedAt: null,
      summary: title,
      score
    });
  }

  return items.slice(0, 30);
}

async function fetchSource(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "MacroNewsApp/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function scoreWithOpenAI(items) {
  if (!process.env.OPENAI_API_KEY || items.length === 0) return items;

  const prompt = `
You are a macro hedge fund algorithm analyzing U.S. presidential economic and war-related headlines.
Ignore domestic partisan politics.
Return JSON only as {"scores":[{"USD_Impact":number,"Geopolitical_Risk":number}]}.
USD_Impact: -10 highly bearish USD, +10 highly bullish USD.
Geopolitical_Risk: 0 peaceful, 10 extreme global war risk.

Headlines:
${items.map((item, index) => `${index + 1}. ${item.title}`).join("\n")}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) return items;

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return items;

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.scores)) return items;
    return items.map((item, index) => ({
      ...item,
      score: parsed.scores[index] || item.score,
      scoringMode: "ai"
    }));
  } catch {
    return items;
  }
}

async function fetchXItems() {
  if (!process.env.X_BEARER_TOKEN) return [];

  const params = new URLSearchParams({
    query: X_QUERY,
    max_results: "10",
    "tweet.fields": "created_at,author_id"
  });
  const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
    headers: {
      authorization: `Bearer ${process.env.X_BEARER_TOKEN}`
    }
  });

  if (!response.ok) return [];

  const payload = await response.json();
  return (payload.data || []).map((post) => ({
    title: cleanText(post.text),
    url: `https://x.com/i/web/status/${post.id}`,
    source: "X",
    sourceUrl: "https://x.com/realDonaldTrump",
    publishedAt: post.created_at || null,
    summary: cleanText(post.text),
    score: scoreText(post.text)
  }));
}

function parseForexFactoryCalendar(html) {
  if (html.includes("Just a moment") || html.includes("Enable JavaScript and cookies")) {
    return [];
  }

  const lines = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .split("\n")
    .map(cleanText)
    .filter(Boolean);

  const usdEvents = [];
  let time = "";
  let currency = "";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\d{1,2}:\d{2}(am|pm)$/i.test(line) || /^Tentative$/i.test(line)) {
      time = line;
      continue;
    }
    if (/^[A-Z]{3}$/.test(line)) {
      currency = line;
      continue;
    }
    if (currency !== "USD") continue;

    const eventId = eventIdFromCalendarTitle(line);
    const isMacro = eventId || /budget|crude oil|jobless|rate|fomc|treasury/i.test(line);
    if (!isMacro) continue;

    const values = [];
    let cursor = index + 1;
    while (cursor < lines.length && values.length < 3) {
      const next = lines[cursor];
      if (/^\d{1,2}:\d{2}(am|pm)$/i.test(next) || /^[A-Z]{3}$/.test(next)) break;
      if (/^-?\d+(\.\d+)?(%|K|M|B)?(\|\d+(\.\d+)?)?$/i.test(next)) values.push(next);
      cursor += 1;
    }

    usdEvents.push({
      time,
      currency,
      impact: eventId ? "high" : "medium",
      title: line,
      actual: values.length === 3 ? values[0] : "",
      forecast: values.length >= 2 ? values[values.length - 2] : values[0] || "",
      previous: values.length >= 2 ? values[values.length - 1] : ""
    });
  }

  return usdEvents;
}

async function getEconomicCalendar(requestedDate = new Date()) {
  const key = todayKey(requestedDate);
  const sourceUrl = `https://www.forexfactory.com/calendar?day=${forexFactoryDaySlug(requestedDate)}`;
  let sourceStatus = "live";
  let events = [];

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
      }
    });
    const html = await response.text();
    events = parseForexFactoryCalendar(html);
    if (!response.ok || events.length === 0) sourceStatus = "fallback";
  } catch {
    sourceStatus = "fallback";
  }

  if (events.length === 0 && CALENDAR_FALLBACKS[key]) {
    events = CALENDAR_FALLBACKS[key];
  }

  return {
    date: key,
    source: "Forex Factory",
    sourceUrl,
    sourceStatus,
    focusEventId: focusEventFromCalendar(events),
    events
  };
}

async function getMonthlyMacroHistory(month) {
  if (!/^\d{4}-\d{2}$/.test(month || "")) {
    throw new Error("month must be in YYYY-MM format");
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const selected = {};
  const sourceDays = [];
  let liveDays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, monthNumber - 1, day));
    const calendar = await getEconomicCalendar(date);
    sourceDays.push({
      date: calendar.date,
      status: calendar.sourceStatus,
      count: calendar.events.length
    });
    if (calendar.sourceStatus === "live") liveDays += 1;

    for (const event of calendar.events) {
      const id = monthlyEventIdFromTitle(event.title);
      if (!id) continue;
      const candidate = {
        title: event.title,
        date: calendar.date,
        time: event.time,
        actual: normalizeMacroValue(event.actual),
        forecast: normalizeMacroValue(event.forecast),
        previous: normalizeMacroValue(event.previous),
        source: calendar.source,
        sourceUrl: calendar.sourceUrl,
        priority: eventPriority(event.title)
      };
      if (!candidate.actual && !candidate.forecast && !candidate.previous) continue;
      if (!selected[id] || candidate.priority < selected[id].priority) {
        selected[id] = candidate;
      }
    }
  }

  const events = {};
  for (const [id, event] of Object.entries(selected)) {
    events[id] = {
      actual: event.actual,
      forecast: event.forecast,
      previous: event.previous,
      updatedAt: new Date().toISOString(),
      source: "Forex Factory",
      sourceTitle: event.title,
      sourceDate: event.date
    };
  }

  return {
    month,
    source: "Forex Factory",
    sourceStatus: liveDays > 0 ? "live" : "unavailable",
    liveDays,
    daysScanned: daysInMonth,
    events,
    sourceDays
  };
}

async function getNews() {
  const pages = await Promise.allSettled(SOURCE_URLS.map(fetchSource));
  const xItems = await fetchXItems();
  const items = [];

  pages.forEach((result, index) => {
    if (result.status === "fulfilled") {
      items.push(...extractItems(result.value, SOURCE_URLS[index]));
    }
  });
  items.push(...xItems);

  const unique = [];
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    unique.push(item);
  }

  const scored = await scoreWithOpenAI(unique.slice(0, 20));
  const averages = scored.reduce(
    (acc, item) => {
      acc.usd += Number(item.score?.USD_Impact || 0);
      acc.risk += Number(item.score?.Geopolitical_Risk || 0);
      return acc;
    },
    { usd: 0, risk: 0 }
  );

  const divisor = scored.length || 1;
  return {
    updatedAt: new Date().toISOString(),
    scoringMode: process.env.OPENAI_API_KEY ? "ai_optional" : "keyword",
    summary: {
      USD_Impact: Number((averages.usd / divisor).toFixed(1)),
      Geopolitical_Risk: Number((averages.risk / divisor).toFixed(1)),
      itemCount: scored.length
    },
    items: scored
  };
}

async function fetchYahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.yahoo)}?range=1d&interval=5m`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "MacroNewsApp/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`market data failed for ${symbol.label}: ${response.status}`);
  }

  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  const meta = result?.meta || {};
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const validCloses = closes.filter((value) => Number.isFinite(Number(value))).map(Number);
  const currentRaw = Number(meta.regularMarketPrice || validCloses.at(-1) || 0);
  const previousRaw = Number(meta.previousClose || meta.chartPreviousClose || validCloses[0] || currentRaw);
  const current = Number((currentRaw * (symbol.scale || 1)).toFixed(symbol.id === "us10y" ? 3 : 5));
  const previous = Number((previousRaw * (symbol.scale || 1)).toFixed(symbol.id === "us10y" ? 3 : 5));
  const change = Number((current - previous).toFixed(symbol.id === "us10y" ? 3 : 5));
  const changePercent = previous ? Number(((change / previous) * 100).toFixed(2)) : 0;

  return {
    id: symbol.id,
    label: symbol.label,
    sourceSymbol: symbol.yahoo,
    price: current,
    previous,
    change,
    changePercent,
    direction: changePercent > 0.05 ? "up" : changePercent < -0.05 ? "down" : "flat",
    updatedAt: new Date().toISOString()
  };
}

async function getMarketData() {
  const results = await Promise.allSettled(MARKET_SYMBOLS.map(fetchYahooQuote));
  const quotes = {};
  const errors = [];

  results.forEach((result, index) => {
    const symbol = MARKET_SYMBOLS[index];
    if (result.status === "fulfilled") {
      quotes[symbol.id] = result.value;
    } else {
      errors.push({ id: symbol.id, label: symbol.label, message: result.reason?.message || "failed" });
    }
  });

  return {
    updatedAt: new Date().toISOString(),
    source: "Yahoo Finance",
    quotes,
    errors
  };
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname === "/learn" ? "/learn.html" : url.pathname;
  const filePath = normalize(join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === "/health" || url.pathname === "/api/wake") {
      json(res, 200, {
        ok: true,
        status: "awake",
        service: "macro-news-app",
        updatedAt: new Date().toISOString()
      });
      return;
    }
    if (url.pathname === "/api/news") {
      json(res, 200, await getNews());
      return;
    }
    if (url.pathname === "/api/calendar") {
      const dateParam = url.searchParams.get("date");
      const requestedDate = dateParam ? new Date(`${dateParam}T00:00:00Z`) : new Date();
      json(res, 200, await getEconomicCalendar(requestedDate));
      return;
    }
    if (url.pathname === "/api/monthly-history") {
      json(res, 200, await getMonthlyMacroHistory(url.searchParams.get("month")));
      return;
    }
    if (url.pathname === "/api/market-data") {
      json(res, 200, await getMarketData());
      return;
    }
    if (url.pathname === "/api/fundamentals" && req.method === "GET") {
      json(res, 200, await readFundamentals());
      return;
    }
    if (url.pathname === "/api/fundamentals" && req.method === "POST") {
      json(res, 200, await writeFundamentals(await readJsonBody(req)));
      return;
    }
    if (url.pathname === "/api/alert" && req.method === "POST") {
      json(res, 200, await sendWebhookAlert(await readJsonBody(req)));
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    json(res, 500, {
      error: error.message,
      USD_Impact: 0,
      Geopolitical_Risk: 0
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Macro News App running at http://${HOST}:${PORT}`);
});
