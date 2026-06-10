const lightThemeBtn = document.querySelector("#lightThemeBtn");
const darkThemeBtn = document.querySelector("#darkThemeBtn");
const lessonExamples = document.querySelector("#lessonExamples");
const lessonQuiz = document.querySelector("#lessonQuiz");
const advancedModules = document.querySelector("#advancedModules");
const advancedDrivers = document.querySelector("#advancedDrivers");
const conflictPlaybooks = document.querySelector("#conflictPlaybooks");
const foundationTerms = document.querySelector("#foundationTerms");
const newsTutorial = document.querySelector("#newsTutorial");

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("macro-theme", nextTheme);
  lightThemeBtn.classList.toggle("active", nextTheme === "light");
  darkThemeBtn.classList.toggle("active", nextTheme === "dark");
}

const advanced = [
  ["Central Bank Reaction Function", "Ask: will this data make the Fed hike, hold, or cut? The market trades the expected path, not only the current number."],
  ["Real Yields", "Real yield means bond yield minus inflation expectations. Gold is most sensitive to real yields, not just headline CPI."],
  ["Yield Curve", "2Y yield tracks Fed expectations. 10Y yield tracks growth, inflation, and term premium. Gold reacts heavily to real yields."],
  ["Liquidity", "When liquidity is loose, BTC and risk assets can rise even with mixed data. When liquidity tightens, risk assets struggle."],
  ["Risk Regime", "Risk-on favors growth and liquidity assets. Risk-off favors USD, JPY, sometimes Gold if fear is stronger than yields."],
  ["Dollar Smile", "USD can rise when the US is very strong or when the world is scared. It can weaken in the middle when global growth is healthy."],
  ["Term Premium", "Long yields can rise even without Fed hikes if investors demand more return to hold long-term bonds."],
  ["Market Positioning", "If everyone expects hot CPI, a small hot beat may not move markets. Surprise matters more than the headline."],
  ["Second-Order Reaction", "First move can be wrong. Wait for DXY and US10Y after the first spike before trusting the move."],
  ["Geopolitical Override", "War risk can make Gold and JPY rise even if yields and USD are also rising."]
];

const drivers = [
  ["Fed Speeches", "Fed speakers can move the market between major news events. Hawkish tone supports yields and USD. Dovish tone can support Gold."],
  ["FOMC Details", "Do not only watch the rate decision. Watch the statement, dot plot, Powell press conference and whether the Fed sounds hawkish or dovish."],
  ["Treasury Auctions", "Weak auctions can push yields higher because investors demand more return to hold US debt. That can pressure Gold."],
  ["Oil Prices", "Oil can affect inflation expectations. Rising oil can make CPI risk feel hotter, especially if the market already fears inflation."],
  ["Retail Sales", "Shows consumer strength. Strong retail sales can support USD and yields because the economy looks resilient."],
  ["GDP", "Big-picture growth confirmation. Strong GDP supports the growth story, while weak GDP can increase recession and rate-cut expectations."],
  ["Initial Jobless Claims", "Weekly labor clue before NFP. Rising claims can warn that the labor market is weakening."],
  ["ISM Services PMI", "Very important because the US economy is service-heavy. Strong services data can support USD and yields."],
  ["Core CPI / Core PCE", "The Fed cares deeply about core inflation because it removes volatile food and energy. Hot core inflation is usually hawkish."],
  ["Risk Sentiment", "Watch VIX, stocks, credit stress, war headlines and liquidity. Risk-off can make JPY and sometimes Gold rise even when the basic chain is mixed."]
];

const terms = [
  ["Actual", "The number released by the news report."],
  ["Forecast", "What analysts expected before the news came out."],
  ["Previous", "The last reported number from the prior period."],
  ["Beat", "Actual is stronger or hotter than forecast."],
  ["Miss", "Actual is weaker or cooler than forecast."],
  ["Surprise", "The difference between actual and forecast. Markets trade surprise."],
  ["PMI", "A business survey. Above 50 means expansion; below 50 means contraction risk."],
  ["NFP", "Non-Farm Payrolls. Measures jobs added in the US economy."],
  ["PPI", "Producer Price Index. Measures wholesale inflation paid by businesses."],
  ["CPI", "Consumer Price Index. Measures consumer inflation paid by households."],
  ["FOMC", "The Federal Reserve meeting where interest-rate policy is decided."],
  ["Interest Rate", "The cost of borrowing money."],
  ["Hike", "The central bank raises rates or signals higher rates."],
  ["Cut", "The central bank lowers rates or signals lower rates."],
  ["Hold", "The central bank keeps rates unchanged."],
  ["Hawkish", "Policy or data that points to higher rates."],
  ["Dovish", "Policy or data that points to lower rates."],
  ["Yield", "The interest return investors earn from holding bonds."],
  ["US10Y", "The US 10-year Treasury yield, important for Gold."],
  ["US2Y", "The US 2-year Treasury yield, closely tied to Fed expectations."],
  ["Real Yield", "Bond yield minus inflation expectations. Gold watches this closely."],
  ["DXY", "US Dollar Index. A measure of broad USD strength or weakness."],
  ["Risk-on", "Market mood where traders buy growth and liquidity assets like BTC."],
  ["Risk-off", "Market mood where traders reduce risk and buy safer assets."],
  ["Safe Haven", "Asset traders buy during fear. JPY and sometimes Gold act this way."],
  ["Liquidity", "How much money/credit is available in markets. More liquidity helps risk assets."],
  ["Bond", "A debt instrument. Governments issue bonds to borrow money."],
  ["Equities", "Stock indexes like US30."],
  ["Commodity", "Raw asset like Gold or Oil."],
  ["Volatility", "How fast and wide price moves are."],
  ["Divergence", "When data says one thing but the market reacts the opposite way."],
  ["Confirmation", "When DXY, yields, and assets move in the direction your macro story expects."]
];

foundationTerms.innerHTML = terms.map(([term, meaning]) => `
  <details>
    <summary>${term}</summary>
    <p>${meaning}</p>
  </details>
`).join("");

advancedModules.innerHTML = advanced.map(([title, body]) => `
  <article>
    <strong>${title}</strong>
    <p>${body}</p>
  </article>
`).join("");

advancedDrivers.innerHTML = drivers.map(([title, body]) => `
  <article>
    <strong>${title}</strong>
    <p>${body}</p>
  </article>
`).join("");

const conflicts = [
  "Strong NFP + soft CPI: growth is strong but inflation is cooling. Wait for yields. If yields fall, Gold can rally.",
  "Weak NFP + hot CPI: stagflation risk. USD can be choppy, and Gold can get safe-haven support.",
  "Hot CPI + falling yields: contradiction. The bond market is rejecting the inflation fear; do not force Gold shorts.",
  "Strong PMI + weak NFP: businesses report optimism but hiring is not confirming. Treat growth as mixed.",
  "Hot PPI + soft CPI: producers have cost pressure, but it has not reached consumers yet. CPI wins short term.",
  "Risk-off headline + hot CPI: JPY and Gold can bid from fear, while USD also stays strong. Expect volatility."
];

conflictPlaybooks.innerHTML = conflicts.map((item) => `<p>${item}</p>`).join("");

const tutorial = [
  ["1. Know the event", "Before the release, identify the main event: CPI, NFP, PPI, PMI or FOMC. Know whether it is growth, inflation or Fed policy."],
  ["2. Check forecast vs previous", "The market reacts to surprise. Always compare actual against forecast first, then previous second."],
  ["3. Build both scenarios", "Write the hot-data and soft-data scenario before the release. Example: hot CPI means yields up, USD up and Gold pressure."],
  ["4. Do not enter on the first spike", "The first candle can be fake. Use the 1-minute candle only to watch the spike. For aggressive entries, wait for the first 5-minute candle to close, then confirm DXY and US10Y are still moving in the macro direction. For safer entries, wait for the 15-minute candle confirmation, especially on CPI, NFP and FOMC."],
  ["5. Confirm with assets", "If macro says Gold bearish, Gold should reject upward moves while DXY/yields rise. If not, wait."],
  ["6. Watch for contradiction", "Hot data with falling yields is a warning. Soft data with rising yields is also a warning."],
  ["7. Trade only aligned setups", "Best setup is data surprise + DXY confirmation + yield confirmation + asset reaction all pointing the same way."],
  ["8. Define invalidation", "Before entering, know what would prove you wrong. Example: short Gold invalid if US10Y falls and Gold breaks higher."],
  ["9. Manage spread and volatility", "News candles move fast. Use smaller size, wider stops, or wait for the second clean setup after volatility cools."],
  ["10. Journal the lesson", "After the move, save what happened: expected result, actual result, market reaction and lesson learned."]
];

newsTutorial.innerHTML = tutorial.map(([title, body]) => `
  <article>
    <strong>${title}</strong>
    <p>${body}</p>
  </article>
`).join("");

const examples = [
  "Hot CPI: Fed reprices hawkish, yields rise, USD strengthens, and Gold usually drops.",
  "Soft CPI: yields fall, USD weakens, and Gold can rally if risk sentiment holds.",
  "Strong NFP but soft CPI: mixed story. Growth is strong but inflation is cooling, so wait for yields.",
  "Hot PPI before CPI: prepare for CPI upside risk, but do not enter until CPI and yields confirm.",
  "Risk-off shock: JPY can strengthen even when other risk assets fall.",
  "Hot data but DXY falls: the market may have already priced it in. Wait instead of chasing.",
  "Yields rise and Gold rises too: safe-haven demand may be overpowering rates; reduce confidence."
];

lessonExamples.innerHTML = examples.map((item) => `<p>${item}</p>`).join("");

const quiz = [
  ["PMI above 50 usually means what?", "Expansion."],
  ["Hot CPI usually does what to yields?", "Pushes yields higher."],
  ["Higher yields usually do what to Gold?", "Pressure Gold lower."],
  ["Why can Gold drop after hot CPI?", "Higher rates and stronger USD can pressure Gold."],
  ["What is JPY in risk-off markets?", "A safe haven."],
  ["What should you check before trusting a Gold short?", "DXY and US10Y confirmation."],
  ["Which yield tracks Fed expectations more closely?", "The 2-year yield."],
  ["Why can USD rise in both panic and strong-US data?", "The dollar smile: USD benefits from US strength and global fear."],
  ["If CPI is hot but yields fall, what is that?", "A contradiction; wait for confirmation."],
  ["What can override normal yield logic?", "Geopolitical risk, liquidity, and market positioning."]
];

lessonQuiz.innerHTML = quiz.map(([question, answer]) => `
  <details>
    <summary>${question}</summary>
    <p>${answer}</p>
  </details>
`).join("");

lightThemeBtn.addEventListener("click", () => applyTheme("light"));
darkThemeBtn.addEventListener("click", () => applyTheme("dark"));
applyTheme(localStorage.getItem("macro-theme") || "light");
