/* ============================================================================
   콘텐츠 로더 — members/·gallery/ 폴더와 data/*.txt 파일을 읽어 오는 공통 코드

   · 파일 목록은 data/manifest.json 에서 옵니다 (GitHub Actions 가 자동 갱신).
     혹시 목록 파일이 없으면 GitHub API 로 폴더를 직접 조회해 대신합니다.
   · .txt 는 "키: 값" 형식이며, # 으로 시작하는 줄은 무시합니다.
   · 이 파일은 사이트 관리자가 고칠 일이 없습니다. 내용 수정은
     members/, gallery/, data/*.txt 에서 하세요.
   ============================================================================ */
"use strict";

/* ---- 파일 이름 규칙 (tools/make-manifest.mjs 와 동일하게 유지) ---- */
const PREFIX_ORDER = ["PHD", "DR", "DRMS", "MS", "MSBS", "BS", "INT", "ALU"];
const IMG_EXTS = ["jpg", "jpeg", "webp", "png"];
const MEMBER_RE = new RegExp(`^(${PREFIX_ORDER.join("|")})-(\\d{3})-(.+?)\\.(txt|${IMG_EXTS.join("|")})$`, "i");
const GALLERY_RE = new RegExp(`^G-(\\d{4})_(\\d{2})_(\\d{2})-(\\d{3})-(.+?)\\.(txt|${IMG_EXTS.join("|")})$`, "i");
const RESEARCH_RE = new RegExp(`^R-(?:\\d{4}_\\d{2}_\\d{2}-)?(\\d{3})-(.+?)\\.(txt|${IMG_EXTS.join("|")})$`, "i");
const AWARD_RE = new RegExp(`^A-(\\d{4})-(\\d{3})-(.+?)\\.(${IMG_EXTS.join("|")})$`, "i");

/* 접두사 → 기본 직함 (프로필의 '직함:' 을 비워 두면 이 값이 쓰임) */
const DEFAULT_ROLE = {
  PHD: "Postdoctoral Researcher",
  DR: "Ph.D. Student",
  DRMS: "Ph.D. Student (M.S.–Ph.D. Combined)",
  MS: "M.S. Student",
  MSBS: "M.S. Student (B.S.–M.S. Combined)",
  BS: "Undergraduate Researcher",
  INT: "Intern",
  ALU: ""
};

/* ---- "키: 값" 텍스트 파서 ----
   listKeys 에 든 키는 아랫줄의 "- 항목" 들을 배열로 모읍니다.
   알 수 없는 줄은 바로 앞 키의 내용에 이어 붙입니다(여러 줄 내용 허용). */
function parseKV(raw, keys, listKeys = []) {
  const out = {};
  for (const k of listKeys) out[k] = [];
  let lastKey = null, lastList = null;
  for (const line0 of String(raw).replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = line0.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const item = line.match(/^\s*[-·]\s+(.+)$/);
    if (item && lastList) { out[lastList].push(item[1].trim()); continue; }
    const kv = line.match(/^([가-힣A-Za-z]{1,10})\s*[:：]\s*(.*)$/);
    if (kv && keys.includes(kv[1])) {
      const key = kv[1], val = kv[2].trim();
      if (listKeys.includes(key)) { lastList = key; lastKey = null; if (val) out[key].push(val); }
      else { out[key] = val; lastKey = key; lastList = null; }
      continue;
    }
    if (lastKey) out[lastKey] += (out[lastKey] ? " " : "") + line.trim();   // 이어지는 줄
  }
  return out;
}

/* ---- 여러 건이 든 파일(특허·뉴스) 파서: startKey 로 레코드를 나눔 ---- */
function parseBlocks(raw, startKey, keys, listKeys = []) {
  const records = [];
  let buf = [];
  const flush = () => { if (buf.length) records.push(parseKV(buf.join("\n"), keys, listKeys)); buf = []; };
  for (const line of String(raw).replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const kv = line.match(/^([가-힣A-Za-z]{1,10})\s*[:：]/);
    if (kv && kv[1] === startKey) flush();
    buf.push(line);
  }
  flush();
  return records.filter(r => r[startKey] !== undefined);
}

async function fetchText(path) {
  const r = await fetch(encodeURI(path), { cache: "no-cache" });
  if (!r.ok) throw new Error(`${path} — HTTP ${r.status}`);
  return r.text();
}

/* ---- 파일 목록: manifest.json 우선, 없으면 GitHub API 로 직접 조회 ---- */
let manifestPromise = null;
function loadManifest() {
  return manifestPromise ??= (async () => {
    try {
      const r = await fetch("data/manifest.json", { cache: "no-cache" });
      if (r.ok) return r.json();
    } catch {}
    console.warn("data/manifest.json 이 없어 GitHub API 로 폴더를 조회합니다 (임시 동작)");
    return manifestFromApi();
  })();
}

async function manifestFromApi() {
  const host = location.hostname;                       // knut-serl.github.io → 저장소 이름
  if (!host.endsWith(".github.io")) return { professor: null, members: [], gallery: [] };
  const repo = `${host.split(".")[0]}/${host}`;
  const ls = async dir => {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${dir}`);
    return r.ok ? (await r.json()).map(f => f.name) : [];
  };
  const collect = (names, re, dir, makeKey) => {
    const map = new Map();
    for (const f of names) {
      const m = f.match(re);
      if (!m) continue;
      const ext = m[m.length - 1].toLowerCase();
      const base = f.slice(0, -(ext.length + 1));
      const e = map.get(base) || { ...makeKey(m, base), txt: null, images: {} };
      if (ext === "txt") e.txt = `${dir}/${f}`; else e.images[ext] = `${dir}/${f}`;
      map.set(base, e);
    }
    return [...map.values()].map(e => {
      const { images, ...rest } = e;
      return { ...rest, image: IMG_EXTS.map(x => images[x]).find(Boolean) || null };
    });
  };
  const [mem, gal, res, awd, img] = await Promise.all([ls("members"), ls("gallery"), ls("research"), ls("awards"), ls("images")]);
  const members = collect(mem, MEMBER_RE, "members",
      (m, base) => ({ base, prefix: m[1].toUpperCase(), order: +m[2], name: m[3] }))
    .sort((a, b) => PREFIX_ORDER.indexOf(a.prefix) - PREFIX_ORDER.indexOf(b.prefix) || a.order - b.order);
  const gallery = collect(gal, GALLERY_RE, "gallery",
      (m, base) => ({ base, date: `${m[1]}-${m[2]}-${m[3]}`, order: +m[4], title: m[5] }))
    .filter(e => e.image)
    .sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order);
  const research = collect(res, RESEARCH_RE, "research",
      (m, base) => ({ base, order: +m[1], title: m[2] }))
    .sort((a, b) => a.order - b.order);
  const awards = awd.map(f => f.match(AWARD_RE))
    .filter(Boolean)
    .map(m => ({ year: m[1], order: +m[2], title: m[3], image: `awards/${m[0]}` }))
    .sort((a, b) => b.year.localeCompare(a.year) || a.order - b.order);
  const profFile = IMG_EXTS.map(x => `professor.${x}`).find(x => img.includes(x));
  return { professor: profFile ? `images/${profFile}` : null, members, research, gallery, awards };
}

/* ---- 구성원 ----
   반환: { PHD:[], DR:[], DRMS:[], MS:[], MSBS:[], BS:[], INT:[], ALU:[] } */
const MEMBER_KEYS = ["이름", "한글", "직함", "이메일", "키워드", "소개", "논문", "특허", "수상", "학위", "현재", "태그"];
let membersPromise = null;
function loadMembers() {
  return membersPromise ??= (async () => {
    const mf = await loadManifest();
    const groups = Object.fromEntries(PREFIX_ORDER.map(p => [p, []]));
    const entries = await Promise.all(mf.members.map(async e => {
      let t = {};
      if (e.txt) {
        try { t = parseKV(await fetchText(e.txt), MEMBER_KEYS, ["논문", "특허", "수상"]); }
        catch (err) { console.warn("프로필을 읽지 못했습니다:", e.txt, err.message); }
      }
      const name = t["이름"] || e.name.replace(/([a-z])([A-Z])/g, "$1 $2");   // 파일명에서 복원
      return {
        base: e.base, prefix: e.prefix, order: e.order, image: e.image,
        name, kor: t["한글"] || "",
        role: t["직함"] || DEFAULT_ROLE[e.prefix] || "",
        degree: t["학위"] || "", now: t["현재"] || "",
        email: t["이메일"] || "", interests: t["키워드"] || "", bio: t["소개"] || "",
        pubs: t["논문"] || [], patents: t["특허"] || [], awards: t["수상"] || [],
        // 태그: 랩장·부랩장·페이지 관리자 등 — 쉼표로 여러 개 가능, 카드 이름 옆 배지로 표시
        tags: (t["태그"] || "").split(",").map(x => x.trim()).filter(Boolean)
      };
    }));
    for (const m of entries) groups[m.prefix]?.push(m);
    return groups;
  })();
}

/* ---- 갤러리: [{ image, date, order, title, desc }] (최신 날짜가 앞) ---- */
async function loadGallery() {
  const mf = await loadManifest();
  return Promise.all(mf.gallery.map(async e => {
    let t = {};
    if (e.txt) {
      try { t = parseKV(await fetchText(e.txt), ["제목", "설명"]); }
      catch (err) { console.warn("갤러리 설명을 읽지 못했습니다:", e.txt, err.message); }
    }
    return { base: e.base, image: e.image, date: e.date, order: e.order,
             title: t["제목"] || e.title, desc: t["설명"] || "" };
  }));
}

/* ---- 연구 분야: [{ image, order, title, desc }] (순번 001 이 맨 위) ---- */
async function loadResearch() {
  const mf = await loadManifest();
  return Promise.all((mf.research || []).map(async e => {
    let t = {};
    if (e.txt) {
      try { t = parseKV(await fetchText(e.txt), ["제목", "요약", "설명"]); }
      catch (err) { console.warn("연구 분야 설명을 읽지 못했습니다:", e.txt, err.message); }
    }
    // 파일명 "SoftRobotElectronics" → 제목이 비었을 때 "Soft Robot Electronics" 로 복원
    const fallbackTitle = e.title.replace(/([a-z])([A-Z])/g, "$1 $2");
    return { base: e.base, image: e.image, order: e.order,
             title: t["제목"] || fallbackTitle, desc: t["요약"] || t["설명"] || "" };
  }));
}

/* ---- 수상 상장: 연도별 { "2024": [{title, image}...] } (순번 순) ---- */
async function loadAwards() {
  const mf = await loadManifest();
  const byYear = {};
  for (const a of mf.awards || []) (byYear[a.year] ??= []).push(a);
  return byYear;
}

/* ---- 검색 결과에서 항목으로 이동할 때 쓰는 고정 id (뉴스·상장은 파일명이 없어 내용으로 만듦) ---- */
function newsId(n) {
  const s = (n.date || "") + "|" + (n.title || "");
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return "news-" + h.toString(36);
}
function awardId(a) { return "award-" + String(a.image || a.title).replace(/[^A-Za-z0-9가-힣]+/g, "-"); }

/* ---- 특허: 번호가 큰 것(최신)이 앞 ---- */
async function loadPatents() {
  const recs = parseBlocks(await fetchText("data/patents.txt"),
    "번호", ["번호", "연도", "제목", "발명자", "등록번호", "국가", "뱃지"]);
  return recs.map((r, i) => ({
    no: +r["번호"] || i + 1, year: +r["연도"] || 0, title: r["제목"] || "",
    inventors: r["발명자"] || "", number: r["등록번호"] || "", country: r["국가"] || "",
    // 뱃지: 쉼표로 여러 개 — 특허 항목에 파란 배지로 표시 (US Patent 는 자동으로 금색 배지)
    badges: (r["뱃지"] || "").split(",").map(x => x.trim()).filter(Boolean)
  })).sort((a, b) => b.no - a.no);
}

/* ---- 뉴스: 파일 맨 아래(최신)가 앞 ---- */
async function loadNews() {
  const recs = parseBlocks(await fetchText("data/news.txt"),
    "날짜", ["날짜", "제목", "내용", "본문", "링크", "사진"]);
  return recs.map(r => ({
    date: r["날짜"] || "", title: r["제목"] || "", text: r["내용"] || "",
    body: r["본문"] || "",   // 펼쳤을 때 보이는 전체 내용 (선택)
    link: r["링크"] || "", img: r["사진"] || ""
  })).reverse();
}
