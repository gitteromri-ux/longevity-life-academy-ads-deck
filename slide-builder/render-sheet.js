// Render slides from sheet-data.js using existing template.html
// Output: /home/user/workspace/deck-site/slides/_sheet/sheet-NN-mode.png
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = '/home/user/workspace/deck-site';
const tmplPath = `file://${root}/slide-builder/template.html`;
const outDir = `${root}/slides/_sheet`;
fs.mkdirSync(outDir, { recursive: true });

// Pull groups from sheet-data.js
const groups = (() => {
  const code = fs.readFileSync(`${root}/slide-builder/sheet-data.js`, 'utf8');
  const sandbox = { window: {} };
  new Function('window', code)(sandbox.window);
  return sandbox.window.__SHEET_GROUPS__;
})();

function buildSlide(g, mode) {
  // Map sheet RSA fields into the template's expected shape
  // Headline 1 = main ad headline. We'll combine with H2 for a richer line.
  const headline = `${g.headlines[0]} — ${g.headlines[1]}`;
  const desc = `${g.descriptions[0]} ${g.descriptions[1]}`;
  const descShort = g.descriptions[1];
  // Sitelinks: pick 4 secondary headlines that are NOT the main headline,
  // pair each with a short description from the sheet bank.
  const slTitles = [g.headlines[1], g.headlines[3] || g.headlines[2], g.headlines[5] || g.headlines[4], g.headlines[7] || g.headlines[6]];
  const slDescs = [
    g.descriptions[2],
    g.descriptions[3],
    "12 sessions. Live cohort. Certified instructors.",
    "Self-paced learning supported by a global community."
  ];
  const sitelinks = slTitles.map((t,i) => ({ t, d: slDescs[i] }));
  return {
    n: g.n,
    name: g.name,
    nameLines: g.nameLines,
    query: g.query,
    domainShown: g.domainShown,
    headline,
    desc,
    descShort,
    sitelinks,
    tabs: ["All","News","Videos","Books","Forums","Images","More"],
    counts: { results: "12,400,000", secs: "0.38" },
    competitor: g.competitor,
    match: g.n === "35" ? "Broad" : "Phrase",
    mode
  };
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    deviceScaleFactor: 2
  });
  const page = await ctx.newPage();
  await page.goto(tmplPath, { waitUntil: 'load' });

  let i = 0;
  for (const g of groups) {
    for (const mode of ['desktop','mobile']) {
      i++;
      const data = buildSlide(g, mode);
      await page.evaluate((d) => { window.__SLIDE__ = d; window.__renderSlide(); }, data);
      await page.waitForTimeout(120);
      const file = `${outDir}/sheet-${String(i).padStart(2,'0')}-${g.n}-${mode}.png`;
      await page.screenshot({ path: file, clip: { x:0, y:0, width:1440, height:810 } });
      console.log('rendered', file);
    }
  }
  await browser.close();
})();
