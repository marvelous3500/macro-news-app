const APP_TIME_ZONE = "Africa/Lagos";

const ECON_EVENTS = [
  {
    id: "pmi",
    name: "PMI",
    timing: "First week",
    role: "Leading growth signal",
    previousLabel: "Previous PMI",
    forecastLabel: "Forecast PMI",
    actualLabel: "Actual PMI",
    defaultPrevious: 50,
    defaultForecast: 50,
    next: "nfp"
  },
  {
    id: "nfp",
    name: "NFP",
    timing: "First Friday",
    role: "Labor confirmation",
    previousLabel: "Previous jobs",
    forecastLabel: "Forecast jobs",
    actualLabel: "Actual jobs",
    defaultPrevious: 150,
    defaultForecast: 150,
    suffix: "k",
    next: "ppi"
  },
  {
    id: "ppi",
    name: "PPI",
    timing: "Second week",
    role: "Wholesale inflation",
    previousLabel: "Previous PPI",
    forecastLabel: "Forecast PPI",
    actualLabel: "Actual PPI",
    defaultPrevious: 0.2,
    defaultForecast: 0.2,
    suffix: "%",
    next: "cpi"
  },
  {
    id: "cpi",
    name: "CPI",
    timing: "Mid-month",
    role: "Retail inflation",
    previousLabel: "Previous CPI",
    forecastLabel: "Forecast CPI",
    actualLabel: "Actual CPI",
    defaultPrevious: 0.2,
    defaultForecast: 0.2,
    suffix: "%",
    next: "pmi"
  }
];

const state = {
  items: [],
  filter: "all",
  history: [],
  activeMonth: monthKey(),
  calendar: null,
  marketData: null,
  monthlyHistory: {},
  monthlyHistoryLoading: false,
  data: loadStoredFundamentalData()
};

const usdScore = document.querySelector("#usdScore");
const riskScore = document.querySelector("#riskScore");
const itemCount = document.querySelector("#itemCount");
const updatedAt = document.querySelector("#updatedAt");
const modeText = document.querySelector("#modeText");
const newsList = document.querySelector("#newsList");
const refreshBtn = document.querySelector("#refreshBtn");
const eventRail = document.querySelector("#eventRail");
const dataEditor = document.querySelector("#dataEditor");
const nextEventTitle = document.querySelector("#nextEventTitle");
const nextEventNarrative = document.querySelector("#nextEventNarrative");
const expectationList = document.querySelector("#expectationList");
const monthlyRecapStatus = document.querySelector("#monthlyRecapStatus");
const monthlyRecap = document.querySelector("#monthlyRecap");
const usdBias = document.querySelector("#usdBias");
const goldBias = document.querySelector("#goldBias");
const macroRegime = document.querySelector("#macroRegime");
const fedBias = document.querySelector("#fedBias");
const yieldBias = document.querySelector("#yieldBias");
const riskBias = document.querySelector("#riskBias");
const chainFlow = document.querySelector("#chainFlow");
const assetGrid = document.querySelector("#assetGrid");
const manualControls = document.querySelector("#manualControls");
const confidenceBadge = document.querySelector("#confidenceBadge");
const dailyPlaybook = document.querySelector("#dailyPlaybook");
const tradeBiasScores = document.querySelector("#tradeBiasScores");
const forecastOutlook = document.querySelector("#forecastOutlook");
const scenarioBuilder = document.querySelector("#scenarioBuilder");
const postNewsTracker = document.querySelector("#postNewsTracker");
const marketConfirmation = document.querySelector("#marketConfirmation");
const macroMemory = document.querySelector("#macroMemory");
const alertPanel = document.querySelector("#alertPanel");
const explainMode = document.querySelector("#explainMode");
const causeEffect = document.querySelector("#causeEffect");
const educationCards = document.querySelector("#educationCards");
const newsChecklist = document.querySelector("#newsChecklist");
const contradictionDetector = document.querySelector("#contradictionDetector");
const glossaryPanel = document.querySelector("#glossaryPanel");
const tradeJournal = document.querySelector("#tradeJournal");
const lightThemeBtn = document.querySelector("#lightThemeBtn");
const darkThemeBtn = document.querySelector("#darkThemeBtn");
const monthPicker = document.querySelector("#monthPicker");
const eventOverride = document.querySelector("#eventOverride");
const calendarStatus = document.querySelector("#calendarStatus");
const calendarList = document.querySelector("#calendarList");
const marketStatus = document.querySelector("#marketStatus");
const marketList = document.querySelector("#marketList");
const pageLoader = document.querySelector("#pageLoader");
const pageLoaderTitle = document.querySelector("#pageLoaderTitle");
const pageLoaderText = document.querySelector("#pageLoaderText");
const canvas = document.querySelector("#signalCanvas");
const ctx = canvas.getContext("2d");

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("macro-theme", nextTheme);
  lightThemeBtn.classList.toggle("active", nextTheme === "light");
  darkThemeBtn.classList.toggle("active", nextTheme === "dark");
  lightThemeBtn.setAttribute("aria-pressed", String(nextTheme === "light"));
  darkThemeBtn.setAttribute("aria-pressed", String(nextTheme === "dark"));
  if (state.history.length > 0) {
    drawChart({
      USD_Impact: state.history.at(-1).usd,
      Geopolitical_Risk: state.history.at(-1).risk
    }, false);
  }
}

function themeColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function nigeriaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function nigeriaDateKey(date = new Date()) {
  const parts = nigeriaDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function monthKey(date = new Date()) {
  const parts = nigeriaDateParts(date);
  return `${parts.year}-${parts.month}`;
}

function isPreviousMonth(month = state.activeMonth) {
  return month < monthKey();
}

function setPageLoading(isLoading, title = "Loading data", text = "Please wait while the app fetches macroeconomic data.") {
  pageLoaderTitle.textContent = title;
  pageLoaderText.textContent = text;
  pageLoader.hidden = !isLoading;
  document.body.classList.toggle("is-loading", isLoading);
}

function loadStoredFundamentalData() {
  try {
    const stored = JSON.parse(localStorage.getItem("macro-fundamental-data") || "{}");
    if (!stored || typeof stored !== "object") return { months: {} };
    if (stored.months) return stored;

    const migratedEvents = {};
    ECON_EVENTS.forEach((event) => {
      if (stored[event.id]) migratedEvents[event.id] = stored[event.id];
    });
    return {
      months: {
        [monthKey()]: {
          override: "auto",
          events: migratedEvents
        }
      }
    };
  } catch {
    return { months: {} };
  }
}

function saveFundamentalData() {
  localStorage.setItem("macro-fundamental-data", JSON.stringify(state.data));
  fetch("/api/fundamentals", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(state.data)
  }).catch(() => {});
}

async function loadSharedFundamentalData() {
  try {
    const response = await fetch("/api/fundamentals");
    const data = await response.json();
    if (!response.ok || !data || typeof data !== "object") return;
    if (!data.months || typeof data.months !== "object") return;
    state.data = data;
    localStorage.setItem("macro-fundamental-data", JSON.stringify(state.data));
  } catch {
    // Keep local data if the server-side store is unavailable.
  }
}

function defaultEventData(event) {
  return {
    previous: event.defaultPrevious,
    forecast: event.defaultForecast,
    actual: "",
    updatedAt: ""
  };
}

function monthRecord(month = state.activeMonth) {
  if (!state.data.months) state.data.months = {};
  if (!state.data.months[month]) {
    state.data.months[month] = {
      override: "auto",
      events: {},
      market: defaultMarketControls(),
      scenario: defaultScenario(),
      postNews: defaultPostNews(),
      checklist: defaultChecklist(),
      journalDraft: defaultJournalDraft(),
      trades: [],
      memory: []
    };
  }
  if (!state.data.months[month].market) state.data.months[month].market = defaultMarketControls();
  if (!state.data.months[month].scenario) state.data.months[month].scenario = defaultScenario();
  if (!state.data.months[month].postNews) state.data.months[month].postNews = defaultPostNews();
  if (!state.data.months[month].checklist) state.data.months[month].checklist = defaultChecklist();
  if (!state.data.months[month].journalDraft) state.data.months[month].journalDraft = defaultJournalDraft();
  if (!Array.isArray(state.data.months[month].trades)) state.data.months[month].trades = [];
  if (!Array.isArray(state.data.months[month].memory)) state.data.months[month].memory = [];
  return state.data.months[month];
}

function defaultMarketControls() {
  return {
    yields: "auto",
    usd: "auto",
    risk: "auto",
    fomc: "hold",
    dxy: "",
    us10y: "",
    gold: "",
    us30: "",
    btc: "",
    usdjpy: ""
  };
}

function defaultScenario() {
  return {
    event: "cpi",
    actual: "",
    forecast: "",
    previous: ""
  };
}

function defaultPostNews() {
  return {
    event: "cpi",
    actual: "",
    forecast: "",
    previous: "",
    reaction: "pending",
    note: ""
  };
}

function defaultChecklist() {
  return {
    forecastChecked: false,
    previousChecked: false,
    actualChecked: false,
    dxyChecked: false,
    yieldsChecked: false,
    assetChecked: false
  };
}

function defaultJournalDraft() {
  return {
    event: "cpi",
    bias: "",
    actual: "",
    reaction: "",
    lesson: ""
  };
}

function marketControls() {
  return {
    ...defaultMarketControls(),
    ...(monthRecord().market || {})
  };
}

function scenarioData() {
  return {
    ...defaultScenario(),
    ...(monthRecord().scenario || {})
  };
}

function postNewsData() {
  return {
    ...defaultPostNews(),
    ...(monthRecord().postNews || {})
  };
}

function checklistData() {
  return {
    ...defaultChecklist(),
    ...(monthRecord().checklist || {})
  };
}

function journalDraft() {
  return {
    ...defaultJournalDraft(),
    ...(monthRecord().journalDraft || {})
  };
}

function mergeMonthlyHistory(month, history) {
  const record = monthRecord(month);
  record.events = record.events || {};
  let changed = false;

  ECON_EVENTS.forEach((event) => {
    const incoming = history.events?.[event.id];
    if (!incoming) return;
    const existing = {
      ...defaultEventData(event),
      ...(record.events[event.id] || {})
    };
    const next = { ...existing };
    ["actual", "forecast", "previous"].forEach((field) => {
      if ((next[field] === "" || next[field] === null || typeof next[field] === "undefined") && incoming[field] !== "") {
        next[field] = incoming[field];
        changed = true;
      }
    });
    if (incoming.source) {
      next.source = incoming.source;
      next.sourceTitle = incoming.sourceTitle;
      next.sourceDate = incoming.sourceDate;
    }
    record.events[event.id] = next;
  });

  if (changed) saveFundamentalData();
  return changed;
}

function normalizeMacroInput(value = "") {
  const match = String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? match[0] : "";
}

function calendarEventPriority(eventId, title = "") {
  const lowered = title.toLowerCase();
  if ((eventId === "cpi" || eventId === "ppi") && lowered === `${eventId} m/m`) return 0;
  if ((eventId === "cpi" || eventId === "ppi") && lowered.includes("core")) return 2;
  if ((eventId === "cpi" || eventId === "ppi") && lowered.includes("y/y")) return 3;
  return 1;
}

function bestCalendarEvent(eventId) {
  const matches = (state.calendar?.events || [])
    .filter((event) => eventIdFromTitle(event.title) === eventId)
    .sort((a, b) => calendarEventPriority(eventId, a.title) - calendarEventPriority(eventId, b.title));
  return matches[0] || null;
}

function mergeCurrentCalendarData() {
  if (!state.calendar?.events?.length || state.activeMonth !== monthKey()) return false;

  const record = monthRecord();
  record.events = record.events || {};
  let changed = false;

  ECON_EVENTS.forEach((event) => {
    const incoming = bestCalendarEvent(event.id);
    if (!incoming) return;

    const existing = {
      ...defaultEventData(event),
      ...(record.events[event.id] || {})
    };
    const defaults = defaultEventData(event);
    const next = { ...existing };

    ["actual", "forecast", "previous"].forEach((field) => {
      const value = normalizeMacroInput(incoming[field]);
      if (!value) return;
      const shouldUpdate = (
        next[field] === ""
        || next[field] === null
        || typeof next[field] === "undefined"
        || String(next[field]) === String(defaults[field])
      );
      if (shouldUpdate && String(next[field]) !== value) {
        next[field] = value;
        changed = true;
      }
    });

    if (incoming.actualSource || incoming.date) {
      next.source = incoming.actualSource || state.calendar.source || "Economic calendar";
      next.sourceTitle = incoming.title;
      next.sourceDate = incoming.date || state.calendar.date;
    }
    record.events[event.id] = next;
  });

  if (changed) saveFundamentalData();
  return changed;
}

async function loadMonthlyHistory(month = state.activeMonth) {
  if (!isPreviousMonth(month)) {
    state.monthlyHistory[month] = null;
    state.monthlyHistoryLoading = false;
    setPageLoading(false);
    renderGuideSummary();
    return;
  }

  state.monthlyHistoryLoading = true;
  setPageLoading(
    true,
    "Loading monthly macro history",
    `Fetching PMI, NFP, PPI and CPI for ${month} from Forex Factory.`
  );
  renderMonthlyRecap();
  try {
    const response = await fetch(`/api/monthly-history?month=${encodeURIComponent(month)}`);
    const history = await response.json();
    if (!response.ok) throw new Error(history.error || "Failed to load monthly history");
    if (!history.events || Object.keys(history.events).length === 0) {
      throw new Error("Forex Factory did not return PMI, NFP, PPI or CPI for this month.");
    }
    state.monthlyHistory[month] = history;
    mergeMonthlyHistory(month, history);
  } catch (error) {
    state.monthlyHistory[month] = {
      sourceStatus: "unavailable",
      error: error.message,
      events: {}
    };
    setPageLoading(
      true,
      "Monthly data not loaded",
      `${error.message} Please retry the month or enter the values manually.`
    );
    setTimeout(() => setPageLoading(false), 4500);
  } finally {
    state.monthlyHistoryLoading = false;
    if (state.monthlyHistory[month]?.sourceStatus !== "unavailable") {
      setPageLoading(false);
    }
  }
  renderFundamentalGuide();
}

function eventData(eventId) {
  const event = ECON_EVENTS.find((item) => item.id === eventId);
  const record = monthRecord();
  return {
    ...defaultEventData(event),
    ...(record.events[eventId] || {})
  };
}

function hasActual(eventId) {
  const actual = eventData(eventId).actual;
  return actual !== "" && actual !== null && typeof actual !== "undefined" && !Number.isNaN(Number(actual));
}

function dateBasedStage(date = new Date()) {
  const parts = nigeriaDateParts(date);
  const day = Number(parts.day);
  const weekday = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`).getUTCDay();

  if (day <= 5) return "pmi";
  if (day <= 7 && weekday >= 1 && weekday <= 5) return "nfp";
  if (day <= 12) return "ppi";
  if (day <= 18) return "cpi";
  return "pmi";
}

function currentMonthlyStage(date = new Date()) {
  const override = monthRecord().override || "auto";
  if (override !== "auto") return override;
  if (state.calendar?.focusEventId) return state.calendar.focusEventId;

  const firstMissing = ECON_EVENTS.find((event) => !hasActual(event.id));
  if (firstMissing) return firstMissing.id;
  return dateBasedStage(date);
}

function latestValue(eventId) {
  const data = eventData(eventId);
  const actual = Number(data.actual);
  if (!Number.isNaN(actual) && data.actual !== "") return actual;
  return Number(data.previous || 0);
}

function surprise(eventId) {
  const data = eventData(eventId);
  const actual = Number(data.actual);
  const forecast = Number(data.forecast);
  if (Number.isNaN(actual) || data.actual === "" || Number.isNaN(forecast)) return 0;
  return actual - forecast;
}

function pctSurprise(eventId) {
  const data = eventData(eventId);
  const actual = Number(data.actual);
  const forecast = Number(data.forecast);
  if (Number.isNaN(actual) || Number.isNaN(forecast) || forecast === 0 || data.actual === "") return 0;
  return ((actual - forecast) / Math.abs(forecast)) * 100;
}

function scoreLabel(score, positive, negative, neutral = "Mixed") {
  if (score >= 2) return positive;
  if (score <= -2) return negative;
  return neutral;
}

function directionLabel(value, up, down, flat = "Mixed") {
  if (value === "up") return up;
  if (value === "down") return down;
  return flat;
}

function buildMacroModel() {
  const controls = marketControls();
  const pmi = latestValue("pmi");
  const nfpSurprise = pctSurprise("nfp");
  const pmiSurprise = pctSurprise("pmi");
  const ppiSurprise = pctSurprise("ppi");
  const cpiSurprise = pctSurprise("cpi");
  let growth = 0;
  let inflation = 0;

  if (hasActual("pmi")) growth += pmi >= 50 ? 1.5 : -1.5;
  if (pmiSurprise > 0) growth += 1;
  if (pmiSurprise < 0) growth -= 1;
  if (nfpSurprise > 0) growth += 1.5;
  if (nfpSurprise < 0) growth -= 1.5;

  if (ppiSurprise > 0) inflation += 1.5;
  if (ppiSurprise < 0) inflation -= 1.5;
  if (cpiSurprise > 0) inflation += 2;
  if (cpiSurprise < 0) inflation -= 2;
  if (!hasActual("cpi") && (ppiSurprise > 0 || latestValue("ppi") > Number(eventData("ppi").forecast || 0))) inflation += 1;

  let fedScore = inflation + growth * 0.35;
  if (controls.fomc === "hike") fedScore += 2.5;
  if (controls.fomc === "cut") fedScore -= 2.5;

  const yields = controls.yields !== "auto" ? controls.yields : fedScore >= 1.5 ? "up" : fedScore <= -1.5 ? "down" : "flat";
  const usd = controls.usd !== "auto" ? controls.usd : yields === "up" ? "up" : yields === "down" ? "down" : "flat";
  const risk = controls.risk !== "auto" ? controls.risk : growth >= 1.5 && inflation < 2 ? "on" : fedScore >= 2 ? "off" : "mixed";

  const yieldScore = yields === "up" ? 2 : yields === "down" ? -2 : 0;
  const usdScore = usd === "up" ? 2 : usd === "down" ? -2 : 0;
  const riskScoreValue = risk === "on" ? 2 : risk === "off" ? -2 : 0;
  const assetScores = {
    gold: Math.max(-10, Math.min(10, -2 * yieldScore - 2 * usdScore + (risk === "off" ? 1 : 0))),
    us30: Math.max(-10, Math.min(10, growth - yieldScore - inflation * 0.6)),
    btc: Math.max(-10, Math.min(10, riskScoreValue - usdScore - yieldScore)),
    jpy: Math.max(-10, Math.min(10, risk === "off" ? 5 : risk === "on" ? -4 : 0))
  };

  const gold = scoreLabel(assetScores.gold, "Bullish", "Bearish / pressured");
  const us30 = scoreLabel(assetScores.us30, "Bullish", "Bearish");
  const btc = scoreLabel(assetScores.btc, "Bullish risk-on", "Bearish risk-off");
  const jpy = scoreLabel(assetScores.jpy, "Bullish safe haven", "Bearish safe haven", "Mixed safe haven");

  const alignedSignals = [
    hasActual("pmi"),
    hasActual("nfp"),
    hasActual("ppi"),
    state.calendar?.focusEventId === "cpi",
    Math.abs(growth) >= 2,
    Math.abs(inflation) >= 1.5,
    Math.abs(fedScore) >= 2,
    yields !== "flat",
    usd !== "flat"
  ].filter(Boolean).length;
  const confidenceScore = Math.min(100, Math.round((alignedSignals / 9) * 100));
  const confidence = confidenceScore >= 75 ? "High confidence" : confidenceScore >= 45 ? "Medium confidence" : "Low confidence";

  const cpiExpectation = !hasActual("cpi") && (ppiSurprise > 0 || growth >= 2)
    ? "Higher CPI expected"
    : !hasActual("cpi") && ppiSurprise < 0
      ? "Softer CPI possible"
      : "CPI data needed";

  return {
    growth,
    inflation,
    fedScore,
    cpiExpectation,
    labels: {
      growth: scoreLabel(growth, "Economy strong", "Economy weak"),
      inflation: scoreLabel(inflation, "Inflation rising", "Inflation cooling"),
      fed: scoreLabel(fedScore, "Fed hike / higher-for-longer", "Fed cut pressure", "Fed hold"),
      yields: directionLabel(yields, "Higher yields", "Lower yields", "Yields mixed"),
      usd: directionLabel(usd, "Stronger USD", "Weaker USD", "USD mixed"),
      risk: risk === "on" ? "Risk-on" : risk === "off" ? "Risk-off" : "Risk mixed"
    },
    directions: { yields, usd, risk },
    confidence,
    confidenceScore,
    assetScores,
    assets: [
      { id: "gold", name: "Gold", bias: gold, score: assetScores.gold, why: "Higher yields and stronger USD pressure gold; lower yields support it." },
      { id: "us30", name: "US30", bias: us30, score: assetScores.us30, why: "Dow likes steady growth, but hawkish Fed pressure can drag cyclicals." },
      { id: "btc", name: "BTC", bias: btc, score: assetScores.btc, why: "BTC behaves like risk-on liquidity when USD/yields are not squeezing." },
      { id: "jpy", name: "JPY", bias: jpy, score: assetScores.jpy, why: "JPY is treated as a safe haven when risk-off pressure rises." }
    ]
  };
}

function buildFundamentalSignal(nextEventId) {
  const pmi = latestValue("pmi");
  const nfp = latestValue("nfp");
  const ppi = latestValue("ppi");
  const cpi = latestValue("cpi");
  const pmiSurprise = surprise("pmi");
  const nfpSurprise = surprise("nfp");
  const ppiSurprise = surprise("ppi");
  const cpiSurprise = surprise("cpi");
  const clues = [];
  let usd = 0;
  let gold = 0;

  if (hasActual("pmi") && pmi >= 50) {
    usd += 1;
    gold -= 1;
    clues.push("PMI is above 50, so the growth backdrop is expansionary.");
  } else if (hasActual("pmi")) {
    usd -= 1;
    gold += 1;
    clues.push("PMI is below 50, so growth risk is higher before labor data.");
  }

  if (pmiSurprise > 0) {
    usd += 1;
    clues.push("PMI beat forecast, so NFP risk leans stronger.");
  }
  if (nfpSurprise > 0) {
    usd += 1;
    gold -= 1;
    clues.push("NFP beat forecast, so rate-cut expectations may cool.");
  }
  if (nfpSurprise < 0) {
    usd -= 1;
    gold += 1;
    clues.push("NFP missed forecast, so USD can weaken if yields fall.");
  }
  if (ppiSurprise > 0 || ppi > 0.3) {
    usd += 1;
    gold -= 1;
    clues.push("PPI is hot, so CPI risk leans hotter and more USD supportive.");
  }
  if (cpiSurprise > 0 || cpi > 0.3) {
    usd += 1.5;
    gold -= 1;
    clues.push("CPI is hot, so the market may price a more hawkish Fed path.");
  }
  if (cpiSurprise < 0) {
    usd -= 1.5;
    gold += 1;
    clues.push("CPI missed forecast, so gold can benefit from softer real-yield pressure.");
  }

  const nextEvent = ECON_EVENTS.find((event) => event.id === nextEventId);
  const eventName = nextEvent?.name || "next report";
  const releaseRule = nextEvent ? releasePlaybook(nextEvent.id) : "";
  const narrative = `Next focus is ${eventName}. ${releaseRule}`;

  return {
    usd: Math.max(-5, Math.min(5, usd)),
    gold: Math.max(-5, Math.min(5, gold)),
    narrative,
    clues: clues.slice(0, 5)
  };
}

function releasePlaybook(eventId) {
  if (eventId === "pmi") {
    return "A stronger PMI usually sets up USD strength and gold pressure because growth expectations improve.";
  }
  if (eventId === "nfp") {
    return "If NFP beats forecast after firm PMI, USD can strengthen as rate-cut expectations reduce; a miss is usually gold supportive.";
  }
  if (eventId === "ppi") {
    return "If PPI is hot, prepare for a hotter CPI setup and a more hawkish USD reaction.";
  }
  if (eventId === "cpi") {
    return "If CPI beats forecast, USD and yields usually rise while gold faces pressure; if CPI misses, gold can rally on softer real yields.";
  }
  return "Use the previous releases as the setup, then trade the surprise against forecast when the data lands.";
}

function biasLabel(asset, value) {
  if (value >= 2) return `${asset} bullish`;
  if (value <= -2) return `${asset} bearish`;
  return `${asset} mixed`;
}

function formatEventValue(event, value) {
  if (value === "" || value === null || typeof value === "undefined") return "-";
  return `${value}${event.suffix || ""}`;
}

function eventSurpriseState(eventId) {
  const data = eventData(eventId);
  const actual = Number(data.actual);
  const forecast = Number(data.forecast);
  if (data.actual === "" || Number.isNaN(actual) || Number.isNaN(forecast)) {
    return {
      state: "missing",
      label: "No actual data",
      tone: "mixed",
      surprise: 0
    };
  }

  const surpriseValue = actual - forecast;
  if (surpriseValue > 0) {
    return {
      state: "beat",
      label: "Beat forecast",
      tone: "bullish",
      surprise: surpriseValue
    };
  }
  if (surpriseValue < 0) {
    return {
      state: "miss",
      label: "Missed forecast",
      tone: "bearish",
      surprise: surpriseValue
    };
  }
  return {
    state: "inline",
    label: "In line",
    tone: "mixed",
    surprise: 0
  };
}

function calendarEventDate(eventId) {
  const event = state.calendar?.events?.find((item) => eventIdFromTitle(item.title) === eventId);
  return event?.date || "";
}

function eventIdFromTitle(title = "") {
  const lowered = title.toLowerCase();
  if (lowered.includes("cpi")) return "cpi";
  if (lowered.includes("ppi")) return "ppi";
  if (lowered.includes("non-farm") || lowered.includes("nonfarm") || lowered.includes("nfp")) return "nfp";
  if (lowered.includes("pmi")) return "pmi";
  return "";
}

function shouldUsePpiForCpiPrediction() {
  if (!hasActual("ppi")) return false;
  const ppiDate = eventData("ppi").sourceDate || calendarEventDate("ppi");
  const cpiDate = eventData("cpi").sourceDate || calendarEventDate("cpi");
  if (ppiDate && cpiDate) return ppiDate <= cpiDate;
  return hasActual("ppi") && !state.calendar?.focusEventId;
}

function predictCpiOutcome() {
  const pmiState = eventSurpriseState("pmi").state;
  const nfpState = eventSurpriseState("nfp").state;
  const ppiState = eventSurpriseState("ppi").state;
  const ppiValue = latestValue("ppi");
  const ppiForecast = Number(eventData("ppi").forecast || 0);
  const cpiForecast = Number(eventData("cpi").forecast);
  const cpiPrevious = Number(eventData("cpi").previous);
  const ppiCanGuideCpi = shouldUsePpiForCpiPrediction();
  let score = 0;
  let availableWeight = 0;
  const reasons = [];

  if (pmiState === "beat") {
    score += 1;
    availableWeight += 1;
    reasons.push("PMI beat forecast, so business activity is stronger.");
  }
  if (pmiState === "miss") {
    score -= 1;
    availableWeight += 1;
    reasons.push("PMI missed forecast, so growth pressure is softer.");
  }
  if (nfpState === "beat") {
    score += 1;
    availableWeight += 1;
    reasons.push("NFP beat forecast, so labor demand is strong.");
  }
  if (nfpState === "miss") {
    score -= 1;
    availableWeight += 1;
    reasons.push("NFP missed forecast, so demand may be cooling.");
  }
  if (ppiCanGuideCpi && (ppiState === "beat" || (hasActual("ppi") && ppiValue > ppiForecast))) {
    score += 2;
    availableWeight += 2;
    reasons.push("PPI was hot, so producer costs can feed into CPI.");
  }
  if (ppiCanGuideCpi && ppiState === "miss") {
    score -= 2;
    availableWeight += 2;
    reasons.push("PPI cooled, so CPI pressure may soften.");
  }
  if (!ppiCanGuideCpi && hasActual("ppi")) {
    reasons.push("PPI is ignored for this CPI setup because it comes after CPI on the calendar.");
  }
  if (!ppiCanGuideCpi && !Number.isNaN(cpiForecast) && !Number.isNaN(cpiPrevious)) {
    availableWeight += 1;
    if (cpiForecast > cpiPrevious) {
      score += 1;
      reasons.push("CPI forecast is above previous, so inflation is expected to accelerate.");
    } else if (cpiForecast < cpiPrevious) {
      score -= 1;
      reasons.push("CPI forecast is below previous, so inflation is expected to cool.");
    } else {
      reasons.push("CPI forecast is equal to previous, so no acceleration is expected.");
    }
  }

  const confidence = availableWeight === 0
    ? 0
    : Math.min(90, Math.max(40, Math.round((Math.abs(score) / availableWeight) * 100)));
  const confidenceText = confidence ? `${confidence}% confidence` : "0% confidence";

  if (score >= 2) {
    return {
      bias: "higher",
      label: `Higher CPI expected (${confidenceText})`,
      tone: "bullish",
      confidence,
      summary: `Prediction before CPI: released data leans toward a hotter CPI print with ${confidenceText}. If CPI confirms hot, expect stronger USD, higher yields and Gold pressure.`,
      details: [
        `Prediction confidence: ${confidenceText}`,
        "Expected USD outcome: stronger dollar bias",
        "Expected yields: higher if CPI confirms hot",
        "Expected Gold: bearish pressure",
        ...reasons.slice(0, 3)
      ]
    };
  }
  if (score <= -2) {
    return {
      bias: "lower",
      label: `Softer CPI possible (${confidenceText})`,
      tone: "bearish",
      confidence,
      summary: `Prediction before CPI: prior data leans cooler with ${confidenceText}. If CPI confirms soft, expect weaker USD, lower yields and Gold relief.`,
      details: [
        `Prediction confidence: ${confidenceText}`,
        "Expected USD outcome: weaker dollar bias",
        "Expected yields: lower if CPI confirms soft",
        "Expected Gold: bullish relief",
        ...reasons.slice(0, 3)
      ]
    };
  }

  return {
    bias: "mixed",
    label: `CPI prediction mixed (${confidenceText})`,
    tone: "mixed",
    confidence,
    summary: `Prediction before CPI: released data is mixed or incomplete, so confidence is ${confidenceText}. Wait for actual CPI plus DXY and US10Y confirmation.`,
    details: [
      `Prediction confidence: ${confidenceText}`,
      "Expected USD outcome: mixed until CPI lands",
      "Expected yields: mixed until CPI lands",
      "Expected Gold: wait for CPI reaction",
      ...reasons.slice(0, 3)
    ]
  };
}

function outcomeForEvent(eventId, stateLabel) {
  if (stateLabel === "missing") {
    if (eventId === "cpi") return predictCpiOutcome().summary;
    return "No outcome yet. Add the actual value to know whether this release supported a strong dollar, weak dollar, higher yields, or lower yields.";
  }
  if (stateLabel === "inline") {
    return "Inline data usually creates a mixed outcome. DXY and US10Y confirmation decides whether the market still trades the prior bias.";
  }
  if (eventId === "pmi") {
    return stateLabel === "beat"
      ? "Growth improved. This usually supports USD and can pressure Gold if yields rise."
      : "Growth weakened. This can soften USD and support Gold if yields fall.";
  }
  if (eventId === "nfp") {
    return stateLabel === "beat"
      ? "Labor was strong. The Fed has less reason to cut, so USD/yields can rise and Gold can face pressure."
      : "Labor was weak. Cut expectations can rise, yields can fall, and Gold may get relief.";
  }
  if (eventId === "ppi") {
    return stateLabel === "beat"
      ? "Producer inflation was hot. Traders prepare for hotter CPI and a more hawkish Fed setup."
      : "Producer inflation cooled. CPI risk can soften and yields/USD may ease.";
  }
  if (eventId === "cpi") {
    return stateLabel === "beat"
      ? "Consumer inflation was hot. USD and yields usually rise while Gold faces pressure."
      : "Consumer inflation cooled. Yields and USD can fall while Gold can rally.";
  }
  return "Review DXY, US10Y and asset reaction after the release.";
}

function outcomeDetailsForEvent(eventId, stateLabel) {
  if (stateLabel === "missing") {
    if (eventId === "cpi") return predictCpiOutcome().details;
    return ["USD outcome: unknown", "Yields: unknown", "Gold: wait for actual data"];
  }
  if (stateLabel === "inline") {
    return ["USD outcome: mixed", "Yields: mixed", "Gold: wait for live confirmation"];
  }

  const beat = stateLabel === "beat";
  if (eventId === "pmi") {
    return beat
      ? ["USD outcome: stronger dollar bias", "Yields: can rise if growth optimism improves", "Gold: pressure if yields confirm higher"]
      : ["USD outcome: weaker dollar bias", "Yields: can fall on growth concern", "Gold: relief if yields confirm lower"];
  }
  if (eventId === "nfp") {
    return beat
      ? ["USD outcome: strong dollar bias", "Yields: higher because Fed cuts become less likely", "Gold: bearish pressure from higher yields"]
      : ["USD outcome: weak dollar bias", "Yields: lower because cut expectations can rise", "Gold: bullish relief if recession fear stays controlled"];
  }
  if (eventId === "ppi") {
    return beat
      ? ["USD outcome: stronger dollar bias", "Yields: higher because inflation risk rises", "Gold: bearish pressure before CPI"]
      : ["USD outcome: softer dollar bias", "Yields: lower if inflation fear cools", "Gold: relief before CPI"];
  }
  if (eventId === "cpi") {
    return beat
      ? ["USD outcome: strong dollar bias", "Yields: higher because Fed stays hawkish", "Gold: bearish pressure"]
      : ["USD outcome: weak dollar bias", "Yields: lower because inflation cooled", "Gold: bullish relief"];
  }
  return ["USD outcome: mixed", "Yields: check US10Y", "Gold: wait for price confirmation"];
}

function buildMonthlyOutcomeSummary() {
  const results = ECON_EVENTS.map((event) => ({ event, result: eventSurpriseState(event.id) }));
  const completed = results.filter(({ result }) => result.state !== "missing").length;
  if (completed === 0) {
    return {
      tone: "mixed",
      title: "Not enough data to classify this month",
      bullets: [
        "No actual releases are stored for this month yet.",
        "Add PMI, NFP, PPI and CPI actual values to know if the month was strong-dollar, weak-dollar, Gold bullish, or Gold pressured.",
        "Until then, this month should be treated as historical data missing, not a trading signal."
      ]
    };
  }

  let usdScore = 0;
  let inflationScore = 0;
  let growthScore = 0;
  results.forEach(({ event, result }) => {
    if (result.state === "missing" || result.state === "inline") return;
    const direction = result.state === "beat" ? 1 : -1;
    if (event.id === "pmi" || event.id === "nfp") growthScore += direction;
    if (event.id === "ppi" || event.id === "cpi") inflationScore += direction;
    usdScore += direction;
  });

  const strongDollar = usdScore >= 2;
  const weakDollar = usdScore <= -2;
  const hotInflation = inflationScore > 0;
  const coolInflation = inflationScore < 0;
  const strongGrowth = growthScore > 0;
  const weakGrowth = growthScore < 0;

  const title = strongDollar
    ? "Strong dollar month"
    : weakDollar
      ? "Weak dollar month"
      : hotInflation
        ? "Inflation-led hawkish month"
        : coolInflation
          ? "Cooling inflation month"
          : "Mixed macro month";

  const bullets = [
    strongGrowth ? "Growth data leaned strong, which normally supports USD and raises yield pressure." : weakGrowth ? "Growth data leaned weak, which can soften USD and lower yields." : "Growth data was mixed or incomplete.",
    hotInflation ? "Inflation data leaned hot, which keeps the Fed hawkish and pressures Gold." : coolInflation ? "Inflation data cooled, which can weaken USD/yields and support Gold." : "Inflation data was mixed or incomplete.",
    strongDollar ? "Main outcome: stronger USD bias, Gold pressured, EUR/USD and GBP/USD pressured." : weakDollar ? "Main outcome: weaker USD bias, Gold relief, EUR/USD and GBP/USD supported." : "Main outcome: no clean dollar direction; use DXY and US10Y confirmation."
  ];

  return {
    tone: strongDollar || hotInflation ? "bullish" : weakDollar || coolInflation ? "bearish" : "mixed",
    title,
    bullets
  };
}

function renderMonthlyRecap() {
  const selectedIsPast = isPreviousMonth();
  const history = state.monthlyHistory[state.activeMonth];
  if (selectedIsPast && state.monthlyHistoryLoading) {
    monthlyRecapStatus.textContent = `Fetching Forex Factory data for ${state.activeMonth}...`;
    monthlyRecap.innerHTML = `
      <article class="monthly-loading">
        <span></span>
        <div>
          <strong>Loading monthly macro history</strong>
          <p>Fetching PMI, NFP, PPI and CPI from Forex Factory. This can take a few seconds because the app scans the month.</p>
        </div>
      </article>
    `;
    return;
  }

  monthlyRecapStatus.textContent = selectedIsPast
    ? history?.sourceStatus === "live"
      ? `${state.activeMonth} completed-month review | Forex Factory loaded`
      : history?.sourceStatus === "unavailable"
        ? `${state.activeMonth} completed-month review | Forex Factory unavailable`
        : `${state.activeMonth} completed-month review`
    : "Current month live setup";

  const completed = ECON_EVENTS.filter((event) => hasActual(event.id)).length;
  const recapIntro = selectedIsPast
    ? history?.sourceStatus === "live"
      ? `Reviewing ${completed} of ${ECON_EVENTS.length} releases for ${state.activeMonth}. Forex Factory scanned ${history.daysScanned || 0} days and found ${Object.keys(history.events || {}).length} tracked releases.`
      : `Reviewing ${completed} of ${ECON_EVENTS.length} stored releases for ${state.activeMonth}.`
    : "This month is still active. As you enter actual data, this becomes a running recap.";

  const monthOutcome = buildMonthlyOutcomeSummary();
  monthlyRecap.innerHTML = `
    <p class="guide-copy">${recapIntro}</p>
    <article class="monthly-outcome ${monthOutcome.tone}">
      <strong>${monthOutcome.title}</strong>
      ${monthOutcome.bullets.map((item) => `<span>${item}</span>`).join("")}
    </article>
    <div class="recap-grid">
      ${ECON_EVENTS.map((event) => {
        const data = eventData(event.id);
        const result = eventSurpriseState(event.id);
        const cpiPrediction = event.id === "cpi" && result.state === "missing" ? predictCpiOutcome() : null;
        const cardTone = cpiPrediction?.tone || result.tone;
        const cardLabel = cpiPrediction?.label || result.label;
        const surpriseText = result.state === "missing"
          ? "Waiting for actual"
          : `${result.surprise > 0 ? "+" : ""}${result.surprise.toFixed(2)}${event.suffix || ""} surprise`;
        return `
          <article class="recap-card ${cardTone}">
            <div class="recap-head">
              <strong>${event.name}</strong>
              <span>${cardLabel}</span>
            </div>
            <div class="recap-values">
              <small>Forecast <b>${formatEventValue(event, data.forecast)}</b></small>
              <small>Actual <b>${formatEventValue(event, data.actual)}</b></small>
              <small>Previous <b>${formatEventValue(event, data.previous)}</b></small>
            </div>
            <em>${surpriseText}</em>
            <p>${outcomeForEvent(event.id, result.state)}</p>
            <div class="recap-details">
              ${outcomeDetailsForEvent(event.id, result.state).map((item) => `<small>${item}</small>`).join("")}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderGuideSummary() {
  const nextEventId = currentMonthlyStage();
  const nextEvent = ECON_EVENTS.find((event) => event.id === nextEventId);
  const signal = buildFundamentalSignal(nextEventId);
  const macro = buildMacroModel();
  const allEventsComplete = ECON_EVENTS.every((event) => hasActual(event.id));
  monthPicker.value = state.activeMonth;
  eventOverride.value = monthRecord().override || "auto";

  nextEventTitle.textContent = allEventsComplete ? "Monthly macro releases are done" : `${nextEvent.name} is the next focus`;
  nextEventNarrative.textContent = allEventsComplete
    ? "PMI, NFP, PPI and CPI all have actual data. Use the full monthly outcome plus DXY and US10Y confirmation for bias."
    : signal.narrative;
  usdBias.textContent = biasLabel("USD", signal.usd);
  goldBias.textContent = biasLabel("Gold", signal.gold);

  eventRail.innerHTML = ECON_EVENTS.map((event, index) => {
    const data = eventData(event.id);
    const active = event.id === nextEventId ? "active" : "";
    const done = hasActual(event.id) ? "done" : "";
    return `
      <div class="event-step ${active} ${done}">
        <span class="step-index">${index + 1}</span>
        <strong>${event.name}</strong>
        <small>${event.timing}</small>
        <em>${event.role}</em>
        <span class="latest">${hasActual(event.id) ? "Done" : "Waiting"} ${formatEventValue(event, data.actual || data.previous)}</span>
      </div>
    `;
  }).join("");

  expectationList.innerHTML = signal.clues.length
    ? signal.clues.map((item) => `<p>${item}</p>`).join("")
    : "<p>Add previous data to generate a stronger setup.</p>";

  macroRegime.textContent = `${macro.labels.growth} + ${macro.labels.inflation}`;
  fedBias.textContent = macro.labels.fed;
  yieldBias.textContent = macro.labels.yields;
  riskBias.textContent = macro.labels.risk;

  const chain = [
    { title: "PMI + NFP", value: macro.labels.growth },
    { title: "PPI + CPI", value: macro.cpiExpectation },
    { title: "Fed", value: macro.labels.fed },
    { title: "Bond Yields", value: macro.labels.yields },
    { title: "USD", value: macro.labels.usd },
    { title: "Assets", value: "Gold / USD pairs / BTC" }
  ];
  chainFlow.innerHTML = chain.map((item, index) => `
    <div class="chain-node">
      <span>${index + 1}</span>
      <strong>${item.title}</strong>
      <small>${item.value}</small>
    </div>
  `).join("");

  assetGrid.innerHTML = macro.assets.map((asset) => {
    const tone = asset.bias.toLowerCase().includes("bullish") ? "bullish" : asset.bias.toLowerCase().includes("bearish") || asset.bias.toLowerCase().includes("pressured") ? "bearish" : "mixed";
    return `
      <article class="asset-card ${tone}">
        <strong>${asset.name}</strong>
        <span>${asset.bias} (${formatSigned(asset.score)})</span>
        <p>${asset.why}</p>
      </article>
    `;
  }).join("");
  renderDecisionPanels(macro, nextEventId);
  renderMonthlyRecap();
}

function formatSigned(value) {
  const number = Number(value || 0);
  return number > 0 ? `+${number.toFixed(1)}` : number.toFixed(1);
}

function outlookDirection(score) {
  if (score >= 2) return { label: "Intraday up", icon: "↑", tone: "bullish" };
  if (score <= -2) return { label: "Intraday down", icon: "↓", tone: "bearish" };
  return { label: "Mixed / wait", icon: "→", tone: "mixed" };
}

function quoteDirection(id) {
  return state.marketData?.quotes?.[id]?.direction || "unknown";
}

function quoteSummary(id) {
  const quote = state.marketData?.quotes?.[id];
  if (!quote) return "live data unavailable";
  const sign = quote.changePercent > 0 ? "+" : "";
  return `${quote.price} (${sign}${quote.changePercent}%)`;
}

function expectedDirectionFromScore(score) {
  if (score >= 2) return "up";
  if (score <= -2) return "down";
  return "flat";
}

function confirmationStatus(macro, item) {
  if (!state.marketData?.quotes) {
    return { label: "Waiting for live data", tone: "mixed" };
  }

  const expected = expectedDirectionFromScore(item.score);
  const live = quoteDirection(item.marketId);
  const dxyOk = macro.directions.usd === "flat" || quoteDirection("dxy") === macro.directions.usd;
  const yieldsOk = macro.directions.yields === "flat" || quoteDirection("us10y") === macro.directions.yields;
  const assetOk = expected === "flat" || live === expected;

  if (expected === "flat") {
    return { label: dxyOk && yieldsOk ? "Neutral, waiting for trigger" : "Macro confirmation mixed", tone: "mixed" };
  }
  if (assetOk && dxyOk && yieldsOk) {
    return { label: "Live market confirms bias", tone: "bullish" };
  }
  if (!assetOk && live !== "unknown" && live !== "flat") {
    return { label: "Live price is fighting the bias", tone: "bearish" };
  }
  return { label: "Wait for DXY/US10Y confirmation", tone: "mixed" };
}

function buildForecastOutlook(macro, nextEventId) {
  const nextName = ECON_EVENTS.find((event) => event.id === nextEventId)?.name || "next data";
  const usdForce = macro.directions.usd === "up" ? 3 : macro.directions.usd === "down" ? -3 : 0;
  const yieldForce = macro.directions.yields === "up" ? 2 : macro.directions.yields === "down" ? -2 : 0;
  const riskForce = macro.directions.risk === "on" ? 2 : macro.directions.risk === "off" ? -2 : 0;
  const jpySafeHaven = macro.assetScores.jpy || 0;

  return [
    {
      symbol: "XAU/USD",
      marketId: "gold",
      title: "Gold forecast has changed",
      score: macro.assetScores.gold,
      reason: yieldForce > 0 || usdForce > 0
        ? "Higher yields or stronger USD are pressuring Gold."
        : yieldForce < 0 || usdForce < 0
          ? "Lower yields or weaker USD are supporting Gold."
          : "Gold needs DXY and US10Y confirmation."
    },
    {
      symbol: "EUR/USD",
      marketId: "eurusd",
      title: "EURUSD forecast has changed",
      score: -usdForce + riskForce * 0.35,
      reason: usdForce > 0
        ? "Stronger USD keeps EUR/USD under pressure."
        : usdForce < 0
          ? "Weaker USD gives EUR/USD upside room."
          : "EUR/USD is waiting for a clearer dollar signal."
    },
    {
      symbol: "GBP/USD",
      marketId: "gbpusd",
      title: "GBPUSD forecast has changed",
      score: -usdForce + riskForce * 0.45,
      reason: usdForce > 0
        ? "Dollar strength and tighter Fed pricing pressure GBP/USD."
        : usdForce < 0
          ? "Softer USD and lower yields can support GBP/USD."
          : "GBP/USD needs DXY confirmation after the next release."
    },
    {
      symbol: "USD/JPY",
      marketId: "usdjpy",
      title: "USDJPY forecast has changed",
      score: usdForce + yieldForce - jpySafeHaven * 0.45,
      reason: macro.directions.risk === "off"
        ? "Risk-off can support JPY, so USD/JPY needs extra confirmation."
        : yieldForce > 0 || usdForce > 0
          ? "Higher US yields or stronger USD support USD/JPY."
          : "Lower yields can pressure USD/JPY."
    },
    {
      symbol: "BTC/USD",
      marketId: "btc",
      title: "BTCUSD forecast has changed",
      score: macro.assetScores.btc,
      reason: riskForce > 0 && usdForce <= 0
        ? "Risk-on mood and softer USD support BTC."
        : riskForce < 0 || usdForce > 0
          ? "Risk-off mood or stronger USD pressures BTC."
          : "BTC needs risk sentiment and USD confirmation."
    }
  ].map((item) => ({
    ...item,
    nextName,
    direction: outlookDirection(item.score),
    confirmation: confirmationStatus(macro, item)
  }));
}

function scenarioOutcomeText(scenario) {
  const actual = Number(scenario.actual);
  const forecast = Number(scenario.forecast);
  if (scenario.actual === "" || Number.isNaN(actual) || Number.isNaN(forecast)) {
    return "Enter actual and forecast to simulate the market path.";
  }
  const surpriseValue = actual - forecast;
  const eventName = ECON_EVENTS.find((event) => event.id === scenario.event)?.name || "event";
  if (surpriseValue > 0) {
    return `${eventName} beats forecast. Expect hawkish Fed repricing, higher yields, stronger USD and Gold pressure.`;
  }
  if (surpriseValue < 0) {
    return `${eventName} misses forecast. Expect softer yields, weaker USD and Gold relief if risk does not break.`;
  }
  return `${eventName} is inline. Wait for DXY and US10Y confirmation before forcing a trade.`;
}

function postNewsVerdict(data) {
  const actual = Number(data.actual);
  const forecast = Number(data.forecast);
  if (data.actual === "" || Number.isNaN(actual) || Number.isNaN(forecast)) {
    return "Waiting for actual release.";
  }
  const hot = actual > forecast;
  const cold = actual < forecast;
  if (data.reaction === "pending") {
    return hot ? "Data is hot. Watch if yields and USD confirm upward." : cold ? "Data is soft. Watch if yields and USD confirm downward." : "Inline release. Let the market reaction decide.";
  }
  if ((hot && data.reaction === "usd_up_yields_up") || (cold && data.reaction === "usd_down_yields_down")) {
    return "Normal reaction. Macro and market confirmation are aligned.";
  }
  return "Divergence. Be careful: price action is fighting the data story.";
}

function renderDecisionPanels(macro, nextEventId) {
  confidenceBadge.textContent = `${macro.confidence} (${macro.confidenceScore}%)`;
  confidenceBadge.className = macro.confidenceScore >= 75 ? "confidence high" : macro.confidenceScore >= 45 ? "confidence medium" : "confidence low";

  const nextName = ECON_EVENTS.find((event) => event.id === nextEventId)?.name || "next report";
  dailyPlaybook.innerHTML = [
    `${nextName} hot: USD and yields up, Gold pressured.`,
    `${nextName} soft: yields down, USD weaker, Gold relief.`,
    `${nextName} inline: wait for DXY and US10Y confirmation before entering.`,
    `Risk-off shock: JPY can bid even if USD is also strong.`
  ].map((item) => `<p>${item}</p>`).join("");

  tradeBiasScores.innerHTML = macro.assets.map((asset) => {
    const tone = asset.score >= 2 ? "bullish" : asset.score <= -2 ? "bearish" : "mixed";
    return `
      <div class="score-row ${tone}">
        <span>${asset.name}</span>
        <strong>${formatSigned(asset.score)}</strong>
      </div>
    `;
  }).join("");

  renderForecastOutlook(macro, nextEventId);
  renderScenarioBuilder();
  renderPostNewsTracker();
  renderMarketConfirmation(macro);
  renderMacroMemory(macro);
  renderAlertPanel(macro, nextEventId);
  renderLearningCenter(macro, nextEventId);
}

function renderForecastOutlook(macro, nextEventId) {
  const outlook = buildForecastOutlook(macro, nextEventId);
  forecastOutlook.innerHTML = outlook.map((item) => `
    <article class="forecast-card ${item.confirmation.tone}">
      <div class="forecast-main">
        <span class="forecast-bell">!</span>
        <div>
          <strong>${item.symbol}</strong>
          <p>${item.title}</p>
        </div>
      </div>
      <div class="forecast-direction">
        <span>${item.direction.label}</span>
        <strong>${item.direction.icon}</strong>
      </div>
      <p class="forecast-reason">${item.reason}</p>
      <small>${item.confirmation.label}. Live: ${quoteSummary(item.marketId)}. Watch ${item.nextName}, DXY and US10Y before entry.</small>
    </article>
  `).join("");
}

function renderScenarioBuilder() {
  const scenario = scenarioData();
  scenarioBuilder.innerHTML = `
    <label>Event
      <select data-scenario="event">
        ${ECON_EVENTS.map((event) => `<option value="${event.id}">${event.name}</option>`).join("")}
      </select>
    </label>
    <label>Forecast <input data-scenario="forecast" inputmode="decimal" value="${scenario.forecast}" placeholder="0.3" /></label>
    <label>Actual / what-if <input data-scenario="actual" inputmode="decimal" value="${scenario.actual}" placeholder="0.5" /></label>
    <label>Previous <input data-scenario="previous" inputmode="decimal" value="${scenario.previous}" placeholder="0.4" /></label>
    <p class="scenario-result">${scenarioOutcomeText(scenario)}</p>
  `;

  scenarioBuilder.querySelector('[data-scenario="event"]').value = scenario.event;
  scenarioBuilder.querySelectorAll("[data-scenario]").forEach((input) => {
    const saveScenario = (shouldRender) => {
      monthRecord().scenario = {
        ...scenarioData(),
        [input.dataset.scenario]: input.value
      };
      saveFundamentalData();
      if (shouldRender) renderScenarioBuilder();
    };
    input.addEventListener("input", () => saveScenario(false));
    input.addEventListener("change", () => saveScenario(true));
  });
}

function renderPostNewsTracker() {
  const data = postNewsData();
  postNewsTracker.innerHTML = `
    <label>Event
      <select data-post="event">
        ${ECON_EVENTS.map((event) => `<option value="${event.id}">${event.name}</option>`).join("")}
      </select>
    </label>
    <label>Forecast <input data-post="forecast" inputmode="decimal" value="${data.forecast}" /></label>
    <label>Actual <input data-post="actual" inputmode="decimal" value="${data.actual}" /></label>
    <label>Market reaction
      <select data-post="reaction">
        <option value="pending">Pending</option>
        <option value="usd_up_yields_up">USD up + yields up</option>
        <option value="usd_down_yields_down">USD down + yields down</option>
        <option value="mixed">Mixed/divergent</option>
      </select>
    </label>
    <textarea data-post="note" placeholder="Release note">${data.note || ""}</textarea>
    <p class="scenario-result">${postNewsVerdict(data)}</p>
    <button id="saveMemoryBtn" class="mini-btn" type="button">Save To Memory</button>
  `;

  postNewsTracker.querySelector('[data-post="event"]').value = data.event;
  postNewsTracker.querySelector('[data-post="reaction"]').value = data.reaction;
  postNewsTracker.querySelectorAll("[data-post]").forEach((input) => {
    const savePostNews = (shouldRender) => {
      monthRecord().postNews = {
        ...postNewsData(),
        [input.dataset.post]: input.value
      };
      saveFundamentalData();
      if (shouldRender) renderPostNewsTracker();
    };
    input.addEventListener("input", () => savePostNews(false));
    input.addEventListener("change", () => savePostNews(true));
  });
  postNewsTracker.querySelector("#saveMemoryBtn").addEventListener("click", () => {
    const record = monthRecord();
    record.memory.unshift({
      date: new Date().toISOString(),
      ...postNewsData(),
      verdict: postNewsVerdict(postNewsData())
    });
    record.memory = record.memory.slice(0, 12);
    saveFundamentalData();
    renderMacroMemory(buildMacroModel());
  });
}

function renderMarketConfirmation(macro) {
  const controls = marketControls();
  const fields = [
    ["dxy", "DXY"],
    ["us10y", "US10Y"],
    ["gold", "Gold"],
    ["us30", "US30"],
    ["btc", "BTC"],
    ["usdjpy", "USDJPY"]
  ];
  const confirmation = macro.directions.usd === "up" && macro.directions.yields === "up"
    ? "Macro wants DXY and US10Y higher. Gold bearish only when market confirms."
    : macro.directions.usd === "down" && macro.directions.yields === "down"
      ? "Macro wants DXY and US10Y lower. Gold bullish only when market confirms."
      : "Mixed setup. Use live market reaction before entering.";

  marketConfirmation.innerHTML = `
    <p class="guide-copy">${confirmation}</p>
    <div class="confirm-grid">
      ${fields.map(([key, label]) => `<label>${label}<input data-confirm="${key}" value="${controls[key] || ""}" placeholder="manual value" /></label>`).join("")}
    </div>
  `;
  marketConfirmation.querySelectorAll("[data-confirm]").forEach((input) => {
    input.addEventListener("input", () => {
      monthRecord().market = {
        ...marketControls(),
        [input.dataset.confirm]: input.value
      };
      saveFundamentalData();
    });
  });
}

function renderMacroMemory() {
  const memory = monthRecord().memory || [];
  if (!memory.length) {
    macroMemory.innerHTML = '<div class="empty small">No saved release notes yet.</div>';
    return;
  }
  macroMemory.innerHTML = memory.map((item) => `
    <div class="memory-item">
      <strong>${(item.event || "").toUpperCase()} ${item.actual || "-"} vs ${item.forecast || "-"}</strong>
      <span>${item.verdict}</span>
    </div>
  `).join("");
}

function renderAlertPanel(macro, nextEventId) {
  const nextName = ECON_EVENTS.find((event) => event.id === nextEventId)?.name || "Event";
  const topBias = macro.assets.map((asset) => `${asset.name} ${asset.bias} ${formatSigned(asset.score)}`).join(" | ");
  alertPanel.innerHTML = `
    <p class="guide-copy">${nextName}: ${macro.labels.fed}, ${macro.labels.yields}, ${macro.labels.usd}. ${topBias}</p>
    <button id="copyAlertBtn" class="mini-btn" type="button">Copy Alert</button>
    <button id="sendAlertBtn" class="mini-btn" type="button">Send Webhook</button>
  `;
  const message = `${nextName} macro setup: ${macro.labels.fed}, ${macro.labels.yields}, ${macro.labels.usd}. ${topBias}`;
  alertPanel.querySelector("#copyAlertBtn").addEventListener("click", async () => {
    await navigator.clipboard.writeText(message);
  });
  alertPanel.querySelector("#sendAlertBtn").addEventListener("click", async () => {
    await fetch("/api/alert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message })
    });
  });
}

function renderLearningCenter(macro, nextEventId) {
  renderExplainMode(macro, nextEventId);
  renderCauseEffect(macro);
  renderEducationCards();
  renderNewsChecklist();
  renderContradictionDetector(macro);
  renderGlossary();
  renderTradeJournal();
}

function renderExplainMode(macro, nextEventId) {
  const nextName = ECON_EVENTS.find((event) => event.id === nextEventId)?.name || "news";
  const explanations = [
    `Strong PMI and NFP mean the economy can handle tighter policy. That makes rate cuts less likely.`,
    `Hot PPI often warns that CPI may also come hot because producer costs can move into consumer prices.`,
    `${nextName} matters because it can change Fed expectations. A hotter print usually supports higher yields and USD.`,
    `Gold dislikes higher real yields and a strong USD, so hot inflation with hawkish Fed pricing pressures Gold.`,
    `JPY acts like a safe haven. In risk-off markets, traders may buy JPY even when other assets fall.`
  ];
  explainMode.innerHTML = explanations.map((item) => `<p>${item}</p>`).join("");
}

function renderCauseEffect(macro) {
  const nodes = [
    macro.labels.growth,
    macro.cpiExpectation,
    macro.labels.fed,
    macro.labels.yields,
    macro.labels.usd,
    `Gold ${macro.assetScores.gold >= 2 ? "bullish" : macro.assetScores.gold <= -2 ? "bearish" : "mixed"}`
  ];
  causeEffect.innerHTML = nodes.map((node, index) => `
    <div class="effect-node">
      <span>${index + 1}</span>
      <strong>${node}</strong>
    </div>
  `).join("");
}

function renderEducationCards() {
  const cards = [
    ["PMI", "Business manager survey. Above 50 means expansion. It leads NFP because strong orders can become hiring."],
    ["NFP", "Labor market report. Strong jobs reduce rate-cut pressure and can lift USD/yields."],
    ["PPI", "Wholesale inflation. It can warn that CPI may come hot because firms pass costs to consumers."],
    ["CPI", "Consumer inflation. This is one of the biggest Fed repricing events for USD, yields and Gold."],
    ["FOMC", "Fed decision and guidance. Hike or higher-for-longer usually supports USD/yields and pressures risk assets."],
    ["DXY / US10Y", "Confirmation tools. If macro says bearish Gold, DXY and US10Y should usually confirm upward."]
  ];
  educationCards.innerHTML = cards.map(([title, body]) => `
    <details>
      <summary>${title}</summary>
      <p>${body}</p>
    </details>
  `).join("");
}

function renderNewsChecklist() {
  const checks = checklistData();
  const items = [
    ["forecastChecked", "Before: I know forecast and market expectation."],
    ["previousChecked", "Before: I compared forecast vs previous."],
    ["actualChecked", "After: I entered actual vs forecast."],
    ["dxyChecked", "After: DXY confirmed the expected USD direction."],
    ["yieldsChecked", "After: US10Y confirmed the expected yield direction."],
    ["assetChecked", "After: Gold and USD reaction agrees with the macro story."]
  ];
  newsChecklist.innerHTML = items.map(([key, label]) => `
    <label class="check-row">
      <input type="checkbox" data-check="${key}" ${checks[key] ? "checked" : ""} />
      <span>${label}</span>
    </label>
  `).join("");
  newsChecklist.querySelectorAll("[data-check]").forEach((input) => {
    input.addEventListener("change", () => {
      monthRecord().checklist = {
        ...checklistData(),
        [input.dataset.check]: input.checked
      };
      saveFundamentalData();
    });
  });
}

function renderContradictionDetector(macro) {
  const controls = marketControls();
  const warnings = [];
  if (macro.directions.usd === "up" && controls.dxy && Number(controls.dxy) < 0) {
    warnings.push("Macro says USD should strengthen, but your DXY input suggests weakness.");
  }
  if (macro.directions.yields === "up" && controls.us10y && Number(controls.us10y) < 0) {
    warnings.push("Macro says yields should rise, but your US10Y input suggests falling yields.");
  }
  if (macro.assetScores.gold <= -2 && controls.gold && Number(controls.gold) > 0) {
    warnings.push("Gold bias is bearish, but Gold is rising. Do not force the short until confirmation appears.");
  }
  contradictionDetector.innerHTML = warnings.length
    ? warnings.map((item) => `<p class="warning-line">${item}</p>`).join("")
    : '<p class="ok-line">No contradiction detected. Keep checking DXY, US10Y and asset reaction after the release.</p>';
}

function renderGlossary() {
  const terms = [
    ["Risk-on", "Traders buy growth and liquidity assets like BTC."],
    ["Risk-off", "Traders reduce risk and may buy safe havens like JPY or Gold."],
    ["Yields", "Bond return. Higher yields often strengthen USD and pressure Gold."],
    ["DXY", "US Dollar Index. Confirms broad USD strength or weakness."],
    ["Safe haven", "Asset traders buy when fear rises. JPY is often treated this way."],
    ["Hawkish", "Fed language or data that supports higher rates."],
    ["Dovish", "Fed language or data that supports lower rates."]
  ];
  glossaryPanel.innerHTML = terms.map(([term, meaning]) => `
    <details>
      <summary>${term}</summary>
      <p>${meaning}</p>
    </details>
  `).join("");
}

function renderTradeJournal() {
  const draft = journalDraft();
  const trades = monthRecord().trades || [];
  tradeJournal.innerHTML = `
    <div class="journal-form">
      <label>Event
        <select data-journal="event">${ECON_EVENTS.map((event) => `<option value="${event.id}">${event.name}</option>`).join("")}</select>
      </label>
      <label>Bias <input data-journal="bias" value="${draft.bias}" placeholder="Gold bearish, USD bullish" /></label>
      <label>Actual <input data-journal="actual" value="${draft.actual}" placeholder="CPI 0.5 vs 0.3" /></label>
      <label>Reaction <input data-journal="reaction" value="${draft.reaction}" placeholder="DXY up, US10Y up" /></label>
      <label>Lesson <textarea data-journal="lesson" placeholder="What did I learn?">${draft.lesson}</textarea></label>
      <button id="saveTradeBtn" class="mini-btn" type="button">Save Trade Lesson</button>
    </div>
    <div class="journal-list">
      ${trades.length ? trades.map((trade) => `
        <div class="memory-item">
          <strong>${(trade.event || "").toUpperCase()} | ${trade.bias || "No bias"}</strong>
          <span>${trade.actual || "-"} | ${trade.reaction || "-"} | ${trade.lesson || "-"}</span>
        </div>
      `).join("") : '<div class="empty small">No trade lessons saved yet.</div>'}
    </div>
  `;
  tradeJournal.querySelector('[data-journal="event"]').value = draft.event;
  tradeJournal.querySelectorAll("[data-journal]").forEach((input) => {
    input.addEventListener("input", () => {
      monthRecord().journalDraft = {
        ...journalDraft(),
        [input.dataset.journal]: input.value
      };
      saveFundamentalData();
    });
  });
  tradeJournal.querySelector("#saveTradeBtn").addEventListener("click", () => {
    const record = monthRecord();
    record.trades.unshift({
      date: new Date().toISOString(),
      ...journalDraft()
    });
    record.trades = record.trades.slice(0, 20);
    record.journalDraft = defaultJournalDraft();
    saveFundamentalData();
    renderTradeJournal();
  });
}

function renderFundamentalGuide() {
  renderGuideSummary();
  dataEditor.innerHTML = ECON_EVENTS.map((event) => {
    const data = eventData(event.id);
    return `
      <div class="data-row">
        <strong>${event.name}</strong>
        <label>
          Prev
          <input data-event="${event.id}" data-field="previous" inputmode="decimal" value="${data.previous}" />
        </label>
        <label>
          Forecast
          <input data-event="${event.id}" data-field="forecast" inputmode="decimal" value="${data.forecast}" />
        </label>
        <label>
          Actual
          <input data-event="${event.id}" data-field="actual" inputmode="decimal" value="${data.actual}" placeholder="-" />
        </label>
      </div>
    `;
  }).join("");

  dataEditor.querySelectorAll("input").forEach((input) => {
    const updateValue = (shouldRender) => {
      const eventId = input.dataset.event;
      const field = input.dataset.field;
      const record = monthRecord();
      record.events[eventId] = {
        ...eventData(eventId),
        [field]: input.value.trim(),
        updatedAt: new Date().toISOString()
      };
      saveFundamentalData();
      if (shouldRender) renderFundamentalGuide();
      else renderGuideSummary();
    };
    input.addEventListener("input", () => updateValue(false));
    input.addEventListener("change", () => updateValue(true));
  });
  renderManualControls();
}

function renderManualControls() {
  const controls = marketControls();
  manualControls.innerHTML = `
    <h4>Market Reaction Overrides</h4>
    <div class="manual-grid">
      <label>
        Bond yields
        <select data-market="yields">
          <option value="auto">Auto</option>
          <option value="up">Higher yields</option>
          <option value="flat">Flat/mixed</option>
          <option value="down">Lower yields</option>
        </select>
      </label>
      <label>
        USD reaction
        <select data-market="usd">
          <option value="auto">Auto</option>
          <option value="up">Stronger USD</option>
          <option value="flat">Mixed USD</option>
          <option value="down">Weaker USD</option>
        </select>
      </label>
      <label>
        Risk mood
        <select data-market="risk">
          <option value="auto">Auto</option>
          <option value="on">Risk-on</option>
          <option value="mixed">Mixed</option>
          <option value="off">Risk-off</option>
        </select>
      </label>
      <label>
        FOMC path
        <select data-market="fomc">
          <option value="hold">Hold</option>
          <option value="hike">Hike / higher for longer</option>
          <option value="cut">Cut pressure</option>
        </select>
      </label>
    </div>
  `;

  manualControls.querySelectorAll("select").forEach((select) => {
    select.value = controls[select.dataset.market] || "auto";
    select.addEventListener("change", () => {
      monthRecord().market = {
        ...marketControls(),
        [select.dataset.market]: select.value
      };
      saveFundamentalData();
      renderGuideSummary();
    });
  });
}

function renderCalendar() {
  const calendar = state.calendar;
  if (!calendar) {
    calendarStatus.textContent = "Loading Forex Factory...";
    calendarList.innerHTML = "";
    return;
  }

  const status = calendar.sourceStatus === "live"
    ? "Live Forex Factory"
    : calendar.sourceStatus === "official"
      ? "Forex Factory + official actuals"
      : "Forex Factory fallback";
  calendarStatus.textContent = `${status} | ${calendar.date} | Nigeria time`;

  if (!calendar.events?.length) {
    calendarList.innerHTML = '<div class="empty small">No USD macro events found for today.</div>';
    return;
  }

  calendarList.innerHTML = calendar.events.map((event) => {
    const isHighImpact = event.impact === "high" || /cpi|ppi|pmi|non-farm|nonfarm|nfp|fomc|rate/i.test(event.title || "");
    return `
    <div class="calendar-item ${isHighImpact ? "high-impact" : ""}">
      <span>${event.time || "Tentative"}</span>
      <strong>${event.title}</strong>
      <em>${event.currency}</em>
      <small>Actual ${event.actual || "-"} | Forecast ${event.forecast || "-"} | Previous ${event.previous || "-"}${event.actualSource ? ` | ${event.actualSource}` : ""}</small>
    </div>
  `;
  }).join("");
}

function renderMarketData() {
  if (!state.marketData) {
    marketStatus.textContent = "Loading market data...";
    marketList.innerHTML = "";
    return;
  }

  const quotes = state.marketData.quotes || {};
  const quoteItems = ["dxy", "us10y", "gold", "eurusd", "gbpusd", "usdjpy", "btc"]
    .map((id) => quotes[id])
    .filter(Boolean);

  marketStatus.textContent = state.marketData.errors?.length
    ? `Partial live data from ${state.marketData.source}`
    : `Live data from ${state.marketData.source}`;

  marketList.innerHTML = quoteItems.length
    ? quoteItems.map((quote) => {
      const tone = quote.direction === "up" ? "bullish" : quote.direction === "down" ? "bearish" : "mixed";
      const sign = quote.changePercent > 0 ? "+" : "";
      return `
        <div class="market-pill ${tone}">
          <strong>${quote.label}</strong>
          <span>${quote.price}</span>
          <em>${sign}${quote.changePercent}%</em>
        </div>
      `;
    }).join("")
    : '<div class="empty small">Live data unavailable right now.</div>';
}

async function loadMarketData() {
  try {
    const response = await fetch("/api/market-data");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "market data failed");
    state.marketData = data;
  } catch (error) {
    state.marketData = {
      source: "Unavailable",
      quotes: {},
      errors: [{ message: error.message }]
    };
  }
  renderMarketData();
  renderGuideSummary();
}

async function loadCalendar() {
  try {
    const calendarDate = state.activeMonth === monthKey() ? nigeriaDateKey() : `${state.activeMonth}-01`;
    const response = await fetch(`/api/calendar?date=${calendarDate}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load calendar");
    state.calendar = data;
    mergeCurrentCalendarData();
  } catch (error) {
    state.calendar = {
      date: monthKey(),
      sourceStatus: "unavailable",
      focusEventId: "",
      events: []
    };
  }
  renderCalendar();
  renderGuideSummary();
}

function formatScore(value) {
  const number = Number(value || 0);
  return number > 0 ? `+${number.toFixed(1)}` : number.toFixed(1);
}

function drawChart(summary, append = true) {
  if (append) {
    state.history.push({
      usd: Number(summary.USD_Impact || 0),
      risk: Number(summary.Geopolitical_Risk || 0)
    });
    state.history = state.history.slice(-24);
  }

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = themeColor("--chart-bg") || "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = themeColor("--line") || "#d9dee7";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  drawLine("usd", themeColor("--blue") || "#315caa", -10, 10);
  drawLine("risk", themeColor("--red") || "#c43d4b", 0, 10);

  ctx.fillStyle = themeColor("--ink") || "#111827";
  ctx.font = "700 13px system-ui";
  ctx.fillText("USD Impact", 18, 26);
  ctx.fillText("Risk", 132, 26);
  ctx.fillStyle = themeColor("--blue") || "#315caa";
  ctx.fillRect(96, 17, 24, 4);
  ctx.fillStyle = themeColor("--red") || "#c43d4b";
  ctx.fillRect(166, 17, 24, 4);
}

function drawLine(key, color, min, max) {
  const points = state.history;
  if (points.length === 0) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();

  points.forEach((point, index) => {
    const x = points.length === 1 ? canvas.width - 34 : 24 + (index * (canvas.width - 58)) / (points.length - 1);
    const normalized = (point[key] - min) / (max - min);
    const y = canvas.height - 26 - normalized * (canvas.height - 56);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

function matchesFilter(item) {
  const title = item.title.toLowerCase();
  if (state.filter === "usd") return Math.abs(Number(item.score?.USD_Impact || 0)) >= 1;
  if (state.filter === "risk") return Number(item.score?.Geopolitical_Risk || 0) >= 2;
  if (state.filter === "trade") return ["tariff", "trade", "sanction", "china"].some((word) => title.includes(word));
  return true;
}

function renderItems() {
  const visible = state.items.filter(matchesFilter);
  if (visible.length === 0) {
    newsList.innerHTML = '<div class="empty">No matching macro news found in the latest source scan.</div>';
    return;
  }

  newsList.innerHTML = visible
    .map((item) => {
      const usd = formatScore(item.score?.USD_Impact);
      const risk = Number(item.score?.Geopolitical_Risk || 0).toFixed(1);
      return `
        <article class="news-item">
          <div>
            <a href="${item.url}" target="_blank" rel="noreferrer">${item.title}</a>
            <p class="meta">${item.source} | ${item.scoringMode || "keyword"} scoring</p>
          </div>
          <div class="badges">
            <span class="badge usd">USD ${usd}</span>
            <span class="badge risk">Risk ${risk}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadNews() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Loading";

  try {
    const response = await fetch("/api/news");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load news");

    state.items = data.items || [];
    usdScore.textContent = formatScore(data.summary?.USD_Impact);
    riskScore.textContent = Number(data.summary?.Geopolitical_Risk || 0).toFixed(1);
    itemCount.textContent = String(data.summary?.itemCount || 0);
    updatedAt.textContent = `Updated ${new Date(data.updatedAt).toLocaleTimeString("en-NG", { timeZone: APP_TIME_ZONE })} WAT`;
    modeText.textContent = data.scoringMode === "ai_optional" ? "AI scoring enabled when API key is available" : "Keyword scoring mode";
    drawChart(data.summary || {});
    renderItems();
  } catch (error) {
    newsList.innerHTML = `<div class="empty">${error.message}</div>`;
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Refresh";
  }
}

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    renderItems();
  });
});

monthPicker.addEventListener("change", async () => {
  state.activeMonth = monthPicker.value || monthKey();
  state.calendar = null;
  monthRecord();
  saveFundamentalData();
  renderCalendar();
  if (isPreviousMonth(state.activeMonth)) {
    await loadMonthlyHistory(state.activeMonth);
  } else {
    renderFundamentalGuide();
  }
  await loadCalendar();
});

eventOverride.addEventListener("change", () => {
  monthRecord().override = eventOverride.value || "auto";
  saveFundamentalData();
  renderFundamentalGuide();
});

lightThemeBtn.addEventListener("click", () => applyTheme("light"));
darkThemeBtn.addEventListener("click", () => applyTheme("dark"));
refreshBtn.addEventListener("click", loadNews);
refreshBtn.addEventListener("click", loadMarketData);
async function init() {
  applyTheme(localStorage.getItem("macro-theme") || "light");
  await loadSharedFundamentalData();
  renderFundamentalGuide();
  renderCalendar();
  renderMarketData();
  await loadCalendar();
  await loadMonthlyHistory(state.activeMonth);
  loadMarketData();
  loadNews();
}

init();
setInterval(loadNews, 5 * 60 * 1000);
setInterval(loadMarketData, 60 * 1000);
