/* =========================================================
   HERBALPLANTSMAR — app engine
   One file renders every page, driven by data/plants.json
   + data/recipes.json. Page chosen via <body data-page="...">.
   No build step, no dependencies.
   ========================================================= */

(function () {
  "use strict";

  // ---------- constants ----------
  const MAAND_KORT = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
  const MAAND_LANG = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
  const SEIZOENEN = {
    lente:  { label: "Lente",  maanden: [3,4,5] },
    zomer:  { label: "Zomer",  maanden: [6,7,8] },
    herfst: { label: "Herfst", maanden: [9,10,11] },
    winter: { label: "Winter", maanden: [12,1,2] },
  };
  function seizoenVanMaand(m) {
    for (const key in SEIZOENEN) if (SEIZOENEN[key].maanden.includes(m)) return key;
    return "lente";
  }
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // ---------- tiny DOM helpers ----------
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) for (const k in props) {
      if (k === "class") node.className = props[k];
      else if (k === "html") node.innerHTML = props[k];
      else if (k === "text") node.textContent = props[k];
      else if (k.startsWith("on") && typeof props[k] === "function") node.addEventListener(k.slice(2), props[k]);
      else if (props[k] != null) node.setAttribute(k, props[k]);
    }
    if (children != null) (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // ---------- placeholder image (SVG data-URI) ----------
  function placeholder(name) {
    const label = (name || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>` +
      `<rect width='400' height='300' fill='#e9f1ec'/>` +
      `<path d='M200 70c-40 30-60 70-60 110 0 25 18 45 60 45s60-20 60-45c0-40-20-80-60-110z' fill='#a7c957' opacity='.5'/>` +
      `<line x1='200' y1='110' x2='200' y2='225' stroke='#4c956c' stroke-width='3'/>` +
      `<text x='200' y='268' font-family='Georgia, serif' font-size='20' fill='#2c6e49' text-anchor='middle'>${label}</text>` +
      `<text x='200' y='292' font-family='sans-serif' font-size='11' fill='#6b7268' text-anchor='middle'>foto volgt</text>` +
      `</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function img(src, alt, name, cls) {
    const node = el("img", { alt: alt || name || "", loading: "lazy" });
    if (cls) node.className = cls;
    node.src = src || placeholder(name);
    node.addEventListener("error", function onerr() {
      node.removeEventListener("error", onerr);
      node.src = placeholder(name);
    });
    return node;
  }

  // ===================================================================
  // STIJL-PANEEL — live thema-switcher (kleuren, accenten, lettertypen).
  // Schrijft uitsluitend de thema-tokens in :root; keuze in localStorage.
  // Doel: een passend thema voor de site vinden door uit te proberen.
  // ===================================================================
  const THEME_KEY = "hp-theme";

  // token-sleutel -> CSS-variabele (allemaal R,G,B-triples)
  const THEME_VARS = {
    p:   "--primary-rgb",
    pd:  "--primary-dark-rgb",
    ac:  "--accent-rgb",
    bg:  "--bg-rgb",
    sf:  "--surface-rgb",
    ink: "--ink-rgb",
  };
  // welke kleurkiezers tonen we (volgorde = weergave), met label
  const THEME_SWATCHES = [
    ["p",   "Hoofdkleur"],
    ["ac",  "Accent"],
    ["bg",  "Achtergrond"],
    ["sf",  "Kaarten"],
    ["ink", "Tekst"],
    ["pd",  "Donkere variant"],
  ];

  const GF = "https://fonts.googleapis.com/css2?family=";
  const FONTS_HEAD = [
    { name: "Cormorant — klassiek", stack: '"Cormorant Garamond", Garamond, Georgia, serif', href: GF + "Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap" },
    { name: "Playfair — elegant",   stack: '"Playfair Display", Georgia, serif',             href: GF + "Playfair+Display:ital,wght@0,600;1,600&display=swap" },
    { name: "Lora — zacht schreef", stack: '"Lora", Georgia, serif',                          href: GF + "Lora:ital,wght@0,500;0,600;1,500&display=swap" },
    { name: "Bitter — robuust",     stack: '"Bitter", Georgia, serif',                        href: GF + "Bitter:wght@600;700&display=swap" },
    { name: "Poppins — modern",     stack: '"Poppins", system-ui, sans-serif',                href: GF + "Poppins:wght@500;600;700&display=swap" },
    { name: "Georgia — systeem",    stack: 'Georgia, "Times New Roman", serif',               href: null },
  ];
  const FONTS_BODY = [
    { name: "Segoe UI — systeem",  stack: '"Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif', href: null },
    { name: "Inter",               stack: '"Inter", system-ui, sans-serif',         href: GF + "Inter:wght@400;600&display=swap" },
    { name: "Source Sans",         stack: '"Source Sans 3", system-ui, sans-serif', href: GF + "Source+Sans+3:ital,wght@0,400;0,600;1,400&display=swap" },
    { name: "Nunito — zacht",      stack: '"Nunito", system-ui, sans-serif',        href: GF + "Nunito:wght@400;600;700&display=swap" },
    { name: "Lora — schreef tekst",stack: '"Lora", Georgia, serif',                 href: GF + "Lora:ital,wght@0,400;0,600;1,400&display=swap" },
    { name: "Georgia",             stack: 'Georgia, "Times New Roman", serif',      href: null },
  ];

  const PRESETS = [
    { id: "bos",      name: "Bos",            t: { p:"#2c6e49", pd:"#1f4d34", ac:"#a7c957", bg:"#f7f5f0", sf:"#ffffff", ink:"#26302a" }, head:0, body:0 },
    { id: "herfst",   name: "Herfst",         t: { p:"#8a4b2f", pd:"#5e3320", ac:"#d9a23d", bg:"#faf4ea", sf:"#fffdf9", ink:"#2e2620" }, head:2, body:2 },
    { id: "lavendel", name: "Lavendel",       t: { p:"#6b5b95", pd:"#463c63", ac:"#b8a4d4", bg:"#f6f4fa", sf:"#ffffff", ink:"#2b2733" }, head:1, body:3 },
    { id: "oceaan",   name: "Oceaan",         t: { p:"#1f6f78", pd:"#11464c", ac:"#5cc1c9", bg:"#eef6f6", sf:"#ffffff", ink:"#1e2b2d" }, head:3, body:1 },
    { id: "terra",    name: "Terracotta",     t: { p:"#a8492f", pd:"#6e2c1a", ac:"#e0a96d", bg:"#fbf6f0", sf:"#fffdfa", ink:"#2c211c" }, head:4, body:2 },
    { id: "avond",    name: "Avond (donker)", t: { p:"#3f9168", pd:"#0f1d14", ac:"#7fc69b", bg:"#161f1a", sf:"#1f2b24", ink:"#e7f0ea" }, head:0, body:1 },
  ];

  // ---- kleur-helpers ----
  function hexToRgb(hex) {
    const h = String(hex).replace("#", "");
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return [parseInt(n.slice(0,2),16) || 0, parseInt(n.slice(2,4),16) || 0, parseInt(n.slice(4,6),16) || 0];
  }
  function rgbToHex(r, g, b) {
    const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return "#" + h(r) + h(g) + h(b);
  }
  function rgbToTriple(rgb) { return rgb.map((v) => Math.round(v)).join(", "); }

  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
    let h = 0; const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2*l - 1));
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, s, l];
  }
  function hslToRgb([h, s, l]) {
    const c = (1 - Math.abs(2*l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c/2;
    let r=0,g=0,b=0;
    if (h < 60) { r=c; g=x; }
    else if (h < 120) { r=x; g=c; }
    else if (h < 180) { g=c; b=x; }
    else if (h < 240) { g=x; b=c; }
    else if (h < 300) { r=x; b=c; }
    else { r=c; b=x; }
    return [(r+m)*255, (g+m)*255, (b+m)*255];
  }
  // draai de tint van een kleur met `deg` graden (verzadiging/lichtheid blijven)
  function rotateHex(hex, deg) {
    if (!deg) return hex;
    const [h, s, l] = rgbToHsl(hexToRgb(hex));
    const rgb = hslToRgb([(h + deg + 360) % 360, s, l]);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  }
  // meng kleur richting wit (t = aandeel wit, 0..1) — voor de zachte variant
  function mixWhite(hex, t) {
    const [r,g,b] = hexToRgb(hex);
    return [r + (255-r)*t, g + (255-g)*t, b + (255-b)*t];
  }

  // ---- thema toepassen / bewaren ----
  let activeTheme = null;                 // { t:{...hex}, head:idx, body:idx, hue:int, presetId }
  const loadedFonts = new Set();

  function ensureFont(font) {
    if (!font || !font.href || loadedFonts.has(font.href)) return;
    loadedFonts.add(font.href);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = font.href;
    document.head.appendChild(link);
  }

  function defaultTheme() {
    const p = PRESETS[0];
    return { t: Object.assign({}, p.t), head: p.head, body: p.body, hue: 0, presetId: p.id };
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    const hue = theme.hue || 0;
    for (const key in THEME_VARS) {
      root.style.setProperty(THEME_VARS[key], rgbToTriple(hexToRgb(rotateHex(theme.t[key], hue))));
    }
    // zachte variant automatisch afleiden van de (geroteerde) hoofdkleur
    root.style.setProperty("--primary-mid-rgb", rgbToTriple(mixWhite(rotateHex(theme.t.p, hue), 0.3)));
    const head = FONTS_HEAD[theme.head] || FONTS_HEAD[0];
    const body = FONTS_BODY[theme.body] || FONTS_BODY[0];
    ensureFont(head); ensureFont(body);
    root.style.setProperty("--serif", head.stack);
    root.style.setProperty("--sans", body.stack);
  }

  function saveTheme(theme) {
    try { localStorage.setItem(THEME_KEY, JSON.stringify(theme)); } catch (e) { /* private mode */ }
  }
  function loadTheme() {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      if (!raw) return defaultTheme();
      const t = JSON.parse(raw);
      if (!t || !t.t) return defaultTheme();
      return Object.assign(defaultTheme(), t);
    } catch (e) { return defaultTheme(); }
  }

  function themeCss(theme) {
    const hue = theme.hue || 0;
    const out = [":root {"];
    for (const key in THEME_VARS) {
      out.push("  " + THEME_VARS[key] + ": " + rgbToTriple(hexToRgb(rotateHex(theme.t[key], hue))) + ";");
    }
    out.push("  --primary-mid-rgb: " + rgbToTriple(mixWhite(rotateHex(theme.t.p, hue), 0.3)) + ";");
    out.push("  --serif: " + (FONTS_HEAD[theme.head] || FONTS_HEAD[0]).stack + ";");
    out.push("  --sans:  " + (FONTS_BODY[theme.body] || FONTS_BODY[0]).stack + ";");
    out.push("}");
    return out.join("\n");
  }

  // direct bij laden toepassen (vóór paint → geen flikkering)
  function applySavedTheme() {
    activeTheme = loadTheme();
    applyTheme(activeTheme);
  }
  applySavedTheme();

  function buildThemePanel() {
    if (document.querySelector(".theme-fab")) return;

    const panel = el("aside", { class: "theme-panel", hidden: "", role: "dialog", "aria-label": "Stijl van de website aanpassen" });
    panel.appendChild(el("h2", null, "Stijl uitproberen"));
    panel.appendChild(el("p", { class: "tp-sub" },
      "Kies een sfeer, of stel kleuren, tint en lettertypen los in. De pagina verandert direct mee; je keuze wordt onthouden op dit apparaat."));

    // --- presets / sfeer ---
    const presetWrap = el("div", { class: "tp-presets" });
    PRESETS.forEach((p) => {
      const sw = el("span", { class: "tp-swatch" }, [
        el("i", { style: "background:" + p.t.p }),
        el("i", { style: "background:" + p.t.ac }),
        el("i", { style: "background:" + p.t.bg }),
      ]);
      presetWrap.appendChild(el("button", {
        class: "tp-preset" + (activeTheme.presetId === p.id ? " active" : ""),
        type: "button", "data-preset": p.id,
        onclick: () => {
          activeTheme = { t: Object.assign({}, p.t), head: p.head, body: p.body, hue: 0, presetId: p.id };
          applyTheme(activeTheme); saveTheme(activeTheme); refresh();
        },
      }, [sw, el("span", null, p.name)]));
    });
    panel.appendChild(el("div", { class: "tp-group" }, [el("span", { class: "tp-label" }, "Sfeer"), presetWrap]));

    // --- losse kleuren ---
    const colorWrap = el("div");
    THEME_SWATCHES.forEach(([key, label]) => {
      colorWrap.appendChild(el("div", { class: "tp-row" }, [
        el("label", null, label),
        el("input", {
          type: "color", class: "tp-color", value: activeTheme.t[key], "data-key": key, "aria-label": label,
          oninput: (e) => {
            activeTheme.t[key] = e.target.value; activeTheme.presetId = null;
            applyTheme(activeTheme); saveTheme(activeTheme); markActivePreset(); syncExport();
          },
        }),
      ]));
    });
    panel.appendChild(el("div", { class: "tp-group" }, [el("span", { class: "tp-label" }, "Kleuren"), colorWrap]));

    // --- tint-slider (verschuift het hele palet) ---
    const hueInput = el("input", {
      type: "range", class: "tp-range", min: "-180", max: "180", step: "2",
      value: String(activeTheme.hue || 0), "aria-label": "Tint verschuiven",
      oninput: (e) => { activeTheme.hue = parseInt(e.target.value, 10); applyTheme(activeTheme); saveTheme(activeTheme); syncExport(); },
    });
    panel.appendChild(el("div", { class: "tp-group" }, [
      el("span", { class: "tp-label" }, "Tint verschuiven — heel palet"), hueInput,
    ]));

    // --- lettertypen ---
    const headSel = el("select", {
      class: "tp-select", "aria-label": "Lettertype koppen",
      onchange: (e) => { activeTheme.head = parseInt(e.target.value,10); activeTheme.presetId = null; applyTheme(activeTheme); saveTheme(activeTheme); markActivePreset(); syncExport(); },
    }, FONTS_HEAD.map((f, i) => el("option", { value: String(i) }, "Koppen: " + f.name)));
    const bodySel = el("select", {
      class: "tp-select", "aria-label": "Lettertype tekst",
      onchange: (e) => { activeTheme.body = parseInt(e.target.value,10); activeTheme.presetId = null; applyTheme(activeTheme); saveTheme(activeTheme); markActivePreset(); syncExport(); },
    }, FONTS_BODY.map((f, i) => el("option", { value: String(i) }, "Tekst: " + f.name)));
    panel.appendChild(el("div", { class: "tp-group" }, [el("span", { class: "tp-label" }, "Lettertypen"), headSel, bodySel]));

    // --- acties ---
    const copyBtn = el("button", { class: "btn", type: "button", onclick: copyCss }, "Kopieer CSS");
    panel.appendChild(el("div", { class: "tp-actions" }, [
      el("button", { class: "btn ghost", type: "button",
        onclick: () => { try { localStorage.removeItem(THEME_KEY); } catch (e) {} activeTheme = defaultTheme(); applyTheme(activeTheme); refresh(); } }, "Herstel"),
      copyBtn,
    ]));

    // --- CSS-export om een gekozen thema vast te leggen ---
    const ta = el("textarea", { readonly: "", spellcheck: "false" });
    const details = el("details", { class: "tp-export" }, [
      el("summary", null, "Toon CSS om dit thema vast te leggen"), ta,
    ]);
    panel.appendChild(details);
    details.addEventListener("toggle", () => { if (details.open) syncExport(); });

    function syncExport() { ta.value = themeCss(activeTheme); }
    function copyCss() {
      const css = themeCss(activeTheme);
      ta.value = css; details.open = true;
      const toast = (msg) => { const t = el("span", { class: "tp-toast" }, msg); copyBtn.after(t); setTimeout(() => t.remove(), 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(css).then(() => toast("Gekopieerd!")).catch(() => toast("Staat in het vak ↓"));
      } else { toast("Staat in het vak ↓"); }
    }
    function markActivePreset() {
      panel.querySelectorAll(".tp-preset").forEach((b) =>
        b.classList.toggle("active", b.getAttribute("data-preset") === activeTheme.presetId));
    }
    // zet alle controls terug naar de waarden in activeTheme
    function refresh() {
      markActivePreset();
      panel.querySelectorAll(".tp-color").forEach((inp) => { inp.value = activeTheme.t[inp.getAttribute("data-key")]; });
      hueInput.value = String(activeTheme.hue || 0);
      headSel.value = String(activeTheme.head);
      bodySel.value = String(activeTheme.body);
      syncExport();
    }

    const fab = el("button", {
      class: "theme-fab", type: "button", title: "Stijl aanpassen", "aria-label": "Stijl aanpassen", "aria-expanded": "false",
      // tekstknop i.p.v. emoji
      onclick: () => {
        const opening = panel.hasAttribute("hidden");
        if (opening) { panel.removeAttribute("hidden"); fab.setAttribute("aria-expanded", "true"); refresh(); }
        else { panel.setAttribute("hidden", ""); fab.setAttribute("aria-expanded", "false"); }
      },
    }, "Stijl");

    refresh();
    document.body.appendChild(panel);
    document.body.appendChild(fab);
  }

  // ---------- shared chrome (nav + footer) ----------
  function buildHeader(page) {
    const isHome = page === "home";
    const header = document.getElementById("site-header") || el("header", { id: "site-header" });
    if (!header.parentNode) document.body.insertBefore(header, document.body.firstChild);

    // De home heeft géén bovenbalk: de fotobanner staat full-bleed bovenaan en
    // de tegels eronder vormen de navigatie. (Zoeken zit in de planten-sectie.)
    if (isHome) { header.className = ""; header.innerHTML = ""; return {}; }

    // Overige pagina's (detail, losse galerijen) houden een balk om terug naar
    // de home-secties te navigeren.
    const links = [
      ["index.html#planten", "Planten", "planten"],
      ["index.html#recepten", "Recepten", "recepten"],
      ["index.html#seizoen", "Dit seizoen", "seizoen"],
      ["index.html#projecten", "Projecten", "projecten"],
    ];
    const pageActive = { plant: "planten", recepten: "recepten", seizoen: "seizoen", projecten: "projecten" }[page] || "";
    const ul = el("ul", { class: "nav-links" },
      links.map(([href, label, key]) =>
        el("li", null, el("a", { href, "data-nav": key, class: key === pageActive ? "active" : "" }, label))));
    const brand = el("a", { href: "index.html", class: "nav-brand", html: "HERBAL<span>PLANTS</span>MAR" });
    header.className = "site-header";
    header.innerHTML = "";
    header.appendChild(el("div", { class: "nav-inner" }, [brand, ul]));
    return {};
  }

  function buildFooter() {
    const f = document.getElementById("site-footer") || el("footer", { id: "site-footer" });
    f.className = "site-footer";
    f.innerHTML =
      "<strong>HerbalPlantsMar</strong> — wilde & kruidige planten, recepten en seizoen.<br>" +
      "Eet nooit een plant zonder 100% zekere determinatie. Informatie op deze site is educatief, geen medisch advies.";
    if (!f.parentNode) document.body.appendChild(f);
  }

  function safetyBanner(text) {
    return el("div", { class: "safety", html:
      "<strong>Let op:</strong> " + text });
  }

  // ---------- data ----------
  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(path + " → " + res.status);
    return res.json();
  }
  async function loadData() {
    const [plants, recipes] = await Promise.all([
      loadJSON("data/plants.json").catch(() => []),
      loadJSON("data/recipes.json").catch(() => []),
    ]);
    return { plants: plants || [], recipes: recipes || [] };
  }
  const byId = (plants) => Object.fromEntries(plants.map((p) => [p.id, p]));

  function chip(text, cls) { return el("span", { class: "chip " + (cls || "") }, text); }

  // wrap matched substring of `text` in <mark>; returns a DOM fragment
  function highlight(text, q) {
    text = text || "";
    q = (q || "").trim();
    if (!q) return document.createTextNode(text);
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return document.createTextNode(text);
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createTextNode(text.slice(0, i)));
    frag.appendChild(el("mark", null, text.slice(i, i + q.length)));
    frag.appendChild(document.createTextNode(text.slice(i + q.length)));
    return frag;
  }
  function draftBadge(status) {
    return status === "verified"
      ? el("span", { class: "badge-verified", text: "gecontroleerd" })
      : el("span", { class: "badge-draft", text: "concept — nog controleren" });
  }

  // ---------- inline source citations (footnotes) ----------
  // prose strings may contain [n] / [n,m] markers; n is 1-based into the
  // plant's `bronnen`. Render each as a superscript link to the notes list.
  function srcHost(url) {
    try { return new URL(url, location.href).hostname.replace(/^www\./, ""); }
    catch (e) { return url || ""; }
  }
  function citeFrag(text, bronnen, pid) {
    const frag = document.createDocumentFragment();
    text = text || ""; bronnen = bronnen || [];
    const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const nums = m[1].split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 1 && n <= bronnen.length);
      if (nums.length) {
        const sup = el("sup", { class: "fn-ref" });
        nums.forEach((n, i) => {
          if (i) sup.appendChild(document.createTextNode(","));
          sup.appendChild(el("a", { href: "#fn-" + pid + "-" + n, title: srcHost(bronnen[n - 1]) }, String(n)));
        });
        frag.appendChild(sup);
      } else {
        frag.appendChild(document.createTextNode(m[0])); // out-of-range: keep literal, lose nothing
      }
      last = re.lastIndex;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }
  // build a <p>/<div> whose text is run through citeFrag
  function citeNode(tag, cls, text, bronnen, pid) {
    const node = el(tag, cls ? { class: cls } : null);
    node.appendChild(citeFrag(text, bronnen, pid));
    return node;
  }

  // ===================================================================
  // PAGE: home — één pagina: fotobanner + tegelkeuze, secties laden
  // in-place in #app (geen herladen). Sectie volgt uit location.hash,
  // dus deep-links (index.html#recepten) en de nav-balk werken mee.
  // ===================================================================
  function renderHome(plants, recipes, ctx) {
    const app = document.getElementById("app");
    app.innerHTML = "";

    const TILES = [
      { key: "planten",   label: "Planten",     sub: "Wat je vindt & wat je ermee kunt" },
      { key: "recepten",  label: "Recepten",    sub: "Koken met je oogst" },
      { key: "seizoen",   label: "Dit seizoen", sub: "Wat je nu kunt oogsten" },
      { key: "projecten", label: "Projecten",   sub: "Wandelingen & workshops" },
    ];
    const VALID = new Set(TILES.map((t) => t.key));

    // tegelrij — staat tussen de banner en de sectie-inhoud (vóór #app)
    const tiles = el("nav", { class: "home-tiles", "aria-label": "Kies een onderdeel" },
      TILES.map((t) => el("a", {
        class: "home-tile", href: "#" + t.key, "data-tile": t.key,
        onclick: (e) => { e.preventDefault(); navTo(t.key); },
      }, [
        el("span", { class: "ht-label" }, t.label),
        el("span", { class: "ht-sub" }, t.sub),
      ])));
    app.parentNode.insertBefore(tiles, app);

    function setActive(key) {
      tiles.querySelectorAll(".home-tile").forEach((a) =>
        a.classList.toggle("active", a.getAttribute("data-tile") === key));
      document.querySelectorAll(".nav-links a[data-nav]").forEach((a) =>
        a.classList.toggle("active", a.getAttribute("data-nav") === key));
    }

    // Projecten staat als statische opmaak in projecten.html; haal die op en
    // toon de inhoud in-place (één bron, geen kopie in JS). Resultaat wordt
    // gecachet zodat herhaald openen direct gaat.
    let projectenCache = null;
    async function fetchProjecten() {
      if (projectenCache != null) return projectenCache;
      const res = await fetch("projecten.html", { cache: "no-cache" });
      const doc = new DOMParser().parseFromString(await res.text(), "text/html");
      const src = doc.getElementById("app");
      projectenCache = src ? src.innerHTML : "";
      return projectenCache;
    }
    // Belangrijk: #app pas vervangen als de inhoud klaar is — NIET eerst legen.
    // Anders klapt de pagina in (springt naar boven) en scrollt 'ie daarna pas
    // weer omlaag. De oude sectie blijft staan tot projecten geladen is.
    async function renderProjecten() {
      let html;
      try { html = await fetchProjecten(); }
      catch (e) { html = null; }
      app.innerHTML = html ? html : "<div class='empty'>Kon projecten niet laden.</div>";
    }

    function render(key) {
      if (key === "planten") renderIndex(plants, ctx);
      else if (key === "recepten") renderRecepten(plants, recipes);
      else if (key === "seizoen") renderSeizoen(plants, recipes);
      else if (key === "projecten") return renderProjecten(); // async → promise
    }

    function apply(key, scroll) {
      setActive(key);
      // scroll pas ná render (projecten laadt async; anders scrollt 'ie te vroeg)
      Promise.resolve(render(key)).then(() => {
        if (scroll) tiles.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    function clearSection() {
      setActive(null);
      app.innerHTML = "";
    }

    // hash = enige bron van waarheid; klik zet hash → hashchange → fromHash
    function navTo(key) {
      if (location.hash === "#" + key) apply(key, true); // zelfde sectie opnieuw: scroll erheen
      else location.hash = key;
    }
    function fromHash(scroll) {
      const key = (location.hash || "").replace(/^#/, "");
      if (VALID.has(key)) apply(key, scroll);
      else clearSection();
    }

    window.addEventListener("hashchange", () => fromHash(true));
    fromHash(false); // begintoestand: geen sprong/scroll bij laden
  }

  // ===================================================================
  // PAGE: index (gallery + search + filters)
  // ===================================================================
  function renderIndex(plants, ctx) {
    const root = document.getElementById("app");
    root.innerHTML = "";

    // volgorde: alfabetisch op NL naam; planten zonder afbeelding achteraan
    const heeftFoto = (p) => !!(p.afbeelding && p.afbeelding.trim());
    plants = [...plants].sort((a, b) =>
      (heeftFoto(b) - heeftFoto(a)) || a.naam.localeCompare(b.naam, "nl"));

    // filter state
    const state = { q: "", locatie: null, deel: null, seizoen: null };

    // collect facet values
    const locaties = [...new Set(plants.flatMap((p) => p.locaties || []))].sort();
    const delen = [...new Set(plants.flatMap((p) => p.eetbareDelen || []))].sort();

    const grid = el("div", { class: "grid" });

    function matches(p) {
      const q = state.q.trim().toLowerCase();
      if (q) {
        const hay = (p.naam + " " + p.latijn + " " + (p.familie || "")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (state.locatie && !(p.locaties || []).includes(state.locatie)) return false;
      if (state.deel && !(p.eetbareDelen || []).includes(state.deel)) return false;
      if (state.seizoen) {
        const maanden = SEIZOENEN[state.seizoen].maanden;
        const inSeason = (p.seizoenskalender || []).some((k) => (k.maanden || []).some((m) => maanden.includes(m)));
        if (!inSeason) return false;
      }
      return true;
    }

    // Bouw elke kaart één keer en hergebruik 'm. Filteren/zoeken toont of
    // verbergt kaarten en hermarkeert de tekst in-place — geen innerHTML-reset,
    // dus afbeeldingen herladen niet en het zoeken voelt vloeiend i.p.v. schokkerig.
    const cards = plants.map((p) => {
      const h3 = el("h3");
      const latin = el("span", { class: "latin" });
      const reason = el("div", { class: "match-reason" });
      reason.hidden = true;
      const card = el("a", { class: "card", href: "plant.html?plant=" + encodeURIComponent(p.id) }, [
        el("div", { class: "card-media" }, img(p.afbeelding, p.naam, p.naam)),
        el("div", { class: "card-body card-body--center" }, [h3, latin, reason]),
      ]);
      grid.appendChild(card);
      return { p, card, h3, latin, reason };
    });
    const emptyMsg = el("div", { class: "empty" }, "Geen planten gevonden.");
    emptyMsg.hidden = true;
    grid.appendChild(emptyMsg);

    function setHL(node, text, q) { node.textContent = ""; node.appendChild(highlight(text, q)); }

    function draw() {
      const q = state.q.trim();
      const ql = q.toLowerCase();
      let n = 0;
      cards.forEach((c) => {
        const show = matches(c.p);
        c.card.hidden = !show;
        if (!show) return;
        n++;
        setHL(c.h3, c.p.naam, q);
        setHL(c.latin, c.p.latijn, q);
        const inName = q && (c.p.naam.toLowerCase().includes(ql) || c.p.latijn.toLowerCase().includes(ql));
        const matchFamilie = q && !inName && (c.p.familie || "").toLowerCase().includes(ql);
        c.reason.hidden = !matchFamilie;
        if (matchFamilie) { c.reason.textContent = "↳ Familie: "; c.reason.appendChild(highlight(c.p.familie, q)); }
      });
      emptyMsg.hidden = n > 0;
    }

    // filter UI — chip-groepen in het inklapbare paneel
    function chipGroup(label, values, key, fmt) {
      const chips = el("div", { class: "filter-chips" });
      const render = () => {
        chips.innerHTML = "";
        values.forEach((v) => chips.appendChild(el("button", {
          class: "filter-chip" + (state[key] === v ? " active" : ""),
          onclick: () => { state[key] = state[key] === v ? null : v; refreshAll(); draw(); },
        }, fmt ? fmt(v) : cap(v))));
      };
      return { node: el("div", { class: "filter-group" }, [el("h3", { class: "filter-heading" }, label), chips]), render };
    }
    const gLoc = chipGroup("Locatie", locaties, "locatie", cap);
    const gDeel = chipGroup("Eetbaar deel", delen, "deel", cap);
    const gSeiz = chipGroup("Seizoen", Object.keys(SEIZOENEN), "seizoen", (v) => SEIZOENEN[v].label);

    const clearBtn = el("button", {
      class: "filter-clear",
      onclick: () => { state.locatie = null; state.deel = null; state.seizoen = null; refreshAll(); draw(); },
    }, "Wis filters");

    // filters staan ingeklapt achter één knop (met teller) → planten op de voorgrond
    const countBadge = el("span", { class: "count", hidden: "" }, "0");
    const toggleBtn = el("button", {
      class: "filter-toggle", type: "button", "aria-expanded": "false",
      "aria-controls": "filter-panel", "aria-label": "Filters", title: "Filters",
      onclick: () => {
        const opening = panel.hasAttribute("hidden");
        panel.toggleAttribute("hidden", !opening);
        toggleBtn.setAttribute("aria-expanded", opening ? "true" : "false");
      },
    }, [
      el("span", { class: "filter-toggle-bars", "aria-hidden": "true" }, [el("i"), el("i"), el("i")]),
      countBadge,
    ]);

    function refreshAll() {
      gLoc.render(); gDeel.render(); gSeiz.render();
      const n = (state.locatie ? 1 : 0) + (state.deel ? 1 : 0) + (state.seizoen ? 1 : 0);
      clearBtn.disabled = !n;
      countBadge.textContent = String(n);
      countBadge.hidden = n === 0;
    }
    refreshAll();

    const panel = el("aside", { class: "filter-panel", id: "filter-panel", hidden: "" }, [
      el("div", { class: "filter-panel-head" }, [el("span", { class: "filter-heading" }, "Verfijnen"), clearBtn]),
      el("div", { class: "filter-panel-inner" }, [gLoc.node, gDeel.node, gSeiz.node]),
    ]);
    // zoekveld hoort bij de planten-galerij zelf (staat links in de filter-balk)
    const searchInput = el("input", {
      type: "search", class: "plant-search", placeholder: "Zoek plant…",
      "aria-label": "Zoek plant", value: state.q,
    });
    searchInput.oninput = function () { state.q = this.value; draw(); };

    root.appendChild(el("div", { class: "container" }, [
      el("div", { class: "filter-bar" }, [searchInput, toggleBtn]),
      panel,
      grid,
    ]));
    draw();
  }

  // ===================================================================
  // PAGE: plant detail
  // ===================================================================
  function monthBar(maanden) {
    const bar = el("div", { class: "seasonbar" });
    for (let m = 1; m <= 12; m++) {
      bar.appendChild(el("span", { class: "month" + ((maanden || []).includes(m) ? " on" : "") }, MAAND_KORT[m - 1]));
    }
    return bar;
  }

  function renderPlant(plants, recipes) {
    const root = document.getElementById("app");
    root.innerHTML = "";
    const params = new URLSearchParams(location.search);
    const p = byId(plants)[params.get("plant")];
    if (!p) {
      root.appendChild(el("div", { class: "detail" }, [
        el("h1", null, "Plant niet gevonden"),
        el("a", { class: "back-link", href: "index.html#planten" }, "← Terug naar overzicht"),
      ]));
      document.title = "Plant niet gevonden — HerbalPlantsMar";
      return;
    }
    document.title = p.naam + " — HerbalPlantsMar";

    const wrap = el("div", { class: "detail" });

    if (p.status !== "verified") {
      wrap.appendChild(safetyBanner(
        "deze plantbeschrijving is nog <strong>concept</strong> en nog niet door ons geverifieerd. Controleer altijd zelf bij meerdere betrouwbare bronnen vóór je iets eet."));
    }

    // top: image + head + meta
    const meta = el("ul", { class: "meta-list" });
    const metaRow = (k, v) => v ? meta.appendChild(el("li", null, [el("span", { class: "k" }, k), document.createTextNode(v)])) : null;
    metaRow("Familie", p.familie);
    if (p.ecosysteem) meta.appendChild(el("li", null, [
      el("span", { class: "k" }, "Ecosysteem"), citeFrag(p.ecosysteem, p.bronnen, p.id),
    ]));
    if ((p.locaties || []).length) meta.appendChild(el("li", null, [
      el("span", { class: "k" }, "Waar te vinden"),
      el("span", { class: "chip-row" }, p.locaties.map((l) => chip(cap(l)))),
    ]));
    if ((p.eetbareDelen || []).length) meta.appendChild(el("li", null, [
      el("span", { class: "k" }, "Eetbare delen"),
      el("span", { class: "chip-row" }, p.eetbareDelen.map((d) => chip(cap(d), "part"))),
    ]));
    if ((p.oogstbareDelen || []).length) meta.appendChild(el("li", null, [
      el("span", { class: "k" }, "Oogstbare delen"),
      el("span", { class: "chip-row" }, p.oogstbareDelen.map((d) => chip(cap(d), "part"))),
    ]));

    wrap.appendChild(el("div", { class: "detail-top" }, [
      el("div", { class: "detail-hero" }, img(p.afbeelding, p.naam, p.naam)),
      el("div", { class: "detail-head" }, [
        el("h1", null, p.naam),
        el("div", { class: "latin" }, p.latijn),
        el("div", { style: "margin-top:8px" }, draftBadge(p.status)),
        meta,
      ]),
    ]));

    const section = (title, body, cls) => {
      if (!body) return;
      const s = el("div", { class: "detail-section" }, el("h2", null, title));
      if (typeof body === "string") s.appendChild(citeNode(cls ? "div" : "p", cls || "", body, p.bronnen, p.id));
      else s.appendChild(body);
      wrap.appendChild(s);
    };

    section("Wat kan ik ermee?", p.gebruik);
    if (p.recept) section("Recept", el("p", null, p.recept));
    section("Informatie", p.info);

    // seasonal calendar
    if ((p.seizoenskalender || []).length) {
      const cal = el("div", null);
      p.seizoenskalender.forEach((k) => {
        let toep = null;
        if (k.toepassing) {
          toep = el("span", { class: "toep" });
          toep.appendChild(document.createTextNode(" — "));
          toep.appendChild(citeFrag(k.toepassing, p.bronnen, p.id));
        }
        cal.appendChild(el("div", { class: "kalender-row" }, [
          el("div", null, [el("span", { class: "deel" }, cap(k.deel)), toep]),
          monthBar(k.maanden),
        ]));
      });
      section("Seizoenskalender", cal);
    }

    section("Hoe oogst je het?", p.oogstmethode);
    section("Wildpluk & duurzaamheid", p.wildplukGevolgen);

    // giftige verwisselingen — structured list (with string fallback)
    (function () {
      const gv = p.giftigeVerwisseling;
      if (typeof gv === "string") {
        if (gv) section("Giftige verwisselingen", citeNode("div", "callout", gv, p.bronnen, p.id));
        return;
      }
      if (!Array.isArray(gv) || (!gv.length && !p.verwisselingIntro)) return;
      const wrap = el("div");
      if (p.verwisselingIntro) wrap.appendChild(citeNode("p", "verw-intro", p.verwisselingIntro, p.bronnen, p.id));
      if (gv.length) {
        const list = el("div", { class: "lookalike-list" });
        gv.forEach((l) => {
          const badge = l.giftig
            ? el("span", { class: "badge-giftig" }, "giftig")
            : el("span", { class: "badge-veilig" }, "niet giftig");
          list.appendChild(el("div", { class: "lookalike" + (l.giftig ? " danger" : "") }, [
            el("div", { class: "lookalike-head" }, [
              el("span", { class: "lookalike-naam" }, l.naam),
              l.latijn ? el("span", { class: "lookalike-latijn" }, l.latijn) : null,
              badge,
            ]),
            l.onderscheid ? citeNode("p", "lookalike-onderscheid", l.onderscheid, p.bronnen, p.id) : null,
          ]));
        });
        wrap.appendChild(list);
      }
      section("Giftige verwisselingen", wrap);
    })();

    if (p.waarschuwing) section("Waarschuwing", citeNode("div", "callout warn", p.waarschuwing, p.bronnen, p.id));

    // related recipes
    const rel = (recipes || []).filter((r) => (r.planten || []).includes(p.id));
    if (rel.length) {
      const list = el("ul", null, rel.map((r) =>
        el("li", null, el("a", { href: "recepten.html?recept=" + encodeURIComponent(r.id) }, r.titel))));
      section("Recepten met " + p.naam.toLowerCase(), list);
    }

    // extra images
    if ((p.afbeeldingen || []).length) {
      const gal = el("div", { class: "extra-gallery" }, p.afbeeldingen.map((src) => img(src, p.naam, p.naam)));
      section("Meer foto's", gal);
    }

    // sources — numbered notes list; [n] markers in the prose link here
    if ((p.bronnen || []).length) {
      const ol = el("ol", { class: "notes-list" }, p.bronnen.map((u, i) =>
        el("li", { id: "fn-" + p.id + "-" + (i + 1) },
          el("a", { href: u, target: "_blank", rel: "noopener", title: u }, srcHost(u)))));
      wrap.appendChild(el("div", { class: "detail-section notes" }, [
        el("h2", null, "Bronnen"),
        el("p", { class: "notes-lead" }, "De cijfers in de tekst verwijzen naar deze bronnen."),
        ol,
      ]));
    }

    wrap.appendChild(el("a", { class: "back-link", href: "index.html#planten" }, "← Terug naar overzicht"));
    root.appendChild(wrap);
  }

  // ===================================================================
  // PAGE: recepten (recipe list, recipe -> plants)
  // ===================================================================
  // recipe photo: explicit field, else the first linked plant's image (img() self-heals to placeholder)
  function receptFoto(r, map) {
    return r.afbeelding || (map[(r.planten || [])[0]] || {}).afbeelding;
  }

  function renderRecepten(plants, recipes) {
    const root = document.getElementById("app");
    root.innerHTML = "";
    const map = byId(plants);

    // ?recept=<id> → toon het volledige recept i.p.v. de tegel-galerij
    const rid = new URLSearchParams(location.search).get("recept");
    if (rid) { renderReceptDetail(rid, recipes, map); return; }

    const state = { seizoen: null };

    const filters = el("div", { class: "filters" });
    const drawFilters = () => {
      filters.innerHTML = "";
      filters.appendChild(el("span", { class: "filter-chip", style: "background:transparent;border:none;color:#6b7268;cursor:default;" }, "Seizoen:"));
      Object.keys(SEIZOENEN).forEach((s) => filters.appendChild(el("button", {
        class: "filter-chip" + (state.seizoen === s ? " active" : ""),
        onclick: () => { state.seizoen = state.seizoen === s ? null : s; drawFilters(); draw(); },
      }, SEIZOENEN[s].label)));
    };

    // zelfde tegel-format als de planten: foto + titel, 3 naast elkaar
    const grid = el("div", { class: "grid" });
    // zelfde ordening als de planten: op titel (NL), recepten zonder foto achteraan
    const heeftFoto = (r) => { const f = receptFoto(r, map); return !!(f && f.trim()); };
    function draw() {
      grid.innerHTML = "";
      const list = (recipes || []).filter((r) => !state.seizoen || (r.seizoenen || []).includes(state.seizoen))
        .sort((a, b) => (heeftFoto(b) - heeftFoto(a)) || a.titel.localeCompare(b.titel, "nl"));
      if (!list.length) { grid.appendChild(el("div", { class: "empty" }, "Geen recepten voor dit seizoen.")); return; }
      list.forEach((r) => {
        const chips = (r.seizoenen || []).map((s) => chip(SEIZOENEN[s] ? SEIZOENEN[s].label : s, "season"));
        if (r.status && r.status !== "verified") chips.push(draftBadge(r.status));
        grid.appendChild(el("a", { class: "card", href: "recepten.html?recept=" + encodeURIComponent(r.id) }, [
          el("div", { class: "card-media" }, img(receptFoto(r, map), r.titel, r.titel)),
          el("div", { class: "card-body" }, [
            el("h3", null, r.titel),
            el("div", { class: "card-chips" }, chips),
          ]),
        ]));
      });
    }

    drawFilters();
    root.appendChild(el("div", { class: "container" }, [filters, grid]));
    draw();
  }

  // full recipe page (recepten.html?recept=<id>)
  function renderReceptDetail(rid, recipes, map) {
    const root = document.getElementById("app");
    root.innerHTML = "";
    const r = (recipes || []).find((x) => x.id === rid);
    if (!r) {
      root.appendChild(el("div", { class: "detail" }, [
        el("h1", null, "Recept niet gevonden"),
        el("a", { class: "back-link", href: "index.html#recepten" }, "← Terug naar recepten"),
      ]));
      document.title = "Recept niet gevonden — HerbalPlantsMar";
      return;
    }
    document.title = r.titel + " — HerbalPlantsMar";

    const head = el("div", { class: "detail-head" }, [
      el("h1", null, r.titel),
      el("div", { class: "chip-row", style: "margin-top:8px" }, [
        ...(r.seizoenen || []).map((s) => chip(SEIZOENEN[s] ? SEIZOENEN[s].label : s, "season")),
        r.status && r.status !== "verified" ? draftBadge(r.status) : null,
      ]),
    ]);
    const meta = el("ul", { class: "meta-list" });
    if ((r.planten || []).length) meta.appendChild(el("li", null, [
      el("span", { class: "k" }, "Planten"),
      el("span", { class: "chip-row" }, r.planten.map((id) =>
        el("a", { class: "chip", href: "plant.html?plant=" + encodeURIComponent(id), style: "text-decoration:none" },
          map[id] ? map[id].naam : id))),
    ]));
    if ((r.andereIngredienten || []).length) meta.appendChild(el("li", null, [
      el("span", { class: "k" }, "Verder nodig"),
      document.createTextNode(r.andereIngredienten.join(", ")),
    ]));
    head.appendChild(meta);

    const wrap = el("div", { class: "detail" }, [
      el("div", { class: "detail-top" }, [
        el("div", { class: "detail-hero" }, img(receptFoto(r, map), r.titel, r.titel)),
        head,
      ]),
    ]);

    if (r.bereiding) wrap.appendChild(el("div", { class: "detail-section" }, [
      el("h2", null, "Bereiding"),
      el("div", { class: "recipe-body" }, r.bereiding),
    ]));
    if (r.bron) wrap.appendChild(el("div", { class: "detail-section" },
      el("div", { class: "sources" }, "Bron: " + r.bron)));

    wrap.appendChild(el("a", { class: "back-link", href: "index.html#recepten" }, "← Terug naar recepten"));
    root.appendChild(wrap);
  }

  // ===================================================================
  // PAGE: dit seizoen
  // ===================================================================
  function renderSeizoen(plants, recipes) {
    const root = document.getElementById("app");
    root.innerHTML = "";
    const now = new Date();
    const m = now.getMonth() + 1;
    const seizoen = seizoenVanMaand(m);

    root.appendChild(el("div", { class: "container season-head" }, [
      el("div", { class: "season-pill" }, SEIZOENEN[seizoen].label + " · " + MAAND_LANG[m - 1]),
      el("p", { class: "section-lead" }, "Dit kun je nu in de natuur vinden en oogsten."),
    ]));

    // plants harvestable this month
    const nu = [];
    plants.forEach((p) => {
      const delenNu = (p.seizoenskalender || []).filter((k) => (k.maanden || []).includes(m));
      if (delenNu.length) nu.push({ p, delenNu });
    });
    // zelfde ordening als de planten-galerij: op naam (NL), zonder foto achteraan
    const heeftFoto = (p) => !!(p.afbeelding && p.afbeelding.trim());
    nu.sort((a, b) => (heeftFoto(b.p) - heeftFoto(a.p)) || a.p.naam.localeCompare(b.p.naam, "nl"));

    const grid = el("div", { class: "grid" });
    if (!nu.length) grid.appendChild(el("div", { class: "empty" }, "Nog geen seizoensdata. Voeg seizoenskalenders toe via admin."));
    nu.forEach(({ p }) => {
      // zelfde kaart als de planten-galerij: foto + naam + latijn, gecentreerd
      grid.appendChild(el("a", { class: "card", href: "plant.html?plant=" + encodeURIComponent(p.id) }, [
        el("div", { class: "card-media" }, img(p.afbeelding, p.naam, p.naam)),
        el("div", { class: "card-body card-body--center" }, [
          el("h3", null, p.naam),
          el("span", { class: "latin" }, p.latijn),
        ]),
      ]));
    });
    root.appendChild(el("div", { class: "container" }, el("h2", { class: "section-title" }, "Nu te oogsten")));
    root.appendChild(el("div", { class: "container" }, grid));

    // recipes for this season
    const recs = (recipes || []).filter((r) => (r.seizoenen || []).includes(seizoen));
    if (recs.length) {
      root.appendChild(el("div", { class: "container" }, el("h2", { class: "section-title", style: "margin-top:40px" }, "Recepten voor nu")));
      const stack = el("div", { class: "stack" }, recs.map((r) =>
        el("a", { class: "recipe-card", href: "recepten.html?recept=" + encodeURIComponent(r.id), style: "text-decoration:none;color:inherit;display:block" }, [
          el("h3", null, r.titel),
          el("div", { class: "plants-needed" }, "Met: " + (r.planten || []).map((id) => (byId(plants)[id] || {}).naam || id).join(", ")),
        ])));
      root.appendChild(el("div", { class: "container" }, stack));
    }
  }

  // ===================================================================
  // PAGE: admin (generate JSON, no coding)
  // ===================================================================
  function renderAdmin() {
    const root = document.getElementById("app");
    root.innerHTML = "";
    const wrap = el("div", { class: "admin-wrap" });
    wrap.appendChild(el("p", { class: "section-lead" },
      "Vul de velden in en klik op ‘Genereer JSON’. Kopieer het blok in data/plants.json (of download het) en commit het naar de repo. Geen code nodig."));
    wrap.appendChild(el("p", { class: "hint" },
      "Bronvermelding: zet in de lopende tekst een voetnoot [n] direct achter een bewering — n is het nummer van de bron (1 = eerste URL in ‘Bronnen’, 2 = tweede, enz.). Meerdere bronnen: [2,5]. Voorbeeld: \"…veel silicium[2], traditioneel…\". De cijfers worden op de plantpagina superscriptjes die naar de genummerde bronnenlijst linken."));

    const f = {};
    function field(key, label, hint, type) {
      wrap.appendChild(el("label", null, [label, hint ? el("span", { class: "hint" }, " — " + hint) : null]));
      const input = type === "area" ? el("textarea", {}) : el("input", { type: "text" });
      f[key] = input; wrap.appendChild(input); return input;
    }
    field("id", "id", "kleine letters, geen spaties, bijv. brandnetel");
    field("naam", "Naam", "bijv. Brandnetel");
    field("latijn", "Latijnse naam", "bijv. Urtica dioica");
    field("familie", "Familie", "bijv. Brandnetelfamilie (Urticaceae)");
    field("afbeelding", "Hoofdafbeelding", "pad, bijv. Afbeeldingen/IMG_7433.jpg");
    field("afbeeldingen", "Extra afbeeldingen", "paden, komma-gescheiden");
    field("ecosysteem", "Ecosysteem", null, "area");
    field("locaties", "Locaties", "komma-gescheiden: bos, stad, langs de weg…");
    field("eetbareDelen", "Eetbare delen", "komma-gescheiden: blad, bloem, wortel…");
    field("oogstbareDelen", "Oogstbare delen", "komma-gescheiden");
    field("gebruik", "Wat kan ik ermee?", null, "area");
    field("recept", "Recept / bereiding", null, "area");
    field("info", "Informatie", null, "area");
    field("oogstmethode", "Hoe oogsten", null, "area");
    field("wildplukGevolgen", "Wildpluk & duurzaamheid", null, "area");
    field("verwisselingIntro", "Verwisselingen — algemene opmerking", "optioneel, leeg laten mag", "area");
    field("giftigeVerwisseling", "Giftige verwisselingen (lijst)", "één per regel: naam | latijn | giftig(ja/nee) | onderscheid", "area");
    field("waarschuwing", "Waarschuwing", null, "area");
    field("seizoenskalender", "Seizoenskalender", "regels: deel | maandnummers (1-12) | toepassing", "area");
    field("bronnen", "Bronnen", "URL's, komma-gescheiden — volgorde = voetnootnummers ([1]=eerste, [2]=tweede…)");

    const out = el("textarea", { class: "admin-out", readonly: "readonly" });
    const list = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

    function build() {
      const kalender = (f.seizoenskalender.value || "").split("\n").map((line) => {
        const parts = line.split("|").map((x) => x.trim());
        if (parts.length < 2 || !parts[0]) return null;
        return { deel: parts[0], maanden: list(parts[1]).map(Number).filter((n) => n >= 1 && n <= 12), toepassing: parts[2] || "" };
      }).filter(Boolean);
      const verwisselingen = (f.giftigeVerwisseling.value || "").split("\n").map((line) => {
        const parts = line.split("|").map((x) => x.trim());
        if (!parts[0]) return null;
        return { naam: parts[0], latijn: parts[1] || "", giftig: /^(ja|j|true|giftig)$/i.test(parts[2] || ""), onderscheid: parts[3] || "" };
      }).filter(Boolean);
      const obj = {
        id: f.id.value.trim(),
        naam: f.naam.value.trim(),
        latijn: f.latijn.value.trim(),
        familie: f.familie.value.trim(),
        afbeelding: f.afbeelding.value.trim(),
        afbeeldingen: list(f.afbeeldingen.value),
        ecosysteem: f.ecosysteem.value.trim(),
        locaties: list(f.locaties.value),
        eetbareDelen: list(f.eetbareDelen.value),
        oogstbareDelen: list(f.oogstbareDelen.value),
        seizoenskalender: kalender,
        oogstmethode: f.oogstmethode.value.trim(),
        wildplukGevolgen: f.wildplukGevolgen.value.trim(),
        verwisselingIntro: f.verwisselingIntro.value.trim(),
        giftigeVerwisseling: verwisselingen,
        waarschuwing: f.waarschuwing.value.trim(),
        gebruik: f.gebruik.value.trim(),
        recept: f.recept.value.trim(),
        info: f.info.value.trim(),
        bronnen: list(f.bronnen.value),
        status: "draft",
      };
      out.value = JSON.stringify(obj, null, 2);
    }

    const actions = el("div", { class: "admin-actions" }, [
      el("button", { class: "btn", onclick: build }, "Genereer JSON"),
      el("button", { class: "btn ghost", onclick: () => { if (out.value) { navigator.clipboard.writeText(out.value); } } }, "Kopieer"),
      el("button", { class: "btn ghost", onclick: () => {
        if (!out.value) build();
        const blob = new Blob([out.value], { type: "application/json" });
        const a = el("a", { href: URL.createObjectURL(blob), download: (f.id.value.trim() || "plant") + ".json" });
        document.body.appendChild(a); a.click(); a.remove();
      } }, "Download .json"),
    ]);
    wrap.appendChild(actions);
    wrap.appendChild(out);
    root.appendChild(wrap);
  }

  // ===================================================================
  // boot
  // ===================================================================
  async function boot() {
    const page = document.body.dataset.page || "index";
    const ctx = buildHeader(page);
    buildFooter();
    buildThemePanel();
    const app = document.getElementById("app");

    if (page === "admin") { renderAdmin(); return; }
    if (page === "over" || page === "signup" || page === "diner" || page === "projecten") return; // static pages

    if (app) app.appendChild(el("div", { class: "loading" }, "Laden…"));
    try {
      const { plants, recipes } = await loadData();
      if (page === "home") renderHome(plants, recipes, ctx);
      else if (page === "index") renderIndex(plants, ctx);
      else if (page === "plant") renderPlant(plants, recipes);
      else if (page === "recepten") renderRecepten(plants, recipes);
      else if (page === "seizoen") renderSeizoen(plants, recipes);
    } catch (e) {
      if (app) app.innerHTML = "";
      if (app) app.appendChild(el("div", { class: "empty" }, "Kon gegevens niet laden: " + e.message));
      console.error(e);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
