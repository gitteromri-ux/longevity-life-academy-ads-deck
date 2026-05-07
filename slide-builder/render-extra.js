const { chromium } = require('playwright');
const fs = require('fs');
const root = '/home/user/workspace/deck-site';
const outDir = `${root}/slides/_extra`;
fs.mkdirSync(outDir, { recursive: true });

const groups = (() => {
  const code = fs.readFileSync(`${root}/slide-builder/extra-data.js`, 'utf8');
  const sb = { window: {} };
  new Function('window', code)(sb.window);
  return sb.window.__EXTRA_GROUPS__;
})();

function buildSlide(g, mode) {
  const headline = `${g.headlines[0]} — ${g.headlines[1]}`;
  const desc = `${g.descriptions[0]} ${g.descriptions[1]}`;
  const descShort = g.descriptions[1];
  const slTitles = [g.headlines[1], g.headlines[3] || g.headlines[2], g.headlines[5] || g.headlines[4], g.headlines[7] || g.headlines[6]];
  const slDescs = [g.descriptions[2], g.descriptions[3], "12 sessions. Live cohort. Certified instructors.", "Self-paced learning supported by a global community."];
  const sitelinks = slTitles.map((t,i)=>({t, d:slDescs[i]}));
  return {
    n: g.n, name: g.name, nameLines: g.nameLines,
    query: g.query, domainShown: g.domainShown,
    headline, desc, descShort, sitelinks,
    tabs: ["All","News","Videos","Books","Forums","Images","More"],
    counts: { results: "12,400,000", secs: "0.38" },
    competitor: g.competitor,
    match: g.n === "FIN" ? "Broad" : "Phrase",
    mode
  };
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`file://${root}/slide-builder/template.html`, { waitUntil: 'load' });
  for (const g of groups) {
    for (const mode of ['desktop','mobile']) {
      const data = buildSlide(g, mode);
      await page.evaluate((d)=>{ window.__SLIDE__=d; window.__renderSlide(); }, data);
      await page.waitForTimeout(120);
      const file = `${outDir}/extra-${g.n}-${mode}.png`;
      await page.screenshot({ path: file, clip: { x:0,y:0,width:1440,height:810 } });
      console.log('rendered', file);
    }
  }
  await browser.close();
})();
