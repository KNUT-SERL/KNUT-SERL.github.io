/* ============================================================
   사이트 검색 — 내비 🔍 버튼 · Ctrl+K · '/' 로 열기, × 버튼 · Esc · 바깥 클릭으로 닫기
   서버 없이 브라우저 안에서 동작합니다. 처음 검색할 때 사이트의 콘텐츠 파일
   (구성원·연구·뉴스·상장·특허·갤러리·고정 페이지)을 읽어 색인을 만들고,
   논문은 OpenAlex 에서 실시간으로 함께 찾습니다.
   결과를 누르면 해당 페이지의 그 항목으로 이동해 펼치고 강조합니다
   (이동·강조 처리는 js/common.js 의 initGoTo).
   ============================================================ */
"use strict";
(function () {
  const PAGE_OF = { PHD: "students-phd.html", DR: "students-phd.html", DRMS: "students-phd.html",
                    MS: "students-ms.html", MSBS: "students-ms.html",
                    BS: "students-bs.html", INT: "students-bs.html", ALU: "alumni.html" };
  const GROUPS = [["member", "Members"], ["research", "Research"], ["news", "News"], ["award", "Awards"],
                  ["patent", "Patents"], ["pub", "Publications"], ["gallery", "Gallery"], ["page", "Pages"]];
  const STATIC_PAGES = [["index.html", "Home"], ["professor.html", "Professor"], ["contact.html", "Contact"]];
  // 안내 문구: 1줄 안내 + 2줄 검색 대상 목록 (목록은 항상 새 줄에서 시작)
  const HINT = `<div class="search-hint">Type a keyword or sentence<span class="kw">members · research · news · awards · patents · publications · gallery</span></div>`;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const strip = s => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  /* ---- 색인 만들기: content.js 의 로더를 그대로 재사용 ---- */
  let index = null, building = null;
  async function build() {
    const entries = [];
    const add = (type, title, text, page, id) =>
      entries.push({ type, title: strip(title), text: strip(text), url: id ? `${page}?go=${encodeURIComponent(id)}` : page });
    const jobs = [
      loadMembers().then(groups => {
        for (const [prefix, list] of Object.entries(groups)) for (const m of list)
          add("member", m.name + (m.kor ? ` (${m.kor})` : ""),
              [m.role, m.degree, m.now, m.interests, m.bio, ...(m.pubs || []), ...(m.patents || []),
               ...(m.awards || []), ...(m.tags || []), m.email].filter(Boolean).join(" · "),
              PAGE_OF[prefix] || "professor.html", m.base);
      }),
      loadResearch().then(l => l.forEach(r => add("research", r.title, r.desc, "research.html", r.base))),
      loadNews().then(l => l.forEach(n => add("news", n.title, [n.date, n.text, n.body].filter(Boolean).join(" · "), "news.html", newsId(n)))),
      loadAwards().then(by => { for (const [y, list] of Object.entries(by)) list.forEach(a => add("award", a.title, y, "news.html", awardId(a))); }),
      loadPatents().then(l => l.forEach(p => add("patent", p.title,
        [p.year, p.inventors, p.number, p.country, ...(p.badges || [])].filter(Boolean).join(" · "), "publications.html", "pat-" + p.no))),
      loadGallery().then(l => l.forEach(g => add("gallery", g.title, [g.year, g.titleEn, g.images.length ? `${g.images.length} photos` : ""].filter(Boolean).join(" · "), "gallery.html", g.base))),
      ...STATIC_PAGES.map(([file, label]) => fetch(file, { cache: "no-cache" }).then(r => r.text()).then(html => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        doc.querySelectorAll("section").forEach(sec => {
          if (sec.classList.contains("pagehead") || sec.querySelector("[id]")) return;   // 제목 띠·동적 영역 제외
          const h = sec.querySelector("h1, h2, h3"), text = strip(sec.textContent);
          if (text.length > 20) add("page", h ? `${label} — ${strip(h.textContent)}` : label, text, file, null);
        });
      }))
    ];
    await Promise.allSettled(jobs);
    return entries;
  }

  /* ---- 논문: OpenAlex 실시간 검색 (실패하면 조용히 생략) ---- */
  async function searchPubs(q) {
    const cfg = window.SITE?.pub;
    if (!cfg) return [];
    try {
      const r = await fetch(`https://api.openalex.org/works?filter=authorships.author.id:${cfg.authorId},default.search:${encodeURIComponent(q)}` +
        `&per-page=6&select=display_name,doi,publication_year,primary_location&mailto=${cfg.mailto}`);
      if (!r.ok) return [];
      const d = await r.json();
      return (d.results || []).map(w => ({ type: "pub", title: strip(w.display_name),
        text: [w.primary_location?.source?.display_name, w.publication_year].filter(Boolean).join(", "), url: "publications.html" }));
    } catch { return []; }
  }

  /* ---- 검색·순위·미리보기 ---- */
  const tokensOf = q => { const t = q.toLowerCase().split(/\s+/).filter(Boolean); return t.length ? t : [q.toLowerCase()]; };
  function run(q) {
    const toks = tokensOf(q), out = [];
    for (const e of index) {
      const title = e.title.toLowerCase(), text = e.text.toLowerCase();
      if (!toks.every(t => title.includes(t) || text.includes(t))) continue;   // 모든 단어가 들어 있어야 함
      let score = 0;
      for (const t of toks) { if (title.includes(t)) score += 10; score += Math.min(5, text.split(t).length - 1); }
      out.push({ ...e, score });
    }
    return out.sort((a, b) => b.score - a.score);
  }
  const mark = (html, toks) => toks.reduce((h, t) => t ? h.replace(new RegExp(reEsc(t), "ig"), m => `<mark>${m}</mark>`) : h, html);
  function snippet(e, toks) {
    const text = e.text, lower = text.toLowerCase();
    let pos = -1;
    for (const t of toks) { pos = lower.indexOf(t); if (pos >= 0) break; }
    let s = pos < 0 ? text.slice(0, 120) : text.slice(Math.max(0, pos - 50), pos + 90);
    if (pos > 50) s = "…" + s;
    if (s.length < text.length) s += "…";
    return mark(esc(s), toks);
  }

  /* ---- 화면 ---- */
  let ov, input, list, active = -1, lastQ = "", timer;
  function ensureUI() {
    if (ov) return;
    ov = document.createElement("div");
    ov.className = "search-overlay"; ov.hidden = true;
    ov.innerHTML = `
      <div class="search-box" role="dialog" aria-label="Site search">
        <div class="search-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" placeholder="Search the site… (keyword or sentence)" autocomplete="off" spellcheck="false">
          <button class="search-close" type="button" aria-label="Close" title="Close (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div class="search-results">${HINT}</div>
      </div>`;
    document.body.append(ov);
    input = ov.querySelector("input"); list = ov.querySelector(".search-results");
    ov.addEventListener("click", e => { if (e.target === ov) close(); });
    ov.querySelector(".search-close").onclick = close;
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => query(input.value), 120); });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { (list.querySelector(".search-item.active") || list.querySelector(".search-item"))?.click(); }
    });
  }
  function open() {
    ensureUI();
    ov.hidden = false; document.body.classList.add("search-open");
    input.focus(); input.select();
    if (!index) prime();
  }
  function close() { if (ov) { ov.hidden = true; document.body.classList.remove("search-open"); } }
  function prime() {
    if (index || building) return building;
    list.innerHTML = `<div class="search-hint">Building index…</div>`;
    building = build().then(e => { index = e; building = null;
      if (input.value.trim()) query(input.value); else list.innerHTML = HINT; });
    return building;
  }
  async function query(q) {
    q = q.trim(); lastQ = q;
    if (!q) { list.innerHTML = HINT; return; }
    if (!index) { await prime(); if (lastQ !== q) return; }
    const toks = tokensOf(q);
    let results = run(q);
    render(results, toks, q);                     // 사이트 안 결과는 즉시
    const pubs = await searchPubs(q);             // 논문은 응답이 오면 덧붙임
    if (lastQ !== q || !pubs.length) return;
    render(results.concat(pubs), toks, q);
  }
  function render(res, toks, q) {
    if (!res.length) { list.innerHTML = `<div class="search-hint">No results for “${esc(q)}”</div>`; return; }
    const byType = {};
    res.forEach(e => (byType[e.type] ??= []).push(e));
    const withQ = url => url + (url.includes("?") ? "&" : "?") + "q=" + encodeURIComponent(q);
    list.innerHTML = GROUPS.filter(([t]) => byType[t]).map(([t, label]) => `
      <div class="search-group">${label} <span>${byType[t].length}</span></div>
      ${byType[t].slice(0, 8).map(e => `
        <a class="search-item" href="${withQ(e.url)}">
          <b>${mark(esc(e.title), toks)}</b>
          <span>${snippet(e, toks)}</span>
        </a>`).join("")}`).join("");
    active = -1;
  }
  function move(d) {
    const items = [...list.querySelectorAll(".search-item")];
    if (!items.length) return;
    active = (active + d + items.length) % items.length;
    items.forEach((it, i) => it.classList.toggle("active", i === active));
    items[active].scrollIntoView({ block: "nearest" });
  }

  document.addEventListener("keydown", e => {
    const typing = /input|textarea|select/i.test(document.activeElement?.tagName || "");
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
    else if (e.key === "/" && !typing) { e.preventDefault(); open(); }
    else if (e.key === "Escape" && ov && !ov.hidden) close();
  });
  document.querySelectorAll(".search-btn").forEach(b => b.addEventListener("click", open));
  window.SERSearch = { open, close };
})();
