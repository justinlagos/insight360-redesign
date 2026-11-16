import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [,, w, h, outDir, jobsJson] = process.argv;
const jobs = JSON.parse(fs.readFileSync(jobsJson, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.goto(`http://127.0.0.1:8765/${process.env.SCENE || 'scene.html'}?w=${w}&h=${h}`);
await p.waitForFunction('window.ready === true', null, { timeout: 60000 }).catch(e => { console.log('not ready', errs); process.exit(1); });
const t0 = Date.now();
for (const j of jobs) {
  const url = await p.evaluate(([t, mode, opts]) => window.renderAt(t, mode, opts), [j.t, j.mode || 'film', j.opts || {}]);
  fs.writeFileSync(`${outDir}/${j.name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  if (j.log !== false) console.log(j.name, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
if (errs.length) console.log('errors', errs.slice(0, 5));
await b.close();
