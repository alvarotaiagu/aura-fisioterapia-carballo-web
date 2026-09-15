/* =====================================================================
   Campo de aura · canvas 2D del hero
   Partículas cálidas que orbitan y "respiran" alrededor del logo: el radio
   se tensa y se suelta con una onda lenta (idea de músculo). Cada glow es
   un SPRITE cacheado en un canvas offscreen (gradiente radial dibujado UNA
   vez); en el frame solo hay drawImage — cero blur/shadow por frame.
   - DPR tope 1.5
   - Se pausa cuando el hero sale de pantalla o la pestaña se oculta
   - Con prefers-reduced-motion no arranca: queda el póster CSS
   - El puntero empuja suavemente (aditivo; funciona sin él)
   ===================================================================== */
(function () {
  "use strict";
  const canvas = document.querySelector(".hero-canvas");
  const hero = document.querySelector(".hero");
  if (!canvas || !hero) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) { canvas.remove(); return; }
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) { canvas.remove(); return; }

  const TINTS = [
    [217, 181, 126], // madera
    [244, 236, 223], // hueso
    [168, 64, 45],   // terroso
    [95, 143, 62],   // césped (poco)
  ];
  const TINT_WEIGHTS = [0.5, 0.25, 0.17, 0.08];
  const SPRITE = 64; // px del sprite base

  // --- sprites cacheados (uno por tinte) ---
  const sprites = TINTS.map(([r, g, b]) => {
    const c = document.createElement("canvas");
    c.width = c.height = SPRITE;
    const x = c.getContext("2d");
    const grad = x.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.25, `rgba(${r},${g},${b},0.55)`);
    grad.addColorStop(0.6, `rgba(${r},${g},${b},0.12)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = grad;
    x.fillRect(0, 0, SPRITE, SPRITE);
    return c;
  });

  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, base = 0;
  let particles = [];
  let raf = 0, running = false, visible = true, inView = true;
  let t0 = performance.now();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: false };

  function pickTint() {
    let r = Math.random(), acc = 0;
    for (let i = 0; i < TINT_WEIGHTS.length; i++) { acc += TINT_WEIGHTS[i]; if (r <= acc) return i; }
    return 0;
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    DPR = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const logo = hero.querySelector(".hero-logo");
    if (logo) {
      const lr = logo.getBoundingClientRect();
      cx = lr.left - rect.left + lr.width / 2;
      cy = lr.top - rect.top + lr.height * 0.42;
    } else { cx = W / 2; cy = H * 0.4; }
    base = Math.min(W, H) * (W < 700 ? 0.42 : 0.34);
    const n = W < 700 ? 110 : W < 1200 ? 180 : 240;
    particles = [];
    for (let i = 0; i < n; i++) {
      const ring = Math.random();
      particles.push({
        a: Math.random() * Math.PI * 2,
        r: 0.45 + ring * 1.35,           // radio relativo al base
        w: (0.05 + Math.random() * 0.12) * (Math.random() < 0.5 ? 1 : -1), // vel. angular
        s: 6 + Math.random() * (ring < 0.3 ? 30 : 16), // tamaño px
        t: pickTint(),
        ph: Math.random() * Math.PI * 2,  // fase de respiración
        al: 0.25 + Math.random() * 0.55,  // alpha base
        dx: 0, dy: 0,                    // empuje del puntero
      });
    }
  }

  function frame(now) {
    if (!running) return;
    const t = (now - t0) / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    // respiración global: tensa (contrae) y suelta (expande), asimétrica
    const breath = 1 + 0.09 * Math.sin(t * 0.55) + 0.03 * Math.sin(t * 1.7);
    const n = particles.length;
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      p.a += p.w * 0.016;
      const wobble = 1 + 0.06 * Math.sin(t * 0.9 + p.ph);
      const rr = p.r * base * breath * wobble;
      let x = cx + Math.cos(p.a) * rr * 1.18;
      let y = cy + Math.sin(p.a) * rr * 0.82;
      if (pointer.on) {
        const ddx = x - pointer.x, ddy = y - pointer.y;
        const d2 = ddx * ddx + ddy * ddy;
        const R = 160;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / R) * 42;
          p.dx += (ddx / d) * f * 0.12;
          p.dy += (ddy / d) * f * 0.12;
        }
      }
      p.dx *= 0.9; p.dy *= 0.9;
      x += p.dx; y += p.dy;
      const flick = 0.75 + 0.25 * Math.sin(t * 2.1 + p.ph * 3);
      ctx.globalAlpha = p.al * flick;
      const s = p.s * (0.9 + 0.1 * Math.sin(t + p.ph));
      ctx.drawImage(sprites[p.t], x - s / 2, y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || !visible || !inView) return;
    running = true; t0 = performance.now() - (t0 ? 0 : 0);
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // --- eventos ---
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 120); }, { passive: true });
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; visible ? start() : stop(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? start() : stop(); }, { threshold: 0.02 }).observe(hero);
  }
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    pointer.tx = e.clientX - r.left; pointer.ty = e.clientY - r.top; pointer.on = true;
  }, { passive: true });
  hero.addEventListener("pointerleave", () => { pointer.on = false; });
  window.addEventListener("blur", () => { pointer.on = false; });
  reduce.addEventListener?.("change", (e) => { if (e.matches) { stop(); canvas.remove(); } });

  resize();
  // espera a que el logo tenga su fuente (posición del centro) y arranca
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { resize(); start(); });
  else start();
})();
