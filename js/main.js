/* =====================================================================
   AURA Carballo · main.js
   Motion: Lenis (único motor de scroll suave) + GSAP ScrollTrigger.
   Todo se salta con prefers-reduced-motion: estados finales al instante.
   ===================================================================== */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const gsapReady = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  if (gsapReady) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis (smooth scroll) ---------- */
  let lenis = null;
  if (!reduce && gsapReady && typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.auraLenis = lenis; // expuesto para depuración/tests
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        lenis.scrollTo(target, { offset: -56, duration: 1.4 });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  }

  /* ---------- Cabecera ---------- */
  const header = document.querySelector(".site-header");
  const darkSections = [...document.querySelectorAll("[data-tone='oscuro'], .hero, .servicios, .site-footer")];
  function updateHeader() {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 24);
    const probe = 40;
    let dark = false;
    for (const s of darkSections) {
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom >= probe) { dark = true; break; }
    }
    header.classList.toggle("is-dark", dark);
  }
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ---------- Menú móvil ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".mobile-menu");
  function closeMenu() {
    if (!menu || !toggle) return;
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, reduce ? 0 : 500);
    lenis && lenis.start();
  }
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      if (open) return closeMenu();
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("is-open"));
      toggle.setAttribute("aria-expanded", "true");
      lenis && lenis.stop();
    });
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  }

  /* ---------- Aviso de cookies ---------- */
  (function initCookieBanner() {
    const banner = document.querySelector(".cookie-banner");
    const ack = document.querySelector(".cookie-ack");
    if (!banner || !ack) return;
    const KEY = "aura-cookie-ack";
    let done = false;
    try { done = localStorage.getItem(KEY) === "1"; } catch (e) {}
    if (!done) banner.hidden = false;
    ack.addEventListener("click", () => {
      banner.hidden = true;
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
    });
  })();

  /* ---------- Diálogos legales ---------- */
  document.querySelectorAll("[data-dialog]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = document.getElementById(btn.dataset.dialog);
      if (!d) return;
      if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
      lenis && lenis.stop();
    });
  });
  document.querySelectorAll("dialog.legal").forEach((d) => {
    d.querySelectorAll(".legal-close").forEach((b) => b.addEventListener("click", () => d.close()));
    d.addEventListener("close", () => lenis && lenis.start());
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  });

  /* ---------- Mapa por consentimiento ---------- */
  document.querySelectorAll(".map-consent").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!btn.dataset.mapSrc) return;
      const iframe = document.createElement("iframe");
      iframe.title = btn.dataset.mapTitle || "Mapa";
      iframe.src = btn.dataset.mapSrc;
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.setAttribute("allowfullscreen", "");
      btn.replaceWith(iframe);
    }, { once: true });
  });

  /* ---------- Horario en directo (Europe/Madrid) ----------
     L-J 9:00-22:00 · V 9:00-15:00 · S-D cerrado (ficha de Google, sept. 2026) */
  const HORARIO = { 1: [9, 22], 2: [9, 22], 3: [9, 22], 4: [9, 22], 5: [9, 15], 6: null, 0: null };
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  function madridNow() {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t)?.value;
      const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get("weekday")];
      return { day: wd, h: parseInt(get("hour"), 10) % 24, m: parseInt(get("minute"), 10) };
    } catch (e) {
      const d = new Date(); return { day: d.getDay(), h: d.getHours(), m: d.getMinutes() };
    }
  }
  function fmt(h) { return `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`; }
  function nextOpening(day, dec) {
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7, s = HORARIO[d];
      if (!s) continue;
      if (i === 0 && dec >= s[0]) continue;
      return { day: d, open: s[0], today: i === 0, tomorrow: i === 1 };
    }
    return null;
  }
  function estado() {
    const { day, h, m } = madridNow();
    const dec = h + m / 60;
    const slot = HORARIO[day];
    let open = false, msg = "";
    if (slot && dec >= slot[0] && dec < slot[1]) {
      open = true;
      const left = slot[1] - dec;
      msg = left <= 1 ? `Abierto ahora · cierra en ${Math.max(1, Math.round(left * 60))} min (${fmt(slot[1])})` : `Abierto ahora · hasta las ${fmt(slot[1])}`;
    } else {
      const nx = nextOpening(day, dec);
      if (nx) {
        const when = nx.today ? `hoy a las ${fmt(nx.open)}` : nx.tomorrow ? `mañana a las ${fmt(nx.open)}` : `el ${DIAS[nx.day]} a las ${fmt(nx.open)}`;
        msg = `Cerrado ahora · abrimos ${when}`;
      } else msg = "Cerrado ahora";
    }
    document.querySelectorAll("[data-estado]").forEach((el) => {
      el.classList.toggle("is-open", open);
      el.classList.toggle("is-closed", !open);
      const txt = el.querySelector("[data-estado-text]");
      if (txt) txt.textContent = msg;
    });
    // timeline: fila de hoy + marcador "ahora"
    document.querySelectorAll(".tl-row").forEach((row) => row.classList.toggle("is-today", parseInt(row.dataset.day, 10) === day));
    const tl = document.querySelector(".timeline");
    const now = document.querySelector(".tl-now");
    if (tl && now) {
      const h0 = parseFloat(getComputedStyle(tl).getPropertyValue("--h0")) || 8;
      const h1 = parseFloat(getComputedStyle(tl).getPropertyValue("--h1")) || 23;
      if (dec >= h0 && dec <= h1) {
        now.style.left = `${((dec - h0) / (h1 - h0)) * 100}%`;
        now.dataset.label = `ahora · ${fmt(dec)}`;
        now.style.display = "block";
      } else now.style.display = "none";
    }
  }
  estado();
  setInterval(estado, 30000);

  /* ---------- Índice de cuerpo (tabs accesibles) ---------- */
  (function initCuerpo() {
    const root = document.querySelector("#cuerpo");
    if (!root) return;
    const tabs = [...root.querySelectorAll("[role='tab']")];
    const chips = [...root.querySelectorAll(".zona-chips button")];
    const panel = root.querySelector(".cuerpo-panel");
    const data = {};
    root.querySelectorAll("template[data-zona]").forEach((t) => { data[t.dataset.zona] = t; });
    if (!tabs.length || !panel) return;
    let current = null;
    function render(id, focusTab) {
      if (current === id) return;
      current = id;
      tabs.forEach((t) => {
        const on = t.dataset.zona === id;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        if (on && focusTab) t.focus();
      });
      chips.forEach((c) => c.setAttribute("aria-current", c.dataset.zona === id ? "true" : "false"));
      const tpl = data[id];
      if (!tpl) return;
      const swap = () => {
        panel.querySelector(".panel-body").replaceChildren(tpl.content.cloneNode(true));
        panel.setAttribute("aria-labelledby", `zona-${id}`);
        panel.classList.remove("is-switching");
      };
      if (reduce) return swap();
      panel.classList.add("is-switching");
      setTimeout(swap, 260);
    }
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => render(t.dataset.zona, false));
      t.addEventListener("keydown", (e) => {
        let j = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") j = (i + 1) % tabs.length;
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
        if (e.key === "Home") j = 0;
        if (e.key === "End") j = tabs.length - 1;
        if (j === null) return;
        e.preventDefault();
        render(tabs[j].dataset.zona, true);
      });
    });
    chips.forEach((c) => c.addEventListener("click", () => render(c.dataset.zona, false)));
    const initial = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
    render(initial.dataset.zona, false);
  })();

  /* ---------- Reveals (IntersectionObserver, sin GSAP para lo simple) ---------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add(e.target.classList.contains("tape") ? "is-taped" : "is-in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }) : null;
  document.querySelectorAll(".muscle, .muscle-x, .tape, .timeline").forEach((el) => {
    if (reduce || !io) { el.classList.add(el.classList.contains("tape") ? "is-taped" : "is-in"); return; }
    io.observe(el);
  });

  /* ---------- Char reveal en titulares ---------- */
  function splitChars(el) {
    const text = el.textContent;
    const words = text.split(/(\s+)/);
    const sr = document.createElement("span");
    sr.className = "sr-only"; sr.textContent = text;
    const vis = document.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    words.forEach((w) => {
      if (/^\s+$/.test(w)) { vis.appendChild(document.createTextNode(" ")); return; }
      const wd = document.createElement("span"); wd.className = "wd";
      [...w].forEach((c) => { const s = document.createElement("span"); s.className = "ch"; s.textContent = c; wd.appendChild(s); });
      vis.appendChild(wd);
    });
    // conserva <em> sencillos: si el titular tiene hijos con marcado, se divide por nodos
    el.replaceChildren(sr, vis);
    return [...vis.querySelectorAll(".ch")];
  }
  document.querySelectorAll("[data-split]").forEach((el) => {
    if (reduce || !gsapReady) return;
    if (el.children.length) {
      // titulares con <em>: dividir cada nodo hijo por separado manteniendo el énfasis
      const nodes = [...el.childNodes];
      const sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = el.textContent;
      const vis = document.createElement("span"); vis.setAttribute("aria-hidden", "true");
      nodes.forEach((n) => {
        const holder = n.nodeType === 1 ? n.cloneNode(false) : document.createElement("span");
        const txt = n.textContent;
        txt.split(/(\s+)/).forEach((w) => {
          if (/^\s+$/.test(w)) { holder.appendChild(document.createTextNode(" ")); return; }
          const wd = document.createElement("span"); wd.className = "wd";
          [...w].forEach((c) => { const s = document.createElement("span"); s.className = "ch"; s.textContent = c; wd.appendChild(s); });
          holder.appendChild(wd);
        });
        vis.appendChild(holder);
      });
      el.replaceChildren(sr, vis);
    } else splitChars(el);
    el.classList.add("chars");
    const chars = el.querySelectorAll(".ch");
    gsap.set(chars, { yPercent: 110, scaleY: 1.35, transformOrigin: "50% 100%", opacity: 0 });
    const play = () => gsap.to(chars, {
      yPercent: 0, scaleY: 1, opacity: 1, duration: 1.1, ease: "elastic.out(1, 0.62)",
      stagger: { each: 0.018, from: "start" },
    });
    if (el.closest(".hero")) { setTimeout(play, 350); }
    else ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: play });
  });

  /* ---------- Botones magnéticos ---------- */
  if (finePointer && !reduce && gsapReady) {
    document.querySelectorAll(".btn, .zona, .nav-call").forEach((btn) => {
      const inner = btn.querySelector(".btn-inner") || btn;
      const strength = btn.classList.contains("zona") ? 0.25 : 0.35;
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        gsap.to(btn, { x: x * strength, y: y * strength, duration: 0.5, ease: "power3.out" });
        if (inner !== btn) gsap.to(inner, { x: x * 0.12, y: y * 0.12, duration: 0.5, ease: "power3.out" });
      });
      btn.addEventListener("pointerleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.45)" });
        if (inner !== btn) gsap.to(inner, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.45)" });
      });
    });
  }

  /* ---------- Hero: intro ---------- */
  if (!reduce && gsapReady) {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".hero-logo .logo-word", { scale: 0.86, opacity: 0, duration: 1.4, ease: "elastic.out(1, 0.5)" }, 0.1)
      .from(".hero-logo .logo-sub, .hero-logo .logo-tag", { y: 12, opacity: 0, duration: 0.8, stagger: 0.1 }, 0.5)
      .from(".hero-actions .btn, .hero-aside > *", { y: 18, opacity: 0, duration: 0.7, stagger: 0.08 }, 0.9)
      .from(".marquee", { yPercent: 100, duration: 0.8 }, 1.1);
    // parallax suave del logo al hacer scroll (barato: solo transform)
    gsap.to(".hero-logo", { yPercent: -18, opacity: 0.35, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }

  /* ---------- Botón flotante de llamada ---------- */
  (function initFab() {
    const fab = document.querySelector(".call-fab");
    const hero = document.querySelector(".hero");
    if (!fab || !hero) return;
    new IntersectionObserver(([e]) => fab.classList.toggle("is-visible", !e.isIntersecting), { threshold: 0.15 }).observe(hero);
  })();

  /* ---------- Servicios: sticky stack ---------- */
  (function initStack() {
    const panels = [...document.querySelectorAll(".stack .panel")];
    const dots = [...document.querySelectorAll(".stack-rail li")];
    if (!panels.length) return;
    if (reduce || !gsapReady) { panels.forEach((p) => p.classList.add("is-active")); return; }
    panels.forEach((p, i) => {
      const next = panels[i + 1];
      ScrollTrigger.create({
        trigger: p, start: "top 60%",
        onEnter: () => { p.classList.add("is-active"); dots.forEach((d, j) => d.classList.toggle("is-on", j === i)); },
        onEnterBack: () => dots.forEach((d, j) => d.classList.toggle("is-on", j === i)),
      });
      // la foto "se suelta" hacia abajo mientras el panel está fijo
      const img = p.querySelector(".panel-media img");
      if (img) gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: p, start: "top bottom", end: "bottom top", scrub: true } });
      if (!next) return;
      // el panel anterior se encoge y se vela cuando lo cubre el siguiente
      gsap.to(p, { scale: 0.92, yPercent: -3, ease: "none", scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: true } });
      gsap.to(p, { "--veil": 0.55, ease: "none", scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: true, onUpdate: (st) => { p.style.setProperty("--veil", (st.progress * 0.6).toFixed(3)); } } });
    });
  })();

  /* ---------- Refresh tras fuentes/imágenes ---------- */
  if (gsapReady) {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }

  /* ---------- Diagnóstico de rendimiento (?perf) ---------- */
  if (/[?&]perf\b/.test(location.search) && "PerformanceObserver" in window) {
    try {
      const po = new PerformanceObserver((list) => list.getEntries().forEach((e) => console.warn(`[longtask] ${Math.round(e.duration)}ms @${Math.round(e.startTime)}`)));
      po.observe({ entryTypes: ["longtask"] });
      console.info("[perf] observando longtasks");
    } catch (e) {}
  }
})();
