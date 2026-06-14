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

  // ---------- shared chrome (nav + footer) ----------
  function buildHeader(page) {
    const links = [
      ["index.html", "Planten", "index"],
      ["recepten.html", "Recepten", "recepten"],
      ["seizoen.html", "Dit seizoen", "seizoen"],
      ["over.html", "Over", "over"],
      ["sign-up.html", "Diner", "signup"],
    ];
    const ul = el("ul", { class: "nav-links" },
      links.map(([href, label, key]) =>
        el("li", null, el("a", { href, class: page === key ? "active" : "" }, label))));
    const search = el("input", {
      type: "text", class: "nav-search", id: "nav-search",
      placeholder: "Zoek plant…", "aria-label": "Zoek plant",
    });
    const inner = el("div", { class: "nav-inner" }, [
      el("a", { href: "index.html", class: "nav-brand", html: "HERBAL<span>PLANTS</span>MAR" }),
      ul, search,
    ]);
    const header = document.getElementById("site-header") || el("header", { id: "site-header" });
    header.className = "site-header";
    header.innerHTML = "";
    header.appendChild(inner);
    if (!header.parentNode) document.body.insertBefore(header, document.body.firstChild);
    // search only active on the gallery page
    if (page !== "index") search.style.display = "none";
    return { search };
  }

  function buildFooter() {
    const f = document.getElementById("site-footer") || el("footer", { id: "site-footer" });
    f.className = "site-footer";
    f.innerHTML =
      "🌿 <strong>HerbalPlantsMar</strong> — wilde & kruidige planten, recepten en seizoen.<br>" +
      "Eet nooit een plant zonder 100% zekere determinatie. Informatie op deze site is educatief, geen medisch advies.";
    if (!f.parentNode) document.body.appendChild(f);
  }

  function safetyBanner(text) {
    return el("div", { class: "safety", html:
      "⚠️ <strong>Let op:</strong> " + text });
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
      ? el("span", { class: "badge-verified", text: "✓ gecontroleerd" })
      : el("span", { class: "badge-draft", text: "concept — nog controleren" });
  }

  // ===================================================================
  // PAGE: index (gallery + search + filters)
  // ===================================================================
  function renderIndex(plants, ctx) {
    const root = document.getElementById("app");
    root.innerHTML = "";

    const anyDraft = plants.some((p) => p.status !== "verified");
    if (anyDraft) root.appendChild(safetyBanner(
      "een deel van de planteninformatie is nog concept en wordt nog door ons nagekeken. Vertrouw nooit blind op één bron bij het wildplukken."));

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

    function draw() {
      grid.innerHTML = "";
      const list = plants.filter(matches);
      if (!list.length) { grid.appendChild(el("div", { class: "empty" }, "Geen planten gevonden.")); return; }
      const q = state.q.trim();
      const ql = q.toLowerCase();
      list.forEach((p) => {
        const inName = q && (p.naam.toLowerCase().includes(ql) || p.latijn.toLowerCase().includes(ql));
        const matchFamilie = q && !inName && (p.familie || "").toLowerCase().includes(ql);
        const body = [
          el("h3", null, highlight(p.naam, q)),
          el("span", { class: "latin" }, highlight(p.latijn, q)),
        ];
        if (matchFamilie) body.push(el("div", { class: "match-reason" }, ["↳ Familie: ", highlight(p.familie, q)]));
        body.push(el("div", { class: "card-chips" }, (p.eetbareDelen || []).slice(0, 3).map((d) => chip(d, "part"))));
        const card = el("a", { class: "card", href: "plant.html?plant=" + encodeURIComponent(p.id) }, [
          el("div", { class: "card-media" }, img(p.afbeelding, p.naam, p.naam)),
          el("div", { class: "card-body" }, body),
        ]);
        grid.appendChild(card);
      });
    }

    // filter UI — left sidebar
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
    function refreshAll() {
      gLoc.render(); gDeel.render(); gSeiz.render();
      clearBtn.disabled = !(state.locatie || state.deel || state.seizoen);
    }
    refreshAll();

    const panel = el("aside", { class: "filter-panel" }, [
      el("div", { class: "filter-panel-head" }, [el("h2", null, "Filters"), clearBtn]),
      gLoc.node, gDeel.node, gSeiz.node,
    ]);
    root.appendChild(el("div", { class: "container index-layout" }, [
      panel,
      el("div", { class: "index-main" }, grid),
    ]));
    draw();

    // wire search box in nav
    if (ctx.search) ctx.search.addEventListener("input", function () { state.q = this.value; draw(); });
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
        el("a", { class: "back-link", href: "index.html" }, "← Terug naar overzicht"),
      ]));
      document.title = "Plant niet gevonden — HerbalPlantsMar";
      return;
    }
    document.title = p.naam + " — HerbalPlantsMar";

    const wrap = el("div", { class: "detail" });

    if (p.status !== "verified") {
      wrap.appendChild(safetyBanner(
        "deze plantbeschrijving is nog <strong>concept</strong> (door Claude opgesteld, nog niet door ons geverifieerd). Controleer altijd zelf bij meerdere betrouwbare bronnen vóór je iets eet."));
    }

    // top: image + head + meta
    const meta = el("ul", { class: "meta-list" });
    const metaRow = (k, v) => v ? meta.appendChild(el("li", null, [el("span", { class: "k" }, k), document.createTextNode(v)])) : null;
    metaRow("Familie", p.familie);
    metaRow("Ecosysteem", p.ecosysteem);
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
      if (typeof body === "string") s.appendChild(el(cls ? "div" : "p", { class: cls || "" }, body));
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
        cal.appendChild(el("div", { class: "kalender-row" }, [
          el("div", null, [el("span", { class: "deel" }, cap(k.deel)), k.toepassing ? el("span", { class: "toep" }, " — " + k.toepassing) : null]),
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
        if (gv) section("Giftige verwisselingen", el("div", { class: "callout" }, gv));
        return;
      }
      if (!Array.isArray(gv) || (!gv.length && !p.verwisselingIntro)) return;
      const wrap = el("div");
      if (p.verwisselingIntro) wrap.appendChild(el("p", { class: "verw-intro" }, p.verwisselingIntro));
      if (gv.length) {
        const list = el("div", { class: "lookalike-list" });
        gv.forEach((l) => {
          const badge = l.giftig
            ? el("span", { class: "badge-giftig" }, "⚠ giftig")
            : el("span", { class: "badge-veilig" }, "niet giftig");
          list.appendChild(el("div", { class: "lookalike" + (l.giftig ? " danger" : "") }, [
            el("div", { class: "lookalike-head" }, [
              el("span", { class: "lookalike-naam" }, l.naam),
              l.latijn ? el("span", { class: "lookalike-latijn" }, l.latijn) : null,
              badge,
            ]),
            l.onderscheid ? el("p", { class: "lookalike-onderscheid" }, l.onderscheid) : null,
          ]));
        });
        wrap.appendChild(list);
      }
      section("Giftige verwisselingen", wrap);
    })();

    if (p.waarschuwing) section("Waarschuwing", el("div", { class: "callout warn" }, p.waarschuwing));

    // related recipes
    const rel = (recipes || []).filter((r) => (r.planten || []).includes(p.id));
    if (rel.length) {
      const list = el("ul", null, rel.map((r) =>
        el("li", null, el("a", { href: "recepten.html#" + r.id }, r.titel))));
      section("Recepten met " + p.naam.toLowerCase(), list);
    }

    // extra images
    if ((p.afbeeldingen || []).length) {
      const gal = el("div", { class: "extra-gallery" }, p.afbeeldingen.map((src) => img(src, p.naam, p.naam)));
      section("Meer foto's", gal);
    }

    // sources
    if ((p.bronnen || []).length) {
      const src = el("div", { class: "sources" }, [
        document.createTextNode("Bronnen: "),
        ...p.bronnen.map((u, i) => el("a", { href: u, target: "_blank", rel: "noopener" }, (i ? " · " : "") + new URL(u, location.href).hostname.replace("www.", ""))),
      ]);
      wrap.appendChild(src);
    }

    wrap.appendChild(el("a", { class: "back-link", href: "index.html" }, "← Terug naar overzicht"));
    root.appendChild(wrap);
  }

  // ===================================================================
  // PAGE: recepten (recipe list, recipe -> plants)
  // ===================================================================
  function renderRecepten(plants, recipes) {
    const root = document.getElementById("app");
    root.innerHTML = "";
    const map = byId(plants);
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
    const stack = el("div", { class: "stack" });

    function draw() {
      stack.innerHTML = "";
      const list = (recipes || []).filter((r) => !state.seizoen || (r.seizoenen || []).includes(state.seizoen));
      if (!list.length) { stack.appendChild(el("div", { class: "empty" }, "Geen recepten voor dit seizoen.")); return; }
      list.forEach((r) => {
        const card = el("div", { class: "recipe-card", id: r.id }, [
          el("h3", null, r.titel),
          el("div", { class: "recipe-meta" }, [
            ...(r.seizoenen || []).map((s) => chip(SEIZOENEN[s] ? SEIZOENEN[s].label : s, "season")),
            r.status && r.status !== "verified" ? draftBadge(r.status) : null,
          ]),
          el("div", { class: "plants-needed" }, [
            el("strong", null, "Planten nodig: "),
            ...(r.planten || []).map((id, i) => {
              const pl = map[id];
              return el("a", { href: "plant.html?plant=" + encodeURIComponent(id) }, (i ? ", " : "") + (pl ? pl.naam : id));
            }),
            (r.andereIngredienten || []).length ? el("div", { style: "color:#6b7268;font-size:13px;margin-top:4px" }, "Verder: " + r.andereIngredienten.join(", ")) : null,
          ]),
          el("div", { class: "recipe-body", style: "margin-top:10px" }, r.bereiding || ""),
          r.bron ? el("div", { class: "sources" }, "Bron: " + r.bron) : null,
        ]);
        stack.appendChild(card);
      });
      if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
    }

    drawFilters();
    root.appendChild(el("div", { class: "container" }, [filters, stack]));
    draw();
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

    const grid = el("div", { class: "grid" });
    if (!nu.length) grid.appendChild(el("div", { class: "empty" }, "Nog geen seizoensdata. Voeg seizoenskalenders toe via admin."));
    nu.forEach(({ p, delenNu }) => {
      grid.appendChild(el("a", { class: "card", href: "plant.html?plant=" + encodeURIComponent(p.id) }, [
        el("div", { class: "card-media" }, img(p.afbeelding, p.naam, p.naam)),
        el("div", { class: "card-body" }, [
          el("h3", null, p.naam),
          el("span", { class: "latin" }, p.latijn),
          el("div", { class: "card-chips" }, delenNu.map((k) => chip(cap(k.deel), "season"))),
          el("div", { style: "font-size:13px;color:#6b7268;margin-top:6px" }, delenNu.map((k) => k.toepassing).filter(Boolean).join(" · ")),
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
        el("a", { class: "recipe-card", href: "recepten.html#" + r.id, style: "text-decoration:none;color:inherit;display:block" }, [
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
    field("bronnen", "Bronnen", "URL's, komma-gescheiden");

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
    const app = document.getElementById("app");

    if (page === "admin") { renderAdmin(); return; }
    if (page === "over" || page === "signup" || page === "diner") return; // static pages

    if (app) app.appendChild(el("div", { class: "loading" }, "Laden…"));
    try {
      const { plants, recipes } = await loadData();
      if (page === "index") renderIndex(plants, ctx);
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
