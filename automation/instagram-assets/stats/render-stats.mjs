import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;

const width = 1080;
const height = 1920;

const categoriesSeed = [
  { name: "Rent", planned: 1200, actual: 1200 },
  { name: "Groceries", planned: 420, actual: 368 },
  { name: "Transportation", planned: 220, actual: 245 },
  { name: "Utilities", planned: 160, actual: 142 },
  { name: "Fun money", planned: 180, actual: 126 },
  { name: "Savings", planned: 400, actual: 400 },
];

const goalsSeed = [
  { name: "Emergency fund", amount: 3250, target: 5000 },
  { name: "Travel fund", amount: 820, target: 2000 },
  { name: "Debt payoff", amount: 6480, target: 9200 },
];

const billsSeed = [
  { name: "Rent", date: "2026-04-01", amount: 1200, recurringDay: 1 },
  { name: "Phone", date: "2026-04-05", amount: 80, recurringDay: 5 },
  { name: "Car insurance", date: "2026-04-12", amount: 165, recurringDay: 12 },
  { name: "Streaming bundle", date: "2026-04-19", amount: 24, recurringDay: 19 },
];

const incomePerPaycheck = 2100;
const includePartner = false;
const partnerIncome = 0;
const payFrequency = "biweekly";
const monthlyBuffer = 150;
const bankBalance = 0;
const creditCardBalance = 0;

const multiplier = payFrequency === "weekly" ? 4 : payFrequency === "monthly" ? 1 : 2;
const monthlyIncome = incomePerPaycheck * multiplier + (includePartner ? partnerIncome : 0);
const totalPlannedSpend = categoriesSeed.reduce((sum, item) => sum + item.planned, 0);
const spendEntriesTotal = categoriesSeed.reduce((sum, item) => sum + item.actual, 0);
const leftToBudget = monthlyIncome - totalPlannedSpend - monthlyBuffer;
const spendVariance = spendEntriesTotal - totalPlannedSpend;
const billsPerPaycheck = totalPlannedSpend / Math.max(multiplier, 1);
const nextPaycheckAfterBills =
  incomePerPaycheck + (includePartner ? partnerIncome / Math.max(multiplier, 1) : 0) - billsPerPaycheck;

const billWeekIndex = (dateLabel, recurringDay) => {
  if (recurringDay) {
    if (recurringDay <= 7) return 1;
    if (recurringDay <= 14) return 2;
    if (recurringDay <= 21) return 3;
    return 4;
  }

  const parsed = new Date(dateLabel);
  const day = parsed.getDate();
  if (Number.isNaN(day)) return 1;
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
};

const weeklyIncome = monthlyIncome / 4;
const weeklyBillTotals = [0, 0, 0, 0];
billsSeed.forEach((bill) => {
  weeklyBillTotals[billWeekIndex(bill.date, bill.recurringDay) - 1] += bill.amount;
});
const weeklyAmounts = weeklyBillTotals.map((bills, index) =>
  Math.round(weeklyIncome - bills - totalPlannedSpend / 4 + (index === 0 ? bankBalance / 4 : 0)),
);

const maxWeekly = Math.max(...weeklyAmounts.map((amount) => Math.abs(amount)), 1);

mkdirSync(outDir, { recursive: true });

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const formatCurrency = (value) => {
  const rounded = Math.round(value);
  if (rounded < 0) return `-$${Math.abs(rounded).toLocaleString("en-US")}`;
  return `$${rounded.toLocaleString("en-US")}`;
};

const percentage = (value, total) => `${Math.max(0, Math.min(100, (value / total) * 100)).toFixed(1)}%`;

const svgFrame = ({ body, subtitle, title }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="120" y1="0" x2="980" y2="1840" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFF8ED" />
      <stop offset="0.45" stop-color="#F4FBFD" />
      <stop offset="1" stop-color="#EEF4FF" />
    </linearGradient>
    <linearGradient id="cardGradient" x1="80" y1="180" x2="980" y2="1740" gradientUnits="userSpaceOnUse">
      <stop stop-color="#132238" />
      <stop offset="1" stop-color="#264769" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#F8CDA0" />
      <stop offset="0.52" stop-color="#9EE3D6" />
      <stop offset="1" stop-color="#8DB6FF" />
    </linearGradient>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#132238" flood-opacity="0.14"/>
    </filter>
    <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="34" />
    </filter>
    <style>
      .sans { font-family: "Segoe UI", Arial, sans-serif; }
      .serif { font-family: Georgia, "Times New Roman", serif; }
      .eyebrow { fill: #6A7F94; font-size: 28px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
      .title { fill: #112036; font-size: 94px; font-weight: 700; letter-spacing: -0.05em; }
      .subtitle { fill: #5A6D82; font-size: 34px; font-weight: 500; }
      .card-title { fill: #E8F1FF; font-size: 28px; font-weight: 700; }
      .card-copy { fill: rgba(232,241,255,0.82); font-size: 24px; font-weight: 500; }
      .stat-label { fill: rgba(232,241,255,0.78); font-size: 24px; font-weight: 600; }
      .stat-value { fill: #FFFFFF; font-size: 62px; font-weight: 700; letter-spacing: -0.04em; }
      .small-value { fill: #FFFFFF; font-size: 34px; font-weight: 700; }
      .small-label { fill: rgba(232,241,255,0.78); font-size: 22px; font-weight: 600; }
      .chip { fill: rgba(255,255,255,0.12); stroke: rgba(255,255,255,0.14); stroke-width: 1.5; }
      .line { stroke: rgba(255,255,255,0.12); stroke-width: 1.5; }
    </style>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bgGradient)" />
  <circle cx="180" cy="160" r="120" fill="#F8CDA0" fill-opacity="0.38" filter="url(#softGlow)" />
  <circle cx="905" cy="260" r="130" fill="#9EE3D6" fill-opacity="0.34" filter="url(#softGlow)" />
  <circle cx="840" cy="1660" r="140" fill="#8DB6FF" fill-opacity="0.28" filter="url(#softGlow)" />

  <text x="86" y="122" class="sans eyebrow">Centsy demo stats</text>
  <text x="80" y="232" class="serif title">${escapeXml(title)}</text>
  <text x="84" y="298" class="sans subtitle">${escapeXml(subtitle)}</text>

  ${body}
</svg>
`;

const rect = (x, y, w, h, radius = 34, fill = "url(#cardGradient)", extra = `filter="url(#cardShadow)"`) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" ${extra} />`;

const statMiniCard = ({ label, value, x, y }) => `
  <g>
    <rect x="${x}" y="${y}" width="284" height="178" rx="28" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>
    <text x="${x + 28}" y="${y + 62}" class="sans small-label">${escapeXml(label)}</text>
    <text x="${x + 28}" y="${y + 124}" class="sans small-value">${escapeXml(value)}</text>
  </g>
`;

const slideOverview = () => {
  const body = `
    ${rect(56, 356, 968, 1410)}
    <text x="92" y="438" class="sans card-title">This month</text>
    <text x="92" y="560" class="sans stat-label">Left to budget</text>
    <text x="92" y="662" class="sans stat-value">${escapeXml(formatCurrency(leftToBudget))}</text>
    <text x="92" y="722" class="sans card-copy">Monthly income ${escapeXml(formatCurrency(monthlyIncome))} minus planned spending and buffer.</text>

    <rect x="92" y="774" width="896" height="22" rx="11" fill="rgba(255,255,255,0.12)" />
    <rect x="92" y="774" width="${Math.round((totalPlannedSpend / monthlyIncome) * 896)}" height="22" rx="11" fill="url(#accentGradient)" />

    ${statMiniCard({ label: "Monthly income", value: formatCurrency(monthlyIncome), x: 92, y: 858 })}
    ${statMiniCard({ label: "Planned spend", value: formatCurrency(totalPlannedSpend), x: 398, y: 858 })}
    ${statMiniCard({ label: "Logged spend", value: formatCurrency(spendEntriesTotal), x: 704, y: 858 })}

    <rect x="92" y="1080" width="896" height="262" rx="30" class="chip"/>
    <text x="128" y="1148" class="sans card-title">Signal check</text>
    <text x="128" y="1218" class="sans card-copy">Spend is ${escapeXml(formatCurrency(Math.abs(spendVariance)))} ${spendVariance > 0 ? "over" : "under"} plan.</text>
    <text x="128" y="1270" class="sans card-copy">Next paycheck after planned bills: ${escapeXml(formatCurrency(nextPaycheckAfterBills))}.</text>
    <text x="128" y="1322" class="sans card-copy">Current setup is driven by the same demo budget data used in the app shell.</text>

    <rect x="92" y="1390" width="896" height="280" rx="30" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
    <text x="128" y="1458" class="sans card-title">Budget shape</text>
    <text x="128" y="1520" class="sans small-label">Planned spending uses ${escapeXml(percentage(totalPlannedSpend, monthlyIncome))} of monthly income.</text>
    <text x="128" y="1578" class="sans small-label">Buffer reserved: ${escapeXml(formatCurrency(monthlyBuffer))}</text>
    <text x="128" y="1636" class="sans small-label">Credit card balance in this demo state: ${escapeXml(formatCurrency(creditCardBalance))}</text>
  `;

  return svgFrame({
    title: "A cleaner monthly view.",
    subtitle: "These are product-native numbers, not illustrated guesses.",
    body,
  });
};

const slideWeekly = () => {
  const bars = weeklyAmounts
    .map((value, index) => {
      const heightValue = Math.max(84, Math.round((Math.abs(value) / maxWeekly) * 360));
      const y = value >= 0 ? 1248 - heightValue : 1248;
      const fill = value >= 0 ? "url(#accentGradient)" : "#F8CDA0";
      const x = 144 + index * 210;
      return `
        <text x="${x + 20}" y="1350" class="sans small-label">Week ${index + 1}</text>
        <rect x="${x}" y="${y}" width="132" height="${heightValue}" rx="28" fill="${fill}" />
        <text x="${x - 4}" y="${value >= 0 ? y - 20 : y + heightValue + 52}" class="sans small-value">${escapeXml(formatCurrency(value))}</text>
      `;
    })
    .join("");

  const body = `
    ${rect(56, 356, 968, 1410)}
    <text x="92" y="438" class="sans card-title">Weekly cash flow</text>
    <text x="92" y="520" class="sans stat-label">Paycheck view</text>
    <text x="92" y="614" class="sans stat-value">${escapeXml(formatCurrency(incomePerPaycheck))}</text>
    <text x="92" y="676" class="sans card-copy">Weekly income modeled from a ${escapeXml(payFrequency)} pay cycle.</text>

    <line x1="120" y1="1248" x2="972" y2="1248" class="line" />
    ${bars}

    <rect x="92" y="1418" width="896" height="224" rx="30" class="chip"/>
    <text x="128" y="1488" class="sans card-title">Why week 1 dips</text>
    <text x="128" y="1548" class="sans card-copy">Rent and phone land in the first week, so the safe-to-spend range gets tighter before it opens back up.</text>
    <text x="128" y="1606" class="sans card-copy">This is the kind of timing signal the Centsy weekly view is meant to surface immediately.</text>
  `;

  return svgFrame({
    title: "See the tight weeks early.",
    subtitle: "The cash-flow story becomes obvious when bills are mapped to the week they hit.",
    body,
  });
};

const slideCategories = () => {
  const topCategories = categoriesSeed
    .slice()
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 4);

  const categoryCards = topCategories
    .map((category, index) => {
      const x = index % 2 === 0 ? 92 : 520;
      const y = 454 + Math.floor(index / 2) * 312;
      const widthValue = Math.max(120, Math.round((category.actual / category.planned) * 318));
      return `
        <rect x="${x}" y="${y}" width="376" height="244" rx="28" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>
        <text x="${x + 28}" y="${y + 64}" class="sans card-title">${escapeXml(category.name)}</text>
        <text x="${x + 28}" y="${y + 118}" class="sans small-label">Planned ${escapeXml(formatCurrency(category.planned))}</text>
        <text x="${x + 28}" y="${y + 164}" class="sans small-value">${escapeXml(formatCurrency(category.actual))}</text>
        <rect x="${x + 28}" y="${y + 188}" width="318" height="14" rx="7" fill="rgba(255,255,255,0.12)" />
        <rect x="${x + 28}" y="${y + 188}" width="${widthValue}" height="14" rx="7" fill="url(#accentGradient)" />
      `;
    })
    .join("");

  const body = `
    ${rect(56, 356, 968, 1410)}
    <text x="92" y="438" class="sans card-title">Spending mix</text>
    <text x="92" y="520" class="sans stat-label">Logged spend</text>
    <text x="92" y="614" class="sans stat-value">${escapeXml(formatCurrency(spendEntriesTotal))}</text>
    <text x="92" y="676" class="sans card-copy">Across ${categoriesSeed.length} tracked categories in the current demo budget.</text>

    ${categoryCards}

    <rect x="92" y="1128" width="896" height="480" rx="30" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
    <text x="128" y="1198" class="sans card-title">Read it faster</text>
    <text x="128" y="1270" class="sans card-copy">Rent is still the dominant cost center. Groceries are under plan. Transportation is the only category in this demo state running above target.</text>
    <text x="128" y="1364" class="sans card-copy">The point is not more charts. It is knowing which category deserves attention first.</text>
  `;

  return svgFrame({
    title: "Stats that point somewhere.",
    subtitle: "A vertical render can still feel like product, not posterized filler.",
    body,
  });
};

const slideGoals = () => {
  const goalBars = goalsSeed
    .map((goal, index) => {
      const y = 532 + index * 176;
      const progress = Math.max(0, Math.min(100, Math.round((goal.amount / goal.target) * 100)));
      return `
        <text x="128" y="${y}" class="sans card-title">${escapeXml(goal.name)}</text>
        <text x="892" y="${y}" text-anchor="end" class="sans small-value">${progress}%</text>
        <text x="128" y="${y + 48}" class="sans small-label">${escapeXml(formatCurrency(goal.amount))} of ${escapeXml(formatCurrency(goal.target))}</text>
        <rect x="128" y="${y + 80}" width="760" height="16" rx="8" fill="rgba(255,255,255,0.12)" />
        <rect x="128" y="${y + 80}" width="${Math.round((progress / 100) * 760)}" height="16" rx="8" fill="url(#accentGradient)" />
      `;
    })
    .join("");

  const body = `
    ${rect(56, 356, 968, 1410)}
    <text x="92" y="438" class="sans card-title">Goals and signals</text>
    <text x="92" y="520" class="sans card-copy">This is the calmer end state: one plan, one set of progress bars, and a few signals that matter.</text>

    ${goalBars}

    <rect x="92" y="1120" width="896" height="520" rx="30" class="chip"/>
    <text x="128" y="1188" class="sans card-title">Current signals</text>
    <text x="128" y="1260" class="sans card-copy">Left to budget: ${escapeXml(formatCurrency(leftToBudget))}</text>
    <text x="128" y="1320" class="sans card-copy">Weeks below zero: ${weeklyAmounts.filter((value) => value < 0).length}</text>
    <text x="128" y="1380" class="sans card-copy">Spend vs plan: ${escapeXml(formatCurrency(Math.abs(spendVariance)))} ${spendVariance > 0 ? "over" : "under"}</text>
    <text x="128" y="1440" class="sans card-copy">Next paycheck after planned bills: ${escapeXml(formatCurrency(nextPaycheckAfterBills))}</text>

    <rect x="128" y="1516" width="824" height="2" class="line" />
    <text x="128" y="1596" class="sans stat-value">Centsy</text>
    <text x="128" y="1654" class="sans card-copy">Budgeting with cash-flow clarity.</text>
  `;

  return svgFrame({
    title: "Closer to the real product.",
    subtitle: "These renders are built from Centsy stats and UI patterns instead of scene-generated filler.",
    body,
  });
};

const files = [
  ["slide-01-overview.svg", slideOverview()],
  ["slide-02-weekly-cashflow.svg", slideWeekly()],
  ["slide-03-spending-mix.svg", slideCategories()],
  ["slide-04-goals-signals.svg", slideGoals()],
];

for (const [filename, contents] of files) {
  writeFileSync(path.join(outDir, filename), contents, "utf8");
}

console.log(`Wrote ${files.length} SVG stat renders to ${outDir}`);
