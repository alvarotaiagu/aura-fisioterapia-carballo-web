// Verificación con Playwright:
//  - el botón del aviso de cookies funciona (y se recuerda tras recargar)
//  - no hay zonas muertas de pointer-events sobre el hero (cada CTA recibe el click,
//    y ninguna muestra de una rejilla de puntos cae sobre el canvas)
//  - el índice de cuerpo se maneja con teclado (flechas)
//  - longtasks (PerformanceObserver) durante la intro y el scroll completo
//  - prefers-reduced-motion: el canvas no se monta
//  - capturas de cada sección en escritorio (1440) y móvil (390)
// Uso: node scripts/verify.js [baseUrl]   (por defecto http://localhost:8765/)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const base = process.argv[2] || 'http://localhost:8765/';
const outDir = path.resolve(__dirname, '..', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });
const report = { ok: true, checks: [], longtasks: {}, screenshots: [] };
const check = (name, pass, detail) => { report.checks.push({ name, pass, detail }); if (!pass) report.ok = false; console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

const SECTIONS = ['#inicio', '#cuerpo', '#servicios', '#horario', '#opiniones', '#equipo', '#contacto', '.site-footer'];

async function scrollThrough(page, step = 700, pause = 90) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += step) { await page.mouse.wheel(0, step); await page.waitForTimeout(pause); }
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch();

  /* ---------- Escritorio ---------- */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__lt = [];
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push({ d: Math.round(e.duration), t: Math.round(e.startTime) }))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Solo errores de nuestro origen: el iframe de Google Maps emite sus propios
  // errores CORS internos (maps.googleapis.com) que no son de la web.
  page.on('console', (m) => { if (m.type() === 'error' && !/google\.com|googleapis\.com|gstatic\.com/.test((m.location() && m.location().url) || m.text())) errors.push(m.text()); });
  await page.goto(base, { waitUntil: 'load' });
  // La tarea larga del primer parse/estilo/layout del documento (~100-130 ms)
  // aparece incluso bloqueando TODO el JS (ver scripts/README): se registra
  // como información y se mide la intro a partir del evento load.
  const ltLoad = await page.evaluate(() => window.__lt.splice(0));
  report.longtasks.load = ltLoad;
  console.log(`INFO  longtasks hasta load (parse/layout inicial, sin JS implicado): ${JSON.stringify(ltLoad)}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2200); // intro del hero
  const ltIntro = await page.evaluate(() => window.__lt.splice(0));
  report.longtasks.intro = ltIntro;
  check('sin errores JS en carga', errors.length === 0, errors.join(' | '));
  check('longtasks durante la intro del hero (>50ms)', ltIntro.filter((e) => e.d > 50).length === 0, JSON.stringify(ltIntro));

  // --- cookies ---
  const bannerVisible = await page.locator('.cookie-banner').isVisible();
  check('aviso de cookies visible en primera visita', bannerVisible);
  await page.click('.cookie-ack');
  await page.waitForTimeout(150);
  const hiddenAfter = await page.evaluate(() => { const b = document.querySelector('.cookie-banner'); return b.hidden && getComputedStyle(b).display === 'none'; });
  check('botón "Entendido" oculta el aviso (display none real)', hiddenAfter);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const hiddenReload = await page.evaluate(() => document.querySelector('.cookie-banner').hidden);
  check('el aviso no vuelve tras recargar', hiddenReload);

  // --- hero pointer-events ---
  const dead = await page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const r = hero.getBoundingClientRect();
    const problems = [];
    // 1) cada CTA/enlace del hero y de la cabecera recibe el hit en su centro
    document.querySelectorAll('.hero a, .hero button, .site-header a, .site-header button').forEach((el) => {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      if (!hit || !(el === hit || el.contains(hit))) problems.push({ el: el.className || el.tagName, hit: hit ? (hit.className || hit.tagName) : null });
    });
    // 2) rejilla de puntos: nada debe caer sobre el canvas ni sobre capas decorativas
    let canvasHits = 0, samples = 0;
    for (let i = 1; i < 24; i++) for (let j = 1; j < 12; j++) {
      const x = r.left + (r.width * i) / 24, y = Math.max(0, r.top) + (Math.min(window.innerHeight, r.bottom) * j) / 12;
      const hit = document.elementFromPoint(x, y); samples++;
      if (hit && (hit.tagName === 'CANVAS' || hit.classList.contains('hero-poster') || hit.classList.contains('hero-sombra'))) canvasHits++;
    }
    return { problems, canvasHits, samples };
  });
  check('CTAs del hero y cabecera reciben el click', dead.problems.length === 0, JSON.stringify(dead.problems));
  check('sin zonas muertas sobre el hero (canvas/capas decorativas)', dead.canvasHits === 0, `${dead.canvasHits}/${dead.samples} muestras`);

  // --- índice de cuerpo por teclado ---
  await page.locator('#cuerpo').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.focus('#zona-cuello');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(500);
  const kb = await page.evaluate(() => ({
    selected: document.querySelector('[role="tab"][aria-selected="true"]').id,
    focused: document.activeElement.id,
    title: document.querySelector('#cuerpo-panel h3')?.textContent.trim(),
  }));
  check('índice de cuerpo: flecha abajo selecciona y enfoca "hombro"', kb.selected === 'zona-hombro' && kb.focused === 'zona-hombro' && /Hombro/.test(kb.title || ''), JSON.stringify(kb));
  await page.keyboard.press('End');
  await page.waitForTimeout(500);
  const kbEnd = await page.evaluate(() => document.querySelector('[role="tab"][aria-selected="true"]').id);
  check('índice de cuerpo: tecla Fin va a "tobillo"', kbEnd === 'zona-tobillo', kbEnd);
  // foco visible: outline calculado
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  check('foco visible en la zona activa', outline !== 'none', outline);

  // --- mapa por consentimiento ---
  const iframesBefore = await page.locator('iframe').count();
  check('sin iframe de Google antes del consentimiento', iframesBefore === 0, String(iframesBefore));
  await page.locator('.map-consent').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.click('.map-consent');
  await page.waitForTimeout(800);
  const iframeSrc = await page.locator('.mapa iframe').getAttribute('src').catch(() => null);
  check('el mapa se carga solo al pulsar', !!iframeSrc && /google\.com\/maps/.test(iframeSrc), iframeSrc);

  // --- scroll completo + longtasks ---
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__lt.splice(0));
  await scrollThrough(page);
  const ltScroll = await page.evaluate(() => window.__lt.splice(0));
  report.longtasks.scroll = ltScroll;
  check('longtasks durante el scroll completo (>100ms)', ltScroll.filter((e) => e.d > 100).length === 0, JSON.stringify(ltScroll));
  check('sin errores JS tras interactuar', errors.length === 0, errors.join(' | '));

  // --- capturas escritorio (recarga: el mapa vuelve al estado de consentimiento) ---
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  for (const sel of SECTIONS) {
    const name = sel.replace(/[#.]/g, '');
    if (sel === '#servicios') {
      const panels = await page.locator('.stack .panel').count();
      for (let i = 0; i < panels; i++) {
        await page.evaluate((i) => { const s = document.querySelector('.stack'); const top = s.getBoundingClientRect().top + window.scrollY; window.scrollTo(0, top + i * window.innerHeight); }, i);
        await page.waitForTimeout(1500);
        const file = path.join(outDir, `desktop-servicios-0${i + 1}.png`);
        await page.screenshot({ path: file });
        report.screenshots.push(file);
      }
      continue;
    }
    await page.evaluate((sel) => { const el = document.querySelector(sel); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - (sel === '#inicio' ? 0 : 40)); }, sel);
    await page.waitForTimeout(sel === '#inicio' ? 2500 : 1500);
    const file = path.join(outDir, `desktop-${name}.png`);
    const el = page.locator(sel);
    const h = await el.evaluate((e) => e.getBoundingClientRect().height);
    if (h > 900) await el.screenshot({ path: file }); else await page.screenshot({ path: file });
    report.screenshots.push(file);
  }
  await page.locator('.map-consent').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.click('.map-consent');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'desktop-contacto-mapa.png') });
  await ctx.close();

  /* ---------- Reduced motion ---------- */
  const ctxRM = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const pageRM = await ctxRM.newPage();
  await pageRM.goto(base, { waitUntil: 'networkidle' });
  await pageRM.waitForTimeout(800);
  const rm = await pageRM.evaluate(() => ({ canvas: !!document.querySelector('.hero-canvas'), lenis: document.documentElement.classList.contains('lenis'), h1Visible: getComputedStyle(document.querySelector('.hero h1')).opacity }));
  check('reduced-motion: canvas no montado, sin Lenis, h1 visible', !rm.canvas && !rm.lenis && rm.h1Visible === '1', JSON.stringify(rm));
  await ctxRM.close();

  /* ---------- Móvil ---------- */
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pageM = await ctxM.newPage();
  const errorsM = [];
  pageM.on('pageerror', (e) => errorsM.push(String(e)));
  await pageM.goto(base, { waitUntil: 'networkidle' });
  await pageM.waitForTimeout(2200);
  const overflow = await pageM.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('móvil 390: sin scroll horizontal', overflow <= 0, `${overflow}px`);
  await pageM.click('.cookie-ack');
  await pageM.screenshot({ path: path.join(outDir, 'mobile-inicio.png') });
  await pageM.click('.nav-toggle');
  await pageM.waitForTimeout(700);
  await pageM.screenshot({ path: path.join(outDir, 'mobile-menu.png') });
  await pageM.click('.nav-toggle');
  await pageM.waitForTimeout(600);
  for (const sel of SECTIONS.slice(1)) {
    const name = sel.replace(/[#.]/g, '');
    await pageM.evaluate((sel) => { const el = document.querySelector(sel); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 30); }, sel);
    await pageM.waitForTimeout(1500);
    await pageM.screenshot({ path: path.join(outDir, `mobile-${name}.png`) });
  }
  // 360px: el ancho mínimo del brief
  await pageM.setViewportSize({ width: 360, height: 780 });
  await pageM.waitForTimeout(500);
  const overflow360 = await pageM.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('móvil 360: sin scroll horizontal', overflow360 <= 0, `${overflow360}px`);
  await pageM.evaluate(() => { window.auraLenis ? window.auraLenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0); });
  await pageM.waitForTimeout(1000);
  await pageM.screenshot({ path: path.join(outDir, 'mobile-360-inicio.png') });
  check('móvil: sin errores JS', errorsM.length === 0, errorsM.join(' | '));
  await ctxM.close();

  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'verify-report.json'), JSON.stringify(report, null, 2));
  console.log(report.ok ? '\nTODO OK' : '\nHAY FALLOS');
  process.exit(report.ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
