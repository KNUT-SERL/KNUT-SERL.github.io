/* ============================================================
   Publications 자동 로딩 (OpenAlex API) + 특허 탭 (data/patents.txt)
   논문 설정은 data/site-data.js 의 SITE.pub 에서 관리합니다.
   ============================================================ */
"use strict";
(function () {
const CFG = window.SITE.pub;
const API = "https://api.openalex.org";
const TYPES = ["article", "review", "preprint", "book-chapter"];
let IFMAP = {};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function toBibtex(w) {
  const first = w.authorships?.[0]?.author?.display_name || "unknown";
  const key = (first.split(" ").pop() || "ref").toLowerCase() + (w.publication_year || "");
  const authors = (w.authorships || []).map(a => a.author?.display_name).filter(Boolean).join(" and ");
  const venue = w.primary_location?.source?.display_name || "";
  const b = w.biblio || {};
  return [
    `@article{${key},`,
    `  title   = {${w.display_name || ""}},`,
    `  author  = {${authors}},`,
    venue ? `  journal = {${venue}},` : null,
    w.publication_year ? `  year    = {${w.publication_year}},` : null,
    b.volume ? `  volume  = {${b.volume}},` : null,
    b.issue ? `  number  = {${b.issue}},` : null,
    (b.first_page && b.last_page) ? `  pages   = {${b.first_page}--${b.last_page}},` : null,
    w.doi ? `  doi     = {${w.doi.replace("https://doi.org/", "")}},` : null,
    `}`
  ].filter(Boolean).join("\n");
}

async function fetchJournalStats(works) {
  const ids = [...new Set(works.map(w => w.primary_location?.source?.id).filter(Boolean))]
    .map(u => u.split("/").pop());
  for (let i = 0; i < ids.length; i += 50) {
    try {
      const r = await fetch(`${API}/sources?filter=ids.openalex:${ids.slice(i, i + 50).join("|")}` +
        `&per-page=50&select=id,summary_stats&mailto=${CFG.mailto}`);
      if (!r.ok) continue;
      const d = await r.json();
      d.results.forEach(s => IFMAP[s.id.split("/").pop()] = s.summary_stats?.["2yr_mean_citedness"]);
    } catch {}
  }
}

async function load() {
  const $w = document.getElementById("pub-list");
  try {
    let works = [], cursor = "*";
    while (works.length < 600 && cursor) {
      const r = await fetch(`${API}/works?filter=authorships.author.id:${CFG.authorId}` +
        `&per-page=200&cursor=${cursor}&sort=publication_date:desc&mailto=${CFG.mailto}`);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const data = await r.json();
      works.push(...data.results);
      cursor = data.meta?.next_cursor;
      if (!data.results.length) break;
    }
    const list = works.filter(w =>
      !w.is_paratext && TYPES.includes(w.type) &&
      !CFG.exclude.includes((w.id || "").split("/").pop()));
    await fetchJournalStats(list);
    render(list, $w);
  } catch (e) {
    $w.innerHTML = `<div class="notice">The live publication list could not be loaded right now
      (${esc(e.message)}). Please refresh, or see
      <a href="https://openalex.org/${CFG.authorId}" target="_blank" rel="noopener">OpenAlex</a>.</div>`;
  }
}

function render(works, $w) {
  const total = works.length;
  const byYear = {};
  works.forEach((w, i) => { w._no = total - i; (byYear[w.publication_year || "—"] ??= []).push(w); });
  const years = Object.keys(byYear).sort((a, b) => b - a);

  $w.innerHTML = years.map(y => `
    <div class="yearhead"><b>${y}</b></div>
    ${byYear[y].map(item).join("")}
  `).join("") +
  `<div class="credit">List auto-generated from
     <a href="https://openalex.org/${CFG.authorId}" target="_blank" rel="noopener">OpenAlex</a>
     · IF≈ is a 2-year mean-citedness approximation</div>`;

  $w.querySelectorAll("[data-toggle]").forEach(b =>
    b.onclick = () => document.getElementById(b.dataset.toggle).classList.toggle("open"));
  $w.querySelectorAll("[data-copy]").forEach(b =>
    b.onclick = async () => {
      try {
        await navigator.clipboard.writeText(document.getElementById(b.dataset.copy).textContent);
        const t = b.textContent; b.textContent = "Copied!";
        setTimeout(() => b.textContent = t, 1400);
      } catch {}
    });
}

function item(w) {
  const venue = w.primary_location?.source?.display_name || "";
  const doiKey = (w.doi || "").replace("https://doi.org/", "").toLowerCase();
  const img = CFG.thumbs[doiKey];
  const extra = CFG.extras[doiKey] || {};
  const landing = w.doi || w.primary_location?.landing_page_url;
  const pdf = w.open_access?.oa_url || w.primary_location?.pdf_url;
  const uid = "b" + w._no;

  const badges = [];
  (extra.badges || []).forEach(t => badges.push(`<span class="bdg man">${esc(t)}</span>`));
  const official = CFG.ifOverride[venue.toLowerCase()];
  const srcId = (w.primary_location?.source?.id || "").split("/").pop();
  const ifVal = official ?? IFMAP[srcId];
  if (ifVal >= CFG.ifThreshold)
    badges.push(`<span class="bdg if">IF${official ? "" : "≈"} ${(+ifVal).toFixed(1)}</span>`);
  const pct = w.citation_normalized_percentile;
  if (CFG.autoTopCited && pct) {
    if (pct.is_in_top_1_percent) badges.push(`<span class="bdg top">TOP 1% CITED</span>`);
    else if (pct.is_in_top_10_percent) badges.push(`<span class="bdg top">TOP 10% CITED</span>`);
  }

  const eq = new Set(extra.equal || []);
  const authors = (w.authorships || []).map(a => {
    const nm = a.author?.display_name || "";
    let n = esc(nm);
    if (eq.has(nm)) n += "†";
    if (a.is_corresponding) n += "*";
    const id = (a.author?.id || "").split("/").pop();
    return id === CFG.authorId ? `<b>${n}</b>` : n;
  }).join(", ");

  return `
  <div class="item${img ? " hasimg" : ""}">
    <div class="num">${w._no}</div>
    ${img ? `<div class="thumb"><img src="${esc(img)}" alt="" loading="lazy"></div>` : ""}
    <div>
      <div class="title">${landing
        ? `<a href="${esc(landing)}" target="_blank" rel="noopener">${esc(w.display_name)}</a>`
        : esc(w.display_name)}</div>
      <div class="authors">${authors}</div>
      <div class="venue"><span>${esc(venue || (w.type === "preprint" ? "Preprint" : ""))}${venue || w.type === "preprint" ? ", " : ""}${w.publication_year || ""}</span>${badges.join("")}${w.cited_by_count ? `<span class="cites">Cited by ${w.cited_by_count.toLocaleString()}</span>` : ""}</div>
      <div class="quick">
        ${pdf ? `<a href="${esc(pdf)}" target="_blank" rel="noopener">PDF</a>` : ""}
        ${w.doi ? `<a href="${esc(w.doi)}" target="_blank" rel="noopener">DOI</a>` : ""}
        <button data-toggle="${uid}">BibTeX</button>
        <button data-copy="${uid}">Copy</button>
      </div>
      <div class="bib" id="${uid}">${esc(toBibtex(w))}</div>
    </div>
  </div>`;
}

/* ---- 특허 탭 ----
   목록은 data/patents.txt 에서 옵니다. 파일 맨 아래에 이어 붙이면 최신이 위로. */
async function renderPatents() {
  const $p = document.getElementById("pat-list");
  let pats = [];
  try { pats = await loadPatents(); }
  catch (e) {
    $p.innerHTML = `<div class="notice">특허 목록(data/patents.txt)을 읽지 못했습니다 (${esc(e.message)}).</div>`;
    return;
  }
  const byYear = {};
  pats.forEach(p => (byYear[p.year] ??= []).push(p));
  const years = Object.keys(byYear).sort((a, b) => b - a);
  $p.innerHTML = years.map(y => `
    <div class="yearhead"><b>${y}</b></div>
    ${byYear[y].map(p => `
      <div class="pat-item">
        <div class="num">${p.no}</div>
        <div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.inventors)}${p.inventors ? " · " : ""}${p.number ? `<b>${esc(p.number)}</b> · ` : ""}${esc(p.country || "")}</p>
        </div>
      </div>`).join("")}
  `).join("");
}

/* ---- 탭 전환 ---- */
document.addEventListener("DOMContentLoaded", () => {
  renderPatents();
  load();
  const bPub = document.getElementById("tab-pub"), bPat = document.getElementById("tab-pat");
  const vPub = document.getElementById("pub-list"), vPat = document.getElementById("pat-list");
  function show(which) {
    bPub.classList.toggle("on", which === "pub");
    bPat.classList.toggle("on", which === "pat");
    vPub.style.display = which === "pub" ? "" : "none";
    vPat.style.display = which === "pat" ? "" : "none";
  }
  bPub.onclick = () => show("pub");
  bPat.onclick = () => show("pat");
  show("pub");
});
})();
