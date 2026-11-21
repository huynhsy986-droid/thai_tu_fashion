// Chụp từng khung wireframe thành PNG: node docs/wireframes/src/render.mjs (cần Chrome; chạy từ thư mục gốc repo)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(path.resolve('frontend/package.json'));
const { chromium } = require('@playwright/test');
const here = path.dirname(fileURLToPath(import.meta.url));
const exe = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
await p.goto('file://' + path.join(here, 'wireframes.html'));
for (const id of await p.$$eval('section.frame', (s) => s.map((x) => x.id))) {
  await p.locator(`[id="${id}"]`).screenshot({ path: path.join(here, '..', id + '.png') });
  console.log(id);
}
await b.close();
