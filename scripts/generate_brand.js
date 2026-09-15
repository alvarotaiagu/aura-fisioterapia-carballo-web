// Genera favicons (PNG) y la imagen Open Graph a partir de la marca
// provisional (assets/img/logo/mark.svg y logo-hueso.svg) con Playwright.
// Uso:  NODE_PATH=<node_modules con playwright> node scripts/generate_brand.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');
const mark = fs.readFileSync(path.join(root, 'assets/img/logo/mark.svg'), 'utf8');
const logo = fs.readFileSync(path.join(root, 'assets/img/logo/logo-hueso.svg'), 'utf8');

const iconHtml = (size) => `<!doctype html><body style="margin:0;width:${size}px;height:${size}px;background:transparent;display:grid;place-items:center">
<div style="width:${size}px;height:${size}px">${mark.replace('<svg ', '<svg style="width:100%;height:100%" ')}</div></body>`;

const ogHtml = `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@500;700&display=swap" rel="stylesheet">
<style>
body{margin:0;width:1200px;height:630px;background:#15110e;color:#f4ecdf;font-family:Manrope,sans-serif;position:relative;overflow:hidden}
.bg{position:absolute;inset:0;background:radial-gradient(55% 60% at 30% 40%,rgba(217,181,126,.45),transparent 70%),radial-gradient(40% 50% at 75% 70%,rgba(168,64,45,.35),transparent 70%),radial-gradient(35% 40% at 60% 20%,rgba(95,143,62,.18),transparent 70%)}
.logo{position:absolute;left:80px;top:110px;width:520px}
.logo svg{width:100%;height:auto}
h1{position:absolute;right:80px;top:120px;width:480px;margin:0;font-family:"Instrument Serif",serif;font-weight:400;font-size:84px;line-height:.98;letter-spacing:-.015em;text-align:right}
h1 em{color:#d9b57e}
.tag{position:absolute;left:84px;top:446px;font-family:"Instrument Serif",serif;font-style:italic;font-size:30px;color:#d9b57e}
.foot{position:absolute;left:80px;right:80px;bottom:56px;display:flex;justify-content:space-between;font-size:20px;letter-spacing:.04em;opacity:.9;border-top:1px solid rgba(217,181,126,.5);padding-top:22px;font-weight:500}
</style></head><body><div class="bg"></div>
<div class="logo">${logo}</div>
<div class="tag">clínica de fisioterapia</div>
<h1>Cuerpo en movimiento, <em>luz natural.</em></h1>
<div class="foot"><span>Carballo · Rúa Baixa, 52</span><span>5,0 ★ Google · 981 75 73 69</span></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const size of [96, 180, 192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(iconHtml(size));
    await page.screenshot({ path: path.join(root, `assets/img/logo/icon-${size}.png`), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(ogHtml, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(root, 'assets/img/web/og-image.jpg'), type: 'jpeg', quality: 88 });
  await browser.close();
  console.log('brand assets ok');
})();
