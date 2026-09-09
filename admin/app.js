/* ============================================================
   SER Lab 사이트 관리자 화면 (admin/)
   GitHub 저장소의 파일을 화면(UI)에서 고칩니다. 저장하면 곧바로 main 에 커밋되고
   1~2분 뒤 사이트에 반영됩니다. 파일 형식 규칙은 사이트 본체(js/content.js)와 같습니다.
   ============================================================ */
"use strict";

/* ---------- 작은 도구들 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n, w = 3) => String(n).padStart(w, "0");
const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
const IMG_RE = new RegExp(`\\.(${IMG_EXTS.join("|")})$`, "i");
const extOf = name => ((String(name).match(/\.([A-Za-z0-9]+)$/) || [, ""])[1]).toLowerCase().replace(/^jpeg$/, "jpg");
const enName = s => String(s || "").normalize("NFC").replace(/[^A-Za-z0-9]/g, "");                       // "Gildong Hong" → GildongHong
const safeName = s => String(s || "").normalize("NFC").replace(/[\\/:*?"<>|#%]/g, "").trim().replace(/\s+/g, "-").replace(/-{2,}/g, "-").replace(/^[.\-]+|[.\-]+$/g, "");
const COURSE = { PHD: "포닥", DR: "박사", DRMS: "석박사 연계", MS: "석사", MSBS: "학석사 연계", BS: "학사", INT: "인턴", ALU: "졸업생" };
const TAG_EN = { "랩장": "LAB LEADER", "부랩장": "VICE LEADER", "페이지 관리자": "WEB ADMIN", "창업": "FOUNDER" };   // js/common.js 와 같은 표
const badgeLabels = d => { const t = d.tags.map(x => TAG_EN[x] || x); if (d.startup && !t.includes("FOUNDER")) t.push("FOUNDER"); return t; };
const MEMBER_LIST_KEYS = ["창업내용", "논문", "특허", "수상"];
const byExtPriority = (a, b) => IMG_EXTS.indexOf(a.ext) - IMG_EXTS.indexOf(b.ext);
const lines = s => String(s || "").split(/\r?\n/).map(x => x.replace(/^\s*[-·]\s*/, "").trim()).filter(Boolean);
const splitComma = s => String(s || "").split(",").map(x => x.trim()).filter(Boolean);
const thisYear = () => String(new Date().getFullYear());
async function pool(items, n, fn) {
  let i = 0;
  const worker = async () => { while (i < items.length) await fn(items[i++]); };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}
const cacheBust = url => url ? url + (url.includes("?") ? "&" : "?") + "t=" + Date.now() : "";

function toast(msg, kind = "ok") {
  const t = document.createElement("div"); t.className = "toast " + kind; t.textContent = msg;
  $("#toasts").append(t); setTimeout(() => t.remove(), kind === "err" ? 9000 : 4500);
}
function busy(text) { const b = $("#busy"); if (text) { $("#busy-text").textContent = text; b.hidden = false; } else b.hidden = true; }
/* 오래 걸리는 작업 감싸기: 진행 표시 + 실패하면 알림. 성공하면 결과, 실패하면 undefined */
async function run(text, fn) {
  busy(text);
  try { return await fn(); }
  catch (e) { console.error(e); toast(e.message || String(e), "err"); return undefined; }
  finally { busy(false); updateRate(); }
}
const confirmBox = msg => window.confirm(msg);

/* ---------- 모달 폼 ---------- */
function modal(title, bodyHtml, { save = "저장", onSave, wide = false, onOpen } = {}) {
  return new Promise(resolve => {
    const d = $("#modal");
    d.className = wide ? "wide" : "";
    d.innerHTML = `<form method="dialog" novalidate><h2>${esc(title)}</h2><div class="mbody">${bodyHtml}</div>
      <div class="merr" hidden></div>
      <div class="mact"><button type="button" class="btn" data-x="cancel">${onSave ? "취소" : "닫기"}</button>${onSave ? `<button type="submit" class="btn primary">${esc(save)}</button>` : ""}</div></form>`;
    const form = d.querySelector("form"), err = d.querySelector(".merr");
    const done = v => { if (d.open) d.close(); resolve(v); };
    d.querySelector("[data-x=cancel]").onclick = () => done(false);
    d.oncancel = e => { e.preventDefault(); done(false); };
    form.onsubmit = async e => {
      e.preventDefault(); err.hidden = true;
      const btn = form.querySelector("button[type=submit]"); if (btn) btn.disabled = true;
      try { await onSave(form); done(true); }
      catch (ex) { console.error(ex); err.textContent = ex.message || String(ex); err.hidden = false; if (btn) btn.disabled = false; }
    };
    if (onOpen) onOpen(form);
    d.showModal();
  });
}
const F = {
  text: (label, name, value = "", { hint = "", ph = "", type = "text" } = {}) =>
    `<label class="f"><span>${esc(label)}</span><input type="${type}" name="${name}" value="${esc(value)}" placeholder="${esc(ph)}" autocomplete="off">${hint ? `<small>${esc(hint)}</small>` : ""}</label>`,
  area: (label, name, value = "", { rows = 3, hint = "", ph = "" } = {}) =>
    `<label class="f"><span>${esc(label)}</span><textarea name="${name}" rows="${rows}" placeholder="${esc(ph)}">${esc(value)}</textarea>${hint ? `<small>${esc(hint)}</small>` : ""}</label>`,
  select: (label, name, options, value, { hint = "" } = {}) =>
    `<label class="f"><span>${esc(label)}</span><select name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>${hint ? `<small>${esc(hint)}</small>` : ""}</label>`,
  file: (label, name, { multiple = false, hint = "", accept = "image/*" } = {}) =>
    `<label class="f"><span>${esc(label)}</span><input type="file" name="${name}" accept="${accept}"${multiple ? " multiple" : ""}>${hint ? `<small>${esc(hint)}</small>` : ""}<img class="preview" data-preview-for="${name}" alt=""></label>`,
  check: (label, name, checked = false, hint = "") =>
    `<label class="fc"><input type="checkbox" name="${name}"${checked ? " checked" : ""}> ${esc(label)}${hint ? ` <small class="hint">${esc(hint)}</small>` : ""}</label>`
};
const val = (form, name) => (form.elements[name]?.value ?? "").trim();
const chk = (form, name) => !!form.elements[name]?.checked;
const filesOf = (form, name) => [...(form.elements[name]?.files || [])];
/* 파일 입력에 미리보기 붙이기 (모달 열릴 때 호출) */
function wirePreviews(form) {
  $$("input[type=file]", form).forEach(inp => inp.addEventListener("change", () => {
    const img = form.querySelector(`img[data-preview-for="${inp.name}"]`); const f = inp.files && inp.files[0];
    if (!img) return;
    if (f && f.type.startsWith("image/")) { img.src = URL.createObjectURL(f); img.style.display = "block"; } else img.style.display = "none";
  }));
}

/* ---------- 이미지 준비: 브라우저에서 줄여서 jpg 로 (원본 그대로 옵션) ---------- */
async function prepareImage(file, { maxDim = 1600, quality = 0.88, keepOriginal = false } = {}) {
  if (!file) throw new Error("파일을 고르세요");
  if (keepOriginal) {
    const ext = extOf(file.name);
    if (!IMG_EXTS.includes(ext)) throw new Error(`지원하지 않는 이미지 형식입니다: .${ext || "?"} (jpg·png·webp 만 가능)`);
    return { bytes: new Uint8Array(await file.arrayBuffer()), ext, note: "원본 그대로" };
  }
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new Error(`이미지를 열 수 없습니다: ${file.name} (HEIC 등은 jpg/png 로 바꿔 올리세요)`); }
  const s = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const blob = await new Promise(r => c.toBlob(r, "image/jpeg", quality));
  if (!blob) throw new Error("이미지 변환에 실패했습니다");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ext: "jpg", note: `${w}×${h} jpg` };
}

/* ---------- 설정 · 연결 ---------- */
const SETTINGS_KEY = "serlab-admin";
const DEFAULTS = { owner: "KNUT-SERL", repo: "KNUT-SERL.github.io", branch: "main", api: "https://api.github.com", token: "", remember: true };
function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"), ...JSON.parse(sessionStorage.getItem(SETTINGS_KEY) || "null") }; }
  catch { return { ...DEFAULTS }; }
}
function saveSettings(s) {
  const { token, remember, ...rest } = s;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(remember ? { ...rest, token, remember } : { ...rest, remember }));
    sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(remember ? {} : { token }));
  } catch {}
}
let settings = loadSettings();
let gh = null;
const state = { tab: "connect", conn: null, members: null, order: {}, gallery: null, research: null, news: null, patents: null, awards: null, tree: null, images: null };
const need = () => { if (!gh) throw new Error("먼저 '연결' 탭에서 저장소에 연결하세요"); return gh; };
const invalidate = () => { state.members = state.gallery = state.research = state.news = state.patents = state.awards = state.tree = state.images = null; state.order = {}; };
function updateRate() { const r = gh?.rate; $("#rate").textContent = r ? `API 잔여 ${r.remaining}/${r.limit}` : ""; }
function setBadge() {
  const b = $("#conn-badge"), c = state.conn;
  if (!c) { b.className = "badge"; b.textContent = "연결 안 됨"; $("#repo-label").textContent = ""; return; }
  b.className = "badge " + (c.push ? "on" : "ro");
  b.textContent = c.push ? `연결됨 · ${c.login}` : (c.login ? `읽기 전용 · ${c.login}` : "읽기 전용 (토큰 없음)");
  $("#repo-label").textContent = `${settings.owner}/${settings.repo} · ${settings.branch}`;
  $("#site-link").href = c.siteUrl || "../";
}

async function connect(s) {
  gh = new GitHubClient(s);
  const info = await gh.repoInfo();
  let login = "";
  if (s.token) { try { login = (await gh.me()).login; } catch (e) { if (e.status === 401) throw e; } }
  const push = !!(info.permissions && info.permissions.push);
  state.conn = { login, push, siteUrl: `https://${s.owner.toLowerCase()}.github.io/${s.repo.toLowerCase() === `${s.owner.toLowerCase()}.github.io` ? "" : s.repo + "/"}` };
  settings = { ...s }; saveSettings(settings);
  invalidate(); setBadge(); updateRate();
  return state.conn;
}

/* ---------- 탭 ---------- */
const TABS = { connect: renderConnect, members: renderMembers, gallery: renderGallery, research: renderResearch, news: renderNews, patents: renderPatents, awards: renderAwards, images: renderImages, files: renderFiles, status: renderStatus };
async function show(tab) {
  state.tab = tab;
  $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  location.hash = tab;
  const view = $("#view");
  if (tab !== "connect" && !gh) { view.innerHTML = `<div class="card"><h2>먼저 연결하세요</h2><p class="hint">왼쪽 '연결' 탭에서 GitHub 토큰을 넣고 연결하면 이 화면을 쓸 수 있습니다.</p></div>`; return; }
  view.innerHTML = `<p class="hint">불러오는 중…</p>`;
  try { await TABS[tab](view); }
  catch (e) { console.error(e); view.innerHTML = `<div class="err-box">${esc(e.message || e)}</div>`; }
  updateRate();
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) show(b.dataset.tab); });
$("#reload-btn").addEventListener("click", () => { invalidate(); show(state.tab); });

/* ================================================================
   1. 연결
   ================================================================ */
async function renderConnect(view) {
  const s = settings;
  view.innerHTML = `
  <h1>연결</h1>
  <p class="lead">GitHub 저장소에 연결합니다. 토큰은 이 PC 의 브라우저에만 저장되고 저장소로 올라가지 않습니다.</p>
  <div class="card"><form id="conn-form">
    <div class="grid2">
      ${F.text("저장소 소유자(조직)", "owner", s.owner)}
      ${F.text("저장소 이름", "repo", s.repo)}
      ${F.text("브랜치", "branch", s.branch)}
      ${F.text("API 주소 (바꿀 일 없음)", "api", s.api)}
    </div>
    ${F.text("GitHub 토큰 (Personal Access Token)", "token", s.token, { type: "password", ph: "github_pat_… 또는 ghp_…", hint: "비워 두면 읽기만 됩니다 (수정·업로드 불가)" })}
    ${F.check("이 PC 에 토큰 저장 (개인 PC 에서만 켜세요)", "remember", s.remember)}
    <div class="btns"><button class="btn primary" type="submit">연결</button><button class="btn" type="button" id="forget-btn">저장된 토큰 지우기</button></div>
    <div id="conn-result" style="margin-top:12px"></div>
  </form></div>
  <div class="card">
    <h2>토큰 만드는 법 (한 번만)</h2>
    <ol style="padding-left:20px;line-height:1.8">
      <li>GitHub 로그인 → 오른쪽 위 프로필 → <b>Settings</b> → 맨 아래 <b>Developer settings</b> → <b>Personal access tokens</b> → <b>Fine-grained tokens</b> → <b>Generate new token</b></li>
      <li>Token name: <code>SER Lab 관리자</code>, Expiration: 1년 등 원하는 기간, Resource owner: <b>${esc(s.owner)}</b></li>
      <li>Repository access: <b>Only select repositories</b> → <code>${esc(s.repo)}</code> 선택</li>
      <li>Permissions → Repository permissions: <b>Contents = Read and write</b> (필수) · <b>Actions = Read-only</b>, <b>Pages = Read-only</b> (배포 상태 보기용, 선택)</li>
      <li>Generate 후 나오는 <code>github_pat_…</code> 를 위 칸에 붙여 넣고 <b>연결</b></li>
    </ol>
    <div class="note">조직 설정에서 fine-grained 토큰이 막혀 있으면 <b>Tokens (classic)</b> 에서 <code>repo</code> 범위로 만든 <code>ghp_…</code> 토큰도 됩니다.
      토큰이 새어 나간 것 같으면 GitHub 의 같은 화면에서 <b>Delete</b> 하면 즉시 무효화됩니다.</div>
  </div>
  <div class="card">
    <h2>윈도우 프로그램처럼 쓰기</h2>
    <p class="hint">Edge 나 Chrome 으로 이 화면을 연 뒤 주소창 오른쪽의 <b>앱 설치</b>(⊕ 아이콘)를 누르면 시작 메뉴·바탕화면에 "SER 관리자" 앱이 생기고 별도 창으로 실행됩니다. 설치 파일이 없고, 항상 최신 화면이 뜹니다.</p>
  </div>`;
  $("#conn-form").onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const s2 = { owner: val(f, "owner"), repo: val(f, "repo"), branch: val(f, "branch") || "main", api: val(f, "api") || DEFAULTS.api, token: val(f, "token"), remember: chk(f, "remember") };
    if (!s2.owner || !s2.repo) { toast("소유자와 저장소 이름을 적으세요", "err"); return; }
    const r = await run("연결 확인 중…", () => connect(s2));
    const box = $("#conn-result");
    if (!r) { state.conn = null; setBadge(); box.innerHTML = `<div class="err-box">연결 실패 — 위 알림의 내용을 확인하세요</div>`; return; }
    box.innerHTML = r.push
      ? `<div class="note" style="color:var(--ok)"><b>연결됨</b> — ${esc(r.login)} 계정, 수정 권한 있음. 왼쪽 메뉴에서 작업을 시작하세요.</div>`
      : `<div class="err-box">연결은 됐지만 <b>수정 권한이 없습니다</b> (토큰이 없거나 Contents 권한이 read-only). 읽기만 가능합니다.</div>`;
    toast(r.push ? "연결되었습니다" : "읽기 전용으로 연결되었습니다", r.push ? "ok" : "warn");
  };
  $("#forget-btn").onclick = () => { localStorage.removeItem(SETTINGS_KEY); sessionStorage.removeItem(SETTINGS_KEY); settings = { ...DEFAULTS }; gh = null; state.conn = null; setBadge(); show("connect"); toast("저장된 토큰을 지웠습니다"); };
}

/* ================================================================
   2. 구성원 — members/PREFIX-NNN-Name.txt + 같은 이름 사진
   ================================================================ */
async function loadMembers() {
  if (state.members) return state.members;
  const g = need();
  const map = new Map();
  for (const f of await g.ls("members")) {
    if (f.type !== "file") continue;
    const m = f.name.match(MEMBER_RE); if (!m) continue;
    const ext = m[4].toLowerCase(), base = f.name.slice(0, -(m[4].length + 1));
    const e = map.get(base) || { base, prefix: m[1].toUpperCase(), order: +m[2], name: m[3], txt: null, images: [] };
    if (ext === "txt") e.txt = f; else e.images.push({ ...f, ext: ext === "jpeg" ? "jpeg" : ext });
    map.set(base, e);
  }
  const list = [...map.values()].sort((a, b) => PREFIX_ORDER.indexOf(a.prefix) - PREFIX_ORDER.indexOf(b.prefix) || a.order - b.order || natural(a.base, b.base));
  await pool(list, 6, async e => {
    let t = {};
    if (e.txt) { try { t = parseKV((await g.readFile(e.txt.path)).text, MEMBER_KEYS, MEMBER_LIST_KEYS); } catch (err) { console.warn(err); } }
    e.data = memberData(t, e);
    e.image = e.images.slice().sort(byExtPriority)[0] || null;
  });
  state.members = list; state.order = {};
  return list;
}
function memberData(t, e) {
  return {
    name: t["이름"] || (e ? e.name.replace(/([a-z])([A-Z])/g, "$1 $2") : ""), kor: t["한글"] || "", authorNames: t["저자명"] || "",
    role: t["직함"] || "", email: t["이메일"] || "", scholar: t["스칼라"] || "", interests: t["키워드"] || "", bio: t["소개"] || "",
    startup: t["창업"] || "", startupItems: t["창업내용"] || [], pubs: t["논문"] || [], patents: t["특허"] || [], awards: t["수상"] || [],
    tags: splitComma(t["태그"]), degree: t["학위"] || "", now: t["현재"] || ""
  };
}
/* 프로필 파일 만들기 — README 1장의 표준 양식과 같은 모양 (설명 주석 포함) */
function memberTxt(d, prefix) {
  const L = (k, v) => `${k}: ${v || ""}`.replace(/\s+$/, "");
  const list = arr => (arr || []).map(x => `- ${x}`);
  const head = ["# ─────────────────────────────────────────────────────",
    `# ${d.kor || d.name} (${d.name}) — ${prefix === "ALU" ? "졸업생" : "구성원"} 프로필`,
    "# '키: 값' 한 줄이 카드의 한 칸입니다. 값만 고쳐서 저장하세요.",
    "# 비워 둔 칸은 카드에 표시되지 않습니다. #으로 시작하는 줄은 설명(무시됨)입니다.",
    "# ─────────────────────────────────────────────────────", ""];
  const authorC = "# 논문에 다른 표기로 실리는 이름이 있으면 쉼표로 적습니다 (예: Jun-Won Jang, J. W. Jang) — 저자 목록 굵게 표시용";
  const scholarC = "# Google Scholar 프로필 주소 — 카드에 링크로 표시되고, 적은 사람만 논문 목록이 OpenAlex에서 자동으로 채워집니다";
  const tagBlock = d.tags && d.tags.length ? ["", "# 직책 태그 — 이름 위에 영문 배지로 표시됩니다 (랩장→LAB LEADER, 부랩장→VICE LEADER)", L("태그", d.tags.join(", "))] : [];
  let out;
  if (prefix === "ALU") {
    out = [...head, L("이름", d.name), L("한글", d.kor), authorC, L("저자명", d.authorNames), L("학위", d.degree), L("이메일", d.email), scholarC, L("스칼라", d.scholar), L("현재", d.now), ...tagBlock, ""];
  } else {
    out = [...head, L("이름", d.name), L("한글", d.kor), authorC, L("저자명", d.authorNames), L("직함", d.role), L("이메일", d.email), scholarC, L("스칼라", d.scholar), L("키워드", d.interests), "",
      "# 아래 칸들은 카드를 클릭하면 펼쳐지는 상세 패널입니다 (소개 → 창업 → 논문 → 특허 → 수상 순). 전부 비우면 패널이 생기지 않습니다.",
      "# 목록 칸(창업내용/논문/특허/수상)은 바로 아랫줄부터 '- '로 시작하는 줄을 여러 개 적으면 됩니다.",
      "# 논문: 위 스칼라: 를 적은 사람은 교수님과 함께 쓴 연구실 논문이 자동으로 채워지므로 그 밖의 논문만 적습니다. 스칼라: 가 비어 있으면 여기 적은 목록만 보입니다.",
      L("소개", d.bio),
      "# 창업 이력이 있을 때만: 창업: 에 \"회사명 — 역할\", 창업내용: 아랫줄에 '- ' 항목들 → 카드에 Startup 칸 + FOUNDER 배지 자동",
      L("창업", d.startup), "창업내용:", ...list(d.startupItems), "논문:", ...list(d.pubs), "", "특허:", ...list(d.patents), "", "수상:", ...list(d.awards), "", ...tagBlock, ""];
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}
const memberLabel = m => `${m.data?.name || m.name}${m.data?.kor ? ` (${m.data.kor})` : ""}`;
const nextOrder = (list, prefix) => Math.max(0, ...list.filter(x => x.prefix === prefix).map(x => x.order)) + 1;
const groupOrder = prefix => state.order[prefix] || state.members.filter(m => m.prefix === prefix).map(m => m.base);

async function renderMembers(view) {
  const list = await loadMembers();
  const groups = PREFIX_ORDER.map(p => ({ prefix: p, bases: groupOrder(p) })).filter(g => g.bases.length || ["MS", "BS"].includes(g.prefix));
  view.innerHTML = `
  <h1>구성원</h1>
  <p class="lead">카드 내용 수정, 사진 교체, 추가·삭제, 순서 바꾸기(▲▼ 누른 뒤 '순서 저장'), 과정 변경·졸업 처리를 할 수 있습니다.</p>
  <div class="btns" style="margin-bottom:14px"><button class="btn primary" data-act="member-new">＋ 구성원 추가</button></div>
  ${groups.map(g => {
    const dirty = !!state.order[g.prefix];
    return `<div class="card" data-prefix="${g.prefix}">
      <div class="head"><h2>${esc(COURSE[g.prefix])} <span class="hint">(${g.prefix})</span></h2><span class="n">${g.bases.length}명</span><span class="grow"></span>
        ${dirty ? `<button class="btn primary sm" data-act="order-save" data-prefix="${g.prefix}">순서 저장</button><button class="btn sm" data-act="order-cancel" data-prefix="${g.prefix}">되돌리기</button>` : ""}
        <button class="btn sm" data-act="member-new" data-prefix="${g.prefix}">＋ 추가</button></div>
      ${g.bases.map((base, i) => {
        const m = list.find(x => x.base === base); if (!m) return "";
        const moved = dirty && m.order !== i + 1;
        return `<div class="row${moved ? " dirty" : ""}" data-base="${esc(base)}">
          <span class="btns"><button class="btn icon sm" data-act="order-move" data-prefix="${g.prefix}" data-base="${esc(base)}" data-dir="-1" title="위로"${i === 0 ? " disabled" : ""}>▲</button><button class="btn icon sm" data-act="order-move" data-prefix="${g.prefix}" data-base="${esc(base)}" data-dir="1" title="아래로"${i === g.bases.length - 1 ? " disabled" : ""}>▼</button></span>
          <span class="ord">${pad(i + 1)}</span>
          ${m.image ? `<img class="thumb" src="${esc(m.image.download_url)}" alt="">` : `<span class="thumb"></span>`}
          <div class="main"><b>${esc(memberLabel(m))}${badgeLabels(m.data).map(t => `<span class="pill">${esc(t)}</span>`).join("")}</b>
            <small>${esc(m.base)} · ${esc(m.data.role || m.data.degree || DEFAULT_ROLE[m.prefix] || "")}${m.data.email ? " · " + esc(m.data.email) : ""}${m.txt ? "" : " · <span style='color:var(--err)'>프로필 .txt 없음</span>"}</small></div>
          <span class="btns"><button class="btn sm" data-act="member-edit" data-base="${esc(base)}">수정</button>
            <button class="btn sm" data-act="member-move" data-base="${esc(base)}">과정 변경</button>
            ${m.prefix !== "ALU" ? `<button class="btn sm" data-act="member-grad" data-base="${esc(base)}">졸업 처리</button>` : ""}
            <button class="btn sm danger" data-act="member-del" data-base="${esc(base)}">삭제</button></span>
        </div>`;
      }).join("")}
    </div>`;
  }).join("")}`;
}

/* 프로필 편집 폼 (추가·수정 공용) */
function memberForm(d, prefix, { isNew = false } = {}) {
  const alumni = prefix === "ALU";
  const courseOpts = PREFIX_ORDER.map(p => [p, `${COURSE[p]} (${p})`]);
  return `
    ${isNew ? F.select("과정", "prefix", courseOpts, prefix, { hint: "파일 이름 앞부분(PREFIX)이 됩니다. 순번은 그 과정의 맨 뒤 번호로 자동 배정" }) : ""}
    <div class="grid2">
      ${F.text("이름 (영문)", "name", d.name, { ph: "Gildong Hong", hint: "파일 이름은 여기서 자동으로 만듭니다 (GildongHong)" })}
      ${F.text("한글 이름", "kor", d.kor)}
      ${F.text("저자명 (논문에 실리는 다른 표기, 쉼표로)", "authorNames", d.authorNames, { ph: "Gil-Dong Hong, G. D. Hong" })}
      ${alumni ? F.text("학위", "degree", d.degree, { ph: "B.S. (Electronics)" }) : F.text("직함 (비우면 기본값)", "role", d.role, { ph: DEFAULT_ROLE[prefix] || "" })}
      ${F.text("이메일", "email", d.email)}
      ${F.text("Google Scholar 주소", "scholar", d.scholar, { hint: "적은 사람만 연구실 논문이 카드에 자동으로 채워집니다" })}
    </div>
    ${alumni ? F.text("현재 (진로·소속)", "now", d.now, { ph: "회사명 — 직무" }) : F.text("키워드 (연구 분야 한 줄, 쉼표로)", "interests", d.interests, { ph: "Soft robotics, Tactile sensors" })}
    ${alumni ? "" : `
      ${F.area("소개 (한두 문장)", "bio", d.bio, { rows: 2 })}
      <div class="grid2">
        ${F.text("창업 (회사명 — 역할)", "startup", d.startup, { ph: "EverPaws — Founder & Project Lead", hint: "채우면 Startup 칸과 FOUNDER 배지가 생깁니다" })}
        ${F.area("창업내용 (한 줄에 하나)", "startupItems", d.startupItems.join("\n"), { rows: 3 })}
      </div>
      ${F.area("논문 (한 줄에 하나)", "pubs", d.pubs.join("\n"), { rows: 3, ph: "논문 제목 — <i>저널명</i>, 2026", hint: "Scholar 주소를 적은 사람은 연구실 논문이 자동으로 들어가므로 그 밖의 논문만" })}
      <div class="grid2">
        ${F.area("특허 (한 줄에 하나)", "patents", d.patents.join("\n"), { rows: 2 })}
        ${F.area("수상 (한 줄에 하나)", "awards", d.awards, { rows: 2 })}
      </div>`}
    ${F.text("직책 태그 (쉼표로)", "tags", d.tags.join(", "), { ph: "랩장 / 부랩장 / 페이지 관리자", hint: "랩장→LAB LEADER, 부랩장→VICE LEADER, 페이지 관리자→WEB ADMIN. 창업이 있으면 FOUNDER 는 자동" })}
    ${F.file("사진 (선택 — 고르면 교체)", "photo", { hint: "세로가 조금 긴 증명사진 권장. 기본으로 800px 로 줄여 jpg 로 저장합니다" })}
    ${F.check("사진을 원본 그대로 올리기 (줄이지 않음)", "keepOriginal")}`;
}
function readMemberForm(form, prefix) {
  const alumni = prefix === "ALU";
  const d = {
    name: val(form, "name"), kor: val(form, "kor"), authorNames: val(form, "authorNames"), role: alumni ? "" : val(form, "role"),
    email: val(form, "email"), scholar: val(form, "scholar"), interests: alumni ? "" : val(form, "interests"), bio: alumni ? "" : val(form, "bio"),
    startup: alumni ? "" : val(form, "startup"), startupItems: alumni ? [] : lines(val(form, "startupItems")),
    pubs: alumni ? [] : lines(val(form, "pubs")), patents: alumni ? [] : lines(val(form, "patents")), awards: alumni ? [] : lines(val(form, "awards")),
    tags: splitComma(val(form, "tags")), degree: alumni ? val(form, "degree") : "", now: alumni ? val(form, "now") : ""
  };
  if (!d.name) throw new Error("영문 이름은 꼭 적어야 합니다");
  if (!enName(d.name)) throw new Error("영문 이름에는 영문자가 들어가야 합니다 (파일 이름에 쓰입니다)");
  if (d.scholar && !/^https?:\/\//.test(d.scholar)) throw new Error("Google Scholar 주소는 https:// 로 시작해야 합니다");
  return d;
}
/* 사진 파일 변경 목록: 새 사진이 있으면 추가 + 다른 확장자 삭제, 이름이 바뀌면 기존 사진 이름 바꾸기 */
async function photoChanges(m, newBase, form) {
  const changes = [];
  const f = filesOf(form, "photo")[0];
  if (f) {
    const img = await prepareImage(f, { maxDim: 800, keepOriginal: chk(form, "keepOriginal") });
    const path = `members/${newBase}.${img.ext}`;
    changes.push({ path, bytes: img.bytes });
    for (const old of (m?.images || [])) if (old.path !== path) changes.push({ path: old.path, delete: true });
  } else if (m && newBase !== m.base) {
    for (const old of m.images) { changes.push({ path: `members/${newBase}.${old.ext}`, sha: old.sha }); changes.push({ path: old.path, delete: true }); }
  }
  return changes;
}
async function memberEdit(base) {
  const list = await loadMembers(); const m = list.find(x => x.base === base); if (!m) return;
  await modal(`프로필 수정 — ${memberLabel(m)}`, memberForm(m.data, m.prefix), {
    wide: true, onOpen: wirePreviews,
    onSave: async form => {
      const d = readMemberForm(form, m.prefix);
      const newBase = `${m.prefix}-${pad(m.order)}-${enName(d.name)}`;
      if (newBase !== m.base && list.some(x => x.base === newBase)) throw new Error(`같은 이름의 파일이 이미 있습니다: ${newBase}`);
      const changes = [{ path: `members/${newBase}.txt`, text: memberTxt(d, m.prefix) }];
      if (newBase !== m.base && m.txt) changes.push({ path: m.txt.path, delete: true });
      changes.push(...await photoChanges(m, newBase, form));
      await need().commit(changes, `구성원 프로필 수정: ${d.name}`);
    }
  }) && after("프로필을 저장했습니다");
}
async function memberNew(prefix = "MS") {
  const list = await loadMembers();
  const blank = memberData({}, null);
  await modal("구성원 추가", memberForm(blank, prefix, { isNew: true }), {
    wide: true,
    onOpen: form => { wirePreviews(form); form.elements.prefix.onchange = () => { /* 과정에 따라 칸이 달라지므로 다시 연다 */ const p = form.elements.prefix.value; $("#modal").close(); setTimeout(() => memberNew(p), 0); }; },
    onSave: async form => {
      const p = val(form, "prefix") || prefix;
      const d = readMemberForm(form, p);
      const base = `${p}-${pad(nextOrder(list, p))}-${enName(d.name)}`;
      if (list.some(x => x.base === base)) throw new Error(`같은 이름의 파일이 이미 있습니다: ${base}`);
      const changes = [{ path: `members/${base}.txt`, text: memberTxt(d, p) }, ...await photoChanges(null, base, form)];
      await need().commit(changes, `구성원 추가: ${d.name} (${base})`);
    }
  }) && after("구성원을 추가했습니다 — 사진이 없으면 1~2분 뒤 자리표시 그림이 자동으로 생깁니다");
}
async function memberDelete(base) {
  const list = await loadMembers(); const m = list.find(x => x.base === base); if (!m) return;
  if (!confirmBox(`${memberLabel(m)} (${m.base}) 의 프로필과 사진을 삭제할까요? 되돌릴 수 없습니다.`)) return;
  const changes = [];
  if (m.txt) changes.push({ path: m.txt.path, delete: true });
  for (const im of m.images) changes.push({ path: im.path, delete: true });
  if (await run("삭제 중…", () => need().commit(changes, `구성원 삭제: ${m.data.name} (${m.base})`))) after("삭제했습니다");
}
/* 과정 변경(졸업 처리 포함): 접두사 바꾸고 그 과정의 맨 뒤 순번으로. 파일 양식은 새 과정에 맞춰 다시 씀 */
async function memberMove(base, toPrefix = null) {
  const list = await loadMembers(); const m = list.find(x => x.base === base); if (!m) return;
  const opts = PREFIX_ORDER.filter(p => p !== m.prefix).map(p => [p, `${COURSE[p]} (${p})`]);
  const target = toPrefix || opts[0][0];
  const alumniFields = (p, d) => p === "ALU" ? `<div class="grid2">${F.text("학위", "degree", d.degree, { ph: "B.S. (Electronics)" })}${F.text("현재 (진로·소속)", "now", d.now, { ph: "회사명 — 직무" })}</div>` : "";
  await modal(toPrefix === "ALU" ? `졸업 처리 — ${memberLabel(m)}` : `과정 변경 — ${memberLabel(m)}`,
    `${F.select("옮길 과정", "to", opts, target)}<div id="alu-fields">${alumniFields(target, m.data)}</div>
     <div class="note">현재: <b>${esc(m.base)}</b> → 새 과정의 맨 뒤 순번으로 옮겨집니다. 사진은 그대로 따라갑니다.${m.prefix !== "ALU" ? " 졸업생으로 옮기면 상세 패널(소개·논문 등)은 사라지고 학위·현재 칸이 생깁니다." : ""}</div>`, {
    save: "옮기기",
    onOpen: form => { form.elements.to.onchange = () => { $("#alu-fields", form).innerHTML = alumniFields(form.elements.to.value, m.data); }; },
    onSave: async form => {
      const p = val(form, "to");
      const d = { ...m.data, degree: p === "ALU" ? val(form, "degree") : "", now: p === "ALU" ? val(form, "now") : "" };
      if (p === "ALU" && !d.degree) throw new Error("학위를 적으세요 (예: B.S. (Electronics))");
      const newBase = `${p}-${pad(nextOrder(list, p))}-${enName(d.name) || m.name}`;
      const changes = [{ path: `members/${newBase}.txt`, text: memberTxt(d, p) }];
      if (m.txt) changes.push({ path: m.txt.path, delete: true });
      for (const im of m.images) { changes.push({ path: `members/${newBase}.${im.ext}`, sha: im.sha }); changes.push({ path: im.path, delete: true }); }
      await need().commit(changes, `${p === "ALU" ? "졸업 처리" : "과정 변경"}: ${d.name} ${m.base} → ${newBase}`);
    }
  }) && after("옮겼습니다");
}
function orderMove(prefix, base, dir) {
  const arr = groupOrder(prefix).slice(); const i = arr.indexOf(base); const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]]; state.order[prefix] = arr; show("members");
}
async function orderSave(prefix) {
  const list = await loadMembers(); const arr = state.order[prefix]; if (!arr) return;
  const changes = [];
  arr.forEach((base, i) => {
    const m = list.find(x => x.base === base); const ord = i + 1;
    if (!m || m.order === ord) return;
    const newBase = `${prefix}-${pad(ord)}-${m.name}`;
    if (m.txt) { changes.push({ path: `members/${newBase}.txt`, sha: m.txt.sha }); changes.push({ path: m.txt.path, delete: true }); }
    for (const im of m.images) { changes.push({ path: `members/${newBase}.${im.ext}`, sha: im.sha }); changes.push({ path: im.path, delete: true }); }
  });
  if (!changes.length) { delete state.order[prefix]; show("members"); return; }
  /* 같은 경로가 삭제와 추가에 함께 나오면(자리 맞바꿈) 추가만 남긴다 */
  const adds = new Set(changes.filter(c => !c.delete).map(c => c.path));
  const final = changes.filter(c => !(c.delete && adds.has(c.path)));
  if (await run("순서 저장 중…", () => need().commit(final, `구성원 순서 변경 (${COURSE[prefix]})`))) after("순서를 저장했습니다");
}
function after(msg) { toast(msg + " — 1~2분 뒤 사이트에 반영됩니다"); invalidate(); show(state.tab); }

/* ================================================================
   3. 갤러리 — gallery/G-연도-순번-이름/ (제목.txt + 사진)
   ================================================================ */
async function loadGallery() {
  if (state.gallery) return state.gallery;
  const g = need();
  const dirs = (await g.ls("gallery")).filter(f => f.type === "dir" && GALLERY_DIR_RE.test(f.name));
  const list = dirs.map(d => { const m = d.name.match(GALLERY_DIR_RE); return { base: d.name, year: m[1], order: +m[2], name: m[3], files: [], images: [], txt: null, title: "", titleEn: "" }; })
    .sort((a, b) => b.year.localeCompare(a.year) || a.order - b.order || natural(a.base, b.base));
  await pool(list, 4, async ev => {
    ev.files = (await g.ls(`gallery/${ev.base}`)).filter(f => f.type === "file");
    ev.images = ev.files.filter(f => IMG_RE.test(f.name)).sort((a, b) => natural(a.name, b.name));
    ev.txt = ev.files.find(f => /^제목\.txt$/i.test(f.name)) || ev.files.find(f => /\.txt$/i.test(f.name)) || null;
    if (ev.txt) { try { const kv = parseKV((await g.readFile(ev.txt.path)).text, ["제목", "영문"]); ev.title = kv["제목"] || ""; ev.titleEn = kv["영문"] || ""; } catch (e) { console.warn(e); } }
  });
  state.gallery = list;
  return list;
}
const titleTxt = (title, en) => `제목: ${title}\n영문: ${en}\n`;
async function renderGallery(view) {
  const list = await loadGallery();
  const years = [...new Set(list.map(e => e.year))];
  view.innerHTML = `
  <h1>갤러리</h1>
  <p class="lead">행사 폴더마다 국문·영문 제목과 사진이 있습니다. 사진은 올릴 때 1600px 로 줄여 jpg 로 저장합니다.</p>
  <div class="btns" style="margin-bottom:14px"><button class="btn primary" data-act="gal-new">＋ 행사 추가</button></div>
  ${years.map(y => `<h2 style="margin:18px 0 8px">${esc(y)}</h2>` + list.filter(e => e.year === y).map((ev, i, arr) => `
    <div class="card" data-base="${esc(ev.base)}">
      <div class="head">
        <span class="btns"><button class="btn icon sm" data-act="gal-move" data-base="${esc(ev.base)}" data-dir="-1"${i === 0 ? " disabled" : ""}>▲</button><button class="btn icon sm" data-act="gal-move" data-base="${esc(ev.base)}" data-dir="1"${i === arr.length - 1 ? " disabled" : ""}>▼</button></span>
        <div class="grow"><h2>${esc(ev.title || ev.name)}${ev.titleEn ? ` <span class="hint" style="font-weight:400">· ${esc(ev.titleEn)}</span>` : ""}</h2><span class="hint">${esc(ev.base)} · 사진 ${ev.images.length}장</span></div>
        <button class="btn sm" data-act="gal-photos" data-base="${esc(ev.base)}">＋ 사진 추가</button>
        <button class="btn sm" data-act="gal-edit" data-base="${esc(ev.base)}">제목 수정</button>
        <button class="btn sm danger" data-act="gal-del" data-base="${esc(ev.base)}">행사 삭제</button>
      </div>
      ${ev.images.length ? `<div class="photos">${ev.images.map(im => `<figure><img src="${esc(im.download_url)}" alt="" loading="lazy"><figcaption>${esc(im.name)}</figcaption><button class="del" data-act="gal-photo-del" data-base="${esc(ev.base)}" data-path="${esc(im.path)}" title="이 사진 삭제">✕</button></figure>`).join("")}</div>` : `<p class="hint">아직 사진이 없습니다 (사이트에는 "Photos coming soon" 으로 표시)</p>`}
    </div>`).join("")).join("")}`;
}
function galleryForm(ev) {
  return `<div class="grid2">${F.text("연도", "year", ev?.year || thisYear(), { ph: "2026" })}${F.text("폴더 이름 (비우면 제목에서 자동)", "name", ev?.name || "", { hint: "화면에는 안 나옵니다. 한글 가능, 공백은 - 로" })}</div>
    ${F.text("제목 (국문)", "title", ev?.title || "", { ph: "IEIE 추계학술대회 (광주)" })}${F.text("영문 제목", "titleEn", ev?.titleEn || "")}`;
}
async function galleryNew() {
  const list = await loadGallery();
  await modal("행사 추가", galleryForm(null) + F.file("사진 (여러 장 선택 가능)", "photos", { multiple: true }) + F.check("사진을 원본 그대로 올리기", "keepOriginal"), {
    wide: true, onOpen: wirePreviews,
    onSave: async form => {
      const year = val(form, "year"), title = val(form, "title");
      if (!/^\d{4}$/.test(year)) throw new Error("연도는 숫자 4자리로 적으세요");
      if (!title) throw new Error("제목을 적으세요");
      const name = safeName(val(form, "name") || title); if (!name) throw new Error("폴더 이름을 만들 수 없습니다 — 폴더 이름 칸을 직접 적으세요");
      const order = Math.max(0, ...list.filter(e => e.year === year).map(e => e.order)) + 1;
      const base = `G-${year}-${pad(order)}-${name}`;
      if (list.some(e => e.base === base)) throw new Error(`같은 이름의 행사 폴더가 있습니다: ${base}`);
      const changes = [{ path: `gallery/${base}/제목.txt`, text: titleTxt(title, val(form, "titleEn")) }];
      let n = 0;
      for (const f of filesOf(form, "photos")) { const img = await prepareImage(f, { maxDim: 1600, keepOriginal: chk(form, "keepOriginal") }); changes.push({ path: `gallery/${base}/${pad(++n, 2)}.${img.ext}`, bytes: img.bytes }); }
      await need().commit(changes, `갤러리 행사 추가: ${title}${n ? ` (사진 ${n}장)` : ""}`);
    }
  }) && after("행사를 추가했습니다");
}
async function galleryEdit(base) {
  const list = await loadGallery(); const ev = list.find(e => e.base === base); if (!ev) return;
  await modal(`제목 수정 — ${ev.title || ev.name}`, galleryForm(ev), {
    onSave: async form => {
      const year = val(form, "year"), title = val(form, "title"), name = safeName(val(form, "name") || title);
      if (!/^\d{4}$/.test(year)) throw new Error("연도는 숫자 4자리로 적으세요");
      if (!title || !name) throw new Error("제목을 적으세요");
      const order = year === ev.year ? ev.order : Math.max(0, ...list.filter(e => e.year === year).map(e => e.order)) + 1;
      const newBase = `G-${year}-${pad(order)}-${name}`;
      const changes = [];
      if (newBase !== ev.base) {                       // 폴더 이름 바꾸기 = 안의 파일 전부 옮기기
        if (list.some(e => e.base === newBase)) throw new Error(`같은 이름의 행사 폴더가 있습니다: ${newBase}`);
        for (const f of ev.files) if (f !== ev.txt) { changes.push({ path: `gallery/${newBase}/${f.name}`, sha: f.sha }); changes.push({ path: f.path, delete: true }); }
        if (ev.txt && ev.txt.name !== "제목.txt") changes.push({ path: ev.txt.path, delete: true });
        changes.push({ path: `gallery/${newBase}/제목.txt`, text: titleTxt(title, val(form, "titleEn")) });
        if (ev.txt && ev.txt.name === "제목.txt") changes.push({ path: ev.txt.path, delete: true });
      } else {
        if (ev.txt && ev.txt.name !== "제목.txt") changes.push({ path: ev.txt.path, delete: true });
        changes.push({ path: `gallery/${ev.base}/제목.txt`, text: titleTxt(title, val(form, "titleEn")) });
      }
      await need().commit(changes, `갤러리 제목 수정: ${title}`);
    }
  }) && after("저장했습니다");
}
async function galleryPhotos(base) {
  const list = await loadGallery(); const ev = list.find(e => e.base === base); if (!ev) return;
  await modal(`사진 추가 — ${ev.title || ev.name}`, F.file("사진 (여러 장 선택 가능)", "photos", { multiple: true, hint: "파일 이름 순서대로 번호가 이어집니다" }) + F.check("사진을 원본 그대로 올리기", "keepOriginal"), {
    save: "올리기", onOpen: wirePreviews,
    onSave: async form => {
      const files = filesOf(form, "photos"); if (!files.length) throw new Error("사진을 고르세요");
      let n = Math.max(0, ...ev.images.map(im => +(im.name.match(/^(\d+)/) || [0, 0])[1]), ev.images.length);
      const changes = [];
      for (const f of files.sort((a, b) => natural(a.name, b.name))) { const img = await prepareImage(f, { maxDim: 1600, keepOriginal: chk(form, "keepOriginal") }); changes.push({ path: `gallery/${ev.base}/${pad(++n, 2)}.${img.ext}`, bytes: img.bytes }); }
      await need().commit(changes, `갤러리 사진 추가: ${ev.title || ev.name} (${files.length}장)`);
    }
  }) && after("사진을 올렸습니다");
}
async function galleryPhotoDelete(base, path) {
  if (!confirmBox(`사진 ${path.split("/").pop()} 을(를) 삭제할까요?`)) return;
  if (await run("삭제 중…", () => need().commit([{ path, delete: true }], `갤러리 사진 삭제: ${path}`))) after("삭제했습니다");
}
async function galleryDelete(base) {
  const list = await loadGallery(); const ev = list.find(e => e.base === base); if (!ev) return;
  if (!confirmBox(`행사 "${ev.title || ev.name}" 폴더와 사진 ${ev.images.length}장을 모두 삭제할까요? 되돌릴 수 없습니다.`)) return;
  if (await run("삭제 중…", () => need().commit(ev.files.map(f => ({ path: f.path, delete: true })), `갤러리 행사 삭제: ${ev.title || ev.name}`))) after("삭제했습니다");
}
async function galleryMove(base, dir) {
  const list = await loadGallery(); const ev = list.find(e => e.base === base); if (!ev) return;
  const same = list.filter(e => e.year === ev.year); const i = same.indexOf(ev), j = i + dir;
  if (j < 0 || j >= same.length) return;
  const other = same[j];
  const rename = (e, ord) => { const nb = `G-${e.year}-${pad(ord)}-${e.name}`; return e.files.flatMap(f => [{ path: `gallery/${nb}/${f.name}`, sha: f.sha }, { path: f.path, delete: true }]); };
  const changes = [...rename(ev, other.order), ...rename(other, ev.order)];
  const adds = new Set(changes.filter(c => !c.delete).map(c => c.path));
  if (await run("순서 바꾸는 중…", () => need().commit(changes.filter(c => !(c.delete && adds.has(c.path))), `갤러리 순서 변경: ${ev.title || ev.name} ↔ ${other.title || other.name}`))) after("순서를 바꿨습니다");
}

/* ================================================================
   4. 연구 분야 — research/R-NNN-Name.(txt|이미지)
   ================================================================ */
async function loadResearch() {
  if (state.research) return state.research;
  const g = need(); const map = new Map();
  for (const f of await g.ls("research")) {
    if (f.type !== "file") continue;
    const m = f.name.match(RESEARCH_RE); if (!m) continue;
    const ext = m[3].toLowerCase(), base = f.name.slice(0, -(m[3].length + 1));
    const e = map.get(base) || { base, order: +m[1], name: m[2], txt: null, images: [] };
    if (ext === "txt") e.txt = f; else e.images.push({ ...f, ext });
    map.set(base, e);
  }
  const list = [...map.values()].sort((a, b) => a.order - b.order || natural(a.base, b.base));
  await pool(list, 6, async e => {
    e.image = e.images.slice().sort(byExtPriority)[0] || null; e.title = ""; e.desc = "";
    if (e.txt) { try { const kv = parseKV((await g.readFile(e.txt.path)).text, ["제목", "요약", "설명"]); e.title = kv["제목"] || ""; e.desc = kv["요약"] || kv["설명"] || ""; } catch (err) { console.warn(err); } }
  });
  state.research = list; return list;
}
const researchTxt = (title, desc) => `# ─────────────────────────────────────────────────────
# 연구 분야 — Research 페이지의 한 항목
# 같은 이름의 이미지(R-번호-이름.jpg/.png)가 왼쪽에, 아래 내용이 오른쪽에 표시됩니다.
# 순번(001, 002…)이 곧 표시 순서입니다. 항목 추가는 README.md 참고.
# ─────────────────────────────────────────────────────

제목: ${title}
요약: ${desc}
`;
async function renderResearch(view) {
  const list = await loadResearch();
  view.innerHTML = `
  <h1>연구 분야</h1>
  <p class="lead">Research 페이지와 홈 화면의 연구 카드입니다. 순번이 곧 표시 순서입니다.</p>
  <div class="btns" style="margin-bottom:14px"><button class="btn primary" data-act="res-new">＋ 연구 분야 추가</button></div>
  <div class="card">${list.map((e, i) => `
    <div class="row" data-base="${esc(e.base)}">
      <span class="btns"><button class="btn icon sm" data-act="res-move" data-base="${esc(e.base)}" data-dir="-1"${i === 0 ? " disabled" : ""}>▲</button><button class="btn icon sm" data-act="res-move" data-base="${esc(e.base)}" data-dir="1"${i === list.length - 1 ? " disabled" : ""}>▼</button></span>
      <span class="ord">${pad(e.order)}</span>
      ${e.image ? `<img class="thumb wide" src="${esc(e.image.download_url)}" alt="">` : `<span class="thumb wide"></span>`}
      <div class="main"><b>${esc(e.title || e.name)}</b><small>${esc(e.base)} · ${esc(e.desc)}</small></div>
      <span class="btns"><button class="btn sm" data-act="res-edit" data-base="${esc(e.base)}">수정</button><button class="btn sm danger" data-act="res-del" data-base="${esc(e.base)}">삭제</button></span>
    </div>`).join("") || `<p class="hint">아직 없습니다</p>`}</div>`;
}
const researchForm = e => `${F.text("제목", "title", e?.title || "", { ph: "Soft Robot & Electronics" })}${F.area("요약 (한두 문장)", "desc", e?.desc || "", { rows: 3 })}
  ${F.text("파일 이름 (비우면 제목에서 자동)", "name", e?.name || "", { hint: "영문·숫자만 (예: SoftRobotElectronics)" })}
  ${F.file(e ? "이미지 (선택 — 고르면 교체)" : "이미지", "image", { hint: "가로형 사진 권장. 1200px 로 줄여 jpg 로 저장" })}${F.check("이미지를 원본 그대로 올리기", "keepOriginal")}`;
async function researchNew() {
  const list = await loadResearch();
  await modal("연구 분야 추가", researchForm(null), {
    onOpen: wirePreviews,
    onSave: async form => {
      const title = val(form, "title"); if (!title) throw new Error("제목을 적으세요");
      const name = enName(val(form, "name") || title); if (!name) throw new Error("파일 이름을 만들 수 없습니다 — 파일 이름 칸을 영문으로 적으세요");
      const base = `R-${pad(Math.max(0, ...list.map(e => e.order)) + 1)}-${name}`;
      const changes = [{ path: `research/${base}.txt`, text: researchTxt(title, val(form, "desc")) }];
      const f = filesOf(form, "image")[0];
      if (f) { const img = await prepareImage(f, { maxDim: 1200, keepOriginal: chk(form, "keepOriginal") }); changes.push({ path: `research/${base}.${img.ext}`, bytes: img.bytes }); }
      await need().commit(changes, `연구 분야 추가: ${title}`);
    }
  }) && after("추가했습니다");
}
async function researchEdit(base) {
  const list = await loadResearch(); const e = list.find(x => x.base === base); if (!e) return;
  await modal(`연구 분야 수정 — ${e.title || e.name}`, researchForm(e), {
    onOpen: wirePreviews,
    onSave: async form => {
      const title = val(form, "title"); if (!title) throw new Error("제목을 적으세요");
      const name = enName(val(form, "name") || title) || e.name;
      const newBase = `R-${pad(e.order)}-${name}`;
      if (newBase !== e.base && list.some(x => x.base === newBase)) throw new Error(`같은 이름의 파일이 있습니다: ${newBase}`);
      const changes = [{ path: `research/${newBase}.txt`, text: researchTxt(title, val(form, "desc")) }];
      if (newBase !== e.base && e.txt) changes.push({ path: e.txt.path, delete: true });
      const f = filesOf(form, "image")[0];
      if (f) {
        const img = await prepareImage(f, { maxDim: 1200, keepOriginal: chk(form, "keepOriginal") }); const path = `research/${newBase}.${img.ext}`;
        changes.push({ path, bytes: img.bytes });
        for (const old of e.images) if (old.path !== path) changes.push({ path: old.path, delete: true });
      } else if (newBase !== e.base) {
        for (const old of e.images) { changes.push({ path: `research/${newBase}.${old.ext}`, sha: old.sha }); changes.push({ path: old.path, delete: true }); }
      }
      await need().commit(changes, `연구 분야 수정: ${title}`);
    }
  }) && after("저장했습니다");
}
async function researchDelete(base) {
  const list = await loadResearch(); const e = list.find(x => x.base === base); if (!e) return;
  if (!confirmBox(`연구 분야 "${e.title || e.name}" 을(를) 삭제할까요?`)) return;
  const changes = [...(e.txt ? [{ path: e.txt.path, delete: true }] : []), ...e.images.map(im => ({ path: im.path, delete: true }))];
  if (await run("삭제 중…", () => need().commit(changes, `연구 분야 삭제: ${e.title || e.name}`))) after("삭제했습니다");
}
async function researchMove(base, dir) {
  const list = await loadResearch(); const i = list.findIndex(x => x.base === base), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const a = list[i], b = list[j];
  const rename = (e, ord) => { const nb = `R-${pad(ord)}-${e.name}`; const fs = [...(e.txt ? [e.txt] : []), ...e.images]; return fs.flatMap(f => [{ path: `research/${nb}.${f === e.txt ? "txt" : f.ext}`, sha: f.sha }, { path: f.path, delete: true }]); };
  const changes = [...rename(a, b.order), ...rename(b, a.order)];
  const adds = new Set(changes.filter(c => !c.delete).map(c => c.path));
  if (await run("순서 바꾸는 중…", () => need().commit(changes.filter(c => !(c.delete && adds.has(c.path))), `연구 분야 순서 변경: ${a.title || a.name} ↔ ${b.title || b.name}`))) after("순서를 바꿨습니다");
}

/* ================================================================
   5. 뉴스 · 6. 특허 — data/news.txt · data/patents.txt (묶음 파일)
   ================================================================ */
/* 머리 설명(첫 묶음 앞의 줄들)은 그대로 두고 묶음만 다시 씁니다 */
function splitBlocks(raw, startKey) {
  const ls = String(raw).replace(/^﻿/, "").split(/\r?\n/);
  const idx = ls.findIndex(l => new RegExp(`^${startKey}\\s*[:：]`).test(l));
  const header = (idx < 0 ? ls : ls.slice(0, idx)).join("\n").replace(/\s+$/, "");
  return { header };
}
const NEWS_KEYS = ["날짜", "제목", "내용", "본문", "링크", "사진"], PAT_KEYS = ["번호", "연도", "제목", "발명자", "등록번호", "국가", "뱃지"];
async function loadNews() {
  if (state.news) return state.news;
  const raw = (await need().readFile("data/news.txt")).text;
  state.news = { header: splitBlocks(raw, "날짜").header, recs: parseBlocks(raw, "날짜", NEWS_KEYS).map(r => Object.fromEntries(NEWS_KEYS.map(k => [k, r[k] || ""]))) };
  return state.news;
}
const newsText = (header, recs) => header + "\n\n" + recs.map(r => ["날짜", "제목", "내용", ...(r["본문"] ? ["본문"] : []), "링크", "사진"].map(k => `${k}: ${r[k] || ""}`.replace(/\s+$/, "")).join("\n")).join("\n\n") + "\n";
async function loadPatents() {
  if (state.patents) return state.patents;
  const raw = (await need().readFile("data/patents.txt")).text;
  state.patents = { header: splitBlocks(raw, "번호").header, recs: parseBlocks(raw, "번호", PAT_KEYS).map(r => Object.fromEntries(PAT_KEYS.map(k => [k, r[k] || ""]))) };
  return state.patents;
}
const patentsText = (header, recs) => header + "\n\n" + recs.map(r => ["번호", "연도", "제목", "발명자", "등록번호", "국가", ...(r["뱃지"] ? ["뱃지"] : [])].map(k => `${k}: ${r[k] || ""}`.replace(/\s+$/, "")).join("\n")).join("\n\n") + "\n";

async function renderNews(view) {
  const { recs } = await loadNews();
  view.innerHTML = `
  <h1>뉴스</h1>
  <p class="lead">파일 맨 아래 묶음이 사이트에서 맨 위(최신)에 보입니다. 표는 사이트와 같은 순서(최신이 위)입니다.</p>
  <div class="btns" style="margin-bottom:14px"><button class="btn primary" data-act="news-new">＋ 소식 추가</button></div>
  <div class="card"><table class="t"><thead><tr><th>#</th><th>날짜</th><th>제목</th><th>사진</th><th>링크</th><th></th></tr></thead><tbody>
    ${recs.map((r, i) => ({ r, i })).reverse().map(({ r, i }) => `<tr>
      <td class="num">${recs.length - i}</td><td>${esc(r["날짜"])}</td><td><b>${esc(r["제목"])}</b><br><small class="hint">${esc(r["내용"]).slice(0, 90)}</small></td>
      <td>${r["사진"] ? "📷" : ""}</td><td>${r["링크"] ? "🔗" : ""}</td>
      <td class="act"><button class="btn icon sm" data-act="news-move" data-i="${i}" data-dir="1" title="위로(더 최신으로)"${i === recs.length - 1 ? " disabled" : ""}>▲</button><button class="btn icon sm" data-act="news-move" data-i="${i}" data-dir="-1" title="아래로"${i === 0 ? " disabled" : ""}>▼</button>
        <button class="btn sm" data-act="news-edit" data-i="${i}">수정</button><button class="btn sm danger" data-act="news-del" data-i="${i}">삭제</button></td></tr>`).join("")}
  </tbody></table></div>`;
}
const newsForm = r => `<div class="grid2">${F.text("날짜", "날짜", r?.["날짜"] || thisYear(), { ph: "2026-03 또는 2026", hint: "화면에는 연도만 표시" })}${F.text("링크 (선택)", "링크", r?.["링크"] || "", { ph: "https://…" })}</div>
  ${F.text("제목", "제목", r?.["제목"] || "")}${F.area("내용 (항상 보이는 한두 문장)", "내용", r?.["내용"] || "", { rows: 2 })}
  ${F.area("본문 (선택 — 눌렀을 때 펼쳐지는 전체 내용, 줄바꿈은 <br>)", "본문", r?.["본문"] || "", { rows: 4 })}
  ${F.text("사진 경로 (선택)", "사진", r?.["사진"] || "", { ph: "images/news/2026-03-xxx.jpg", hint: "아래에서 파일을 고르면 자동으로 채워집니다" })}
  ${F.file("사진 올리기 (선택)", "photo", { hint: "1400px 로 줄여 images/news/ 에 저장" })}${F.check("사진을 원본 그대로 올리기", "keepOriginal")}`;
async function newsSave(index) {
  const { header, recs } = await loadNews(); const r = index == null ? null : recs[index];
  await modal(r ? "소식 수정" : "소식 추가", newsForm(r), {
    wide: true, onOpen: wirePreviews,
    onSave: async form => {
      const rec = Object.fromEntries(NEWS_KEYS.map(k => [k, val(form, k)]));
      if (!rec["날짜"] || !rec["제목"]) throw new Error("날짜와 제목은 꼭 적으세요");
      const changes = [];
      const f = filesOf(form, "photo")[0];
      if (f) {
        const img = await prepareImage(f, { maxDim: 1400, keepOriginal: chk(form, "keepOriginal") });
        const slug = (rec["제목"].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "news") + "-" + Date.now().toString(36);
        rec["사진"] = `images/news/${rec["날짜"].slice(0, 4)}-${slug}.${img.ext}`;
        changes.push({ path: rec["사진"], bytes: img.bytes });
      }
      const next = recs.slice(); if (r) next[index] = rec; else next.push(rec);
      changes.push({ path: "data/news.txt", text: newsText(header, next) });
      await need().commit(changes, `${r ? "뉴스 수정" : "뉴스 추가"}: ${rec["제목"]}`);
    }
  }) && after("저장했습니다");
}
async function newsDelete(index) {
  const { header, recs } = await loadNews(); const r = recs[index]; if (!r) return;
  if (!confirmBox(`소식 "${r["제목"]}" 을(를) 삭제할까요?`)) return;
  const next = recs.filter((_, i) => i !== index);
  if (await run("삭제 중…", () => need().commit([{ path: "data/news.txt", text: newsText(header, next) }], `뉴스 삭제: ${r["제목"]}`))) after("삭제했습니다");
}
async function newsMove(index, dir) {
  const { header, recs } = await loadNews(); const j = index + dir; if (j < 0 || j >= recs.length) return;
  const next = recs.slice(); [next[index], next[j]] = [next[j], next[index]];
  if (await run("순서 바꾸는 중…", () => need().commit([{ path: "data/news.txt", text: newsText(header, next) }], `뉴스 순서 변경: ${recs[index]["제목"]}`))) after("순서를 바꿨습니다");
}

async function renderPatents(view) {
  const { recs } = await loadPatents();
  view.innerHTML = `
  <h1>특허</h1>
  <p class="lead">번호가 큰 것이 사이트에서 위에 보입니다. 새 특허는 자동으로 다음 번호를 받습니다.</p>
  <div class="btns" style="margin-bottom:14px"><button class="btn primary" data-act="pat-new">＋ 특허 추가</button></div>
  <div class="card"><table class="t"><thead><tr><th>번호</th><th>연도</th><th>제목</th><th>국가</th><th>등록번호</th><th></th></tr></thead><tbody>
    ${recs.map((r, i) => ({ r, i })).sort((a, b) => (+b.r["번호"] || 0) - (+a.r["번호"] || 0)).map(({ r, i }) => `<tr>
      <td class="num">${esc(r["번호"])}</td><td>${esc(r["연도"])}</td><td><b>${esc(r["제목"])}</b><br><small class="hint">${esc(r["발명자"])}</small></td><td>${esc(r["국가"])}${r["뱃지"] ? ` <span class="pill">${esc(r["뱃지"])}</span>` : ""}</td><td>${esc(r["등록번호"])}</td>
      <td class="act"><button class="btn sm" data-act="pat-edit" data-i="${i}">수정</button><button class="btn sm danger" data-act="pat-del" data-i="${i}">삭제</button></td></tr>`).join("")}
  </tbody></table></div>`;
}
const patForm = (r, nextNo) => `<div class="grid2">${F.text("번호", "번호", r?.["번호"] || String(nextNo), { hint: "큰 번호가 위에 표시" })}${F.text("연도", "연도", r?.["연도"] || thisYear())}</div>
  ${F.text("제목", "제목", r?.["제목"] || "")}${F.text("발명자", "발명자", r?.["발명자"] || "", { ph: "Da Wan Kim, Gildong Hong" })}
  <div class="grid2">${F.text("등록번호 (선택)", "등록번호", r?.["등록번호"] || "")}${F.text("국가", "국가", r?.["국가"] || "Korea Patent", { hint: "US Patent 이면 금색 배지 자동" })}</div>
  ${F.text("뱃지 (선택, 쉼표로)", "뱃지", r?.["뱃지"] || "", { ph: "기술이전" })}`;
async function patentSave(index) {
  const { header, recs } = await loadPatents(); const r = index == null ? null : recs[index];
  const nextNo = Math.max(0, ...recs.map(x => +x["번호"] || 0)) + 1;
  await modal(r ? "특허 수정" : "특허 추가", patForm(r, nextNo), {
    onSave: async form => {
      const rec = Object.fromEntries(PAT_KEYS.map(k => [k, val(form, k)]));
      if (!rec["제목"]) throw new Error("제목을 적으세요");
      if (!/^\d+$/.test(rec["번호"])) throw new Error("번호는 숫자로 적으세요");
      if (recs.some((x, i) => i !== index && x["번호"] === rec["번호"])) throw new Error(`번호 ${rec["번호"]} 은(는) 이미 있습니다`);
      const next = recs.slice(); if (r) next[index] = rec; else next.push(rec);
      await need().commit([{ path: "data/patents.txt", text: patentsText(header, next) }], `${r ? "특허 수정" : "특허 추가"}: ${rec["제목"]}`);
    }
  }) && after("저장했습니다");
}
async function patentDelete(index) {
  const { header, recs } = await loadPatents(); const r = recs[index]; if (!r) return;
  if (!confirmBox(`특허 "${r["제목"]}" 을(를) 삭제할까요?`)) return;
  const next = recs.filter((_, i) => i !== index);
  if (await run("삭제 중…", () => need().commit([{ path: "data/patents.txt", text: patentsText(header, next) }], `특허 삭제: ${r["제목"]}`))) after("삭제했습니다");
}

/* ================================================================
   7. 상장 — awards/A-연도-NNN-이름.(이미지)
   ================================================================ */
async function loadAwards() {
  if (state.awards) return state.awards;
  const list = (await need().ls("awards")).filter(f => f.type === "file").map(f => { const m = f.name.match(AWARD_RE); return m ? { ...f, year: m[1], order: +m[2], title: m[3], ext: m[4].toLowerCase() } : null; }).filter(Boolean)
    .sort((a, b) => b.year.localeCompare(a.year) || a.order - b.order);
  state.awards = list; return list;
}
async function renderAwards(view) {
  const list = await loadAwards();
  view.innerHTML = `
  <h1>상장</h1>
  <p class="lead">뉴스 페이지의 연도 칸 맨 위에 가로로 나열됩니다. 파일 이름의 이름 부분이 그대로 제목이 됩니다.</p>
  <div class="btns" style="margin-bottom:14px"><button class="btn primary" data-act="award-new">＋ 상장 추가</button></div>
  <div class="card">${list.map(a => `
    <div class="row"><span class="ord">${esc(a.year)}<br>${pad(a.order)}</span><img class="thumb wide" src="${esc(a.download_url)}" alt="">
      <div class="main"><b>${esc(a.title)}</b><small>${esc(a.name)}</small></div>
      <span class="btns"><button class="btn sm" data-act="award-edit" data-path="${esc(a.path)}">이름·연도 수정</button><button class="btn sm danger" data-act="award-del" data-path="${esc(a.path)}">삭제</button></span></div>`).join("") || `<p class="hint">아직 없습니다</p>`}</div>`;
}
const awardForm = a => `<div class="grid2">${F.text("연도", "year", a?.year || thisYear())}${F.text("순번 (같은 연도 안의 순서)", "order", a ? String(a.order) : "", { hint: "비우면 맨 뒤 번호" })}</div>
  ${F.text("상장 이름 (화면에 표시)", "title", a?.title || "", { ph: "IDF 스마트 모빌리티 해커톤 대상" })}
  ${a ? "" : F.file("상장 이미지", "image", { hint: "1400px 로 줄여 jpg 로 저장 (원본 그대로 원하면 아래 체크)" }) + F.check("이미지를 원본 그대로 올리기", "keepOriginal")}`;
async function awardSave(path) {
  const list = await loadAwards(); const a = path ? list.find(x => x.path === path) : null;
  await modal(a ? "상장 수정" : "상장 추가", awardForm(a), {
    onOpen: wirePreviews,
    onSave: async form => {
      const year = val(form, "year"), title = safeName(val(form, "title")).replace(/-/g, " ");
      if (!/^\d{4}$/.test(year)) throw new Error("연도는 숫자 4자리로 적으세요");
      if (!title) throw new Error("상장 이름을 적으세요");
      const order = val(form, "order") ? +val(form, "order") : Math.max(0, ...list.filter(x => x.year === year && x !== a).map(x => x.order)) + 1;
      if (!(order > 0)) throw new Error("순번은 1 이상의 숫자로 적으세요");
      const changes = [];
      if (a) {
        const newPath = `awards/A-${year}-${pad(order)}-${title}.${a.ext}`;
        if (newPath === a.path) throw new Error("바뀐 내용이 없습니다");
        if (list.some(x => x.path === newPath)) throw new Error("같은 이름의 상장이 이미 있습니다");
        changes.push({ path: newPath, sha: a.sha }, { path: a.path, delete: true });
      } else {
        const f = filesOf(form, "image")[0]; if (!f) throw new Error("상장 이미지를 고르세요");
        const img = await prepareImage(f, { maxDim: 1400, keepOriginal: chk(form, "keepOriginal") });
        const newPath = `awards/A-${year}-${pad(order)}-${title}.${img.ext}`;
        if (list.some(x => x.year === year && x.order === order)) throw new Error(`${year}년 ${order}번은 이미 있습니다 — 순번을 비우면 맨 뒤로 들어갑니다`);
        changes.push({ path: newPath, bytes: img.bytes });
      }
      await need().commit(changes, `${a ? "상장 수정" : "상장 추가"}: ${title}`);
    }
  }) && after("저장했습니다");
}
async function awardDelete(path) {
  const list = await loadAwards(); const a = list.find(x => x.path === path); if (!a) return;
  if (!confirmBox(`상장 "${a.title}" 을(를) 삭제할까요?`)) return;
  if (await run("삭제 중…", () => need().commit([{ path, delete: true }], `상장 삭제: ${a.title}`))) after("삭제했습니다");
}

/* ================================================================
   8. 교수 사진 · 로고 · 협력기관 로고 — images/
   ================================================================ */
const FIXED_IMAGES = [
  { key: "professor", label: "교수 사진", pathBase: "images/professor", hint: "professor.jpg 로 저장 (세로 사진, 1200px 로 줄임)", maxDim: 1200, jpg: true },
  { key: "logo", label: "상단 로고", path: "images/logo.png", hint: "투명 배경 png 그대로 (줄이지 않음)" },
  { key: "knut", label: "푸터 학교 로고 (흰색)", path: "images/knut-logo-white.png", hint: "남색 바탕용 흰색 png 그대로" },
  { key: "fav32", label: "탭 아이콘 32px", path: "images/favicon-32.png", hint: "32×32 png" },
  { key: "fav192", label: "탭 아이콘 192px", path: "images/favicon-192.png", hint: "192×192 png" },
  { key: "touch", label: "홈 화면 아이콘 (Apple)", path: "images/apple-touch-icon.png", hint: "180×180 png" }
];
async function loadImages() {
  if (state.images) return state.images;
  const g = need();
  const root = (await g.ls("images")).filter(f => f.type === "file");
  const partners = (await g.ls("images/partners")).filter(f => f.type === "file" && IMG_RE.test(f.name)).sort((a, b) => natural(a.name, b.name));
  state.images = { root, partners }; return state.images;
}
async function renderImages(view) {
  const { root, partners } = await loadImages();
  const find = p => root.find(f => f.path === p);
  view.innerHTML = `
  <h1>교수 사진 · 로고</h1>
  <p class="lead">파일을 고르면 바로 교체됩니다. 교수 프로필의 글(학력·경력 등)은 '파일 직접 편집' 에서 professor.html 을 고치세요.</p>
  <div class="card">${FIXED_IMAGES.map(it => {
    const cur = it.pathBase ? root.find(f => new RegExp(`^${it.pathBase.split("/").pop()}\\.(${IMG_EXTS.join("|")})$`, "i").test(f.name)) : find(it.path);
    return `<div class="row">${cur ? `<img class="thumb sq" src="${esc(cacheBust(cur.download_url))}" alt="" style="object-fit:contain;background:${it.key === "knut" ? "#0e1a2b" : "var(--soft)"}">` : `<span class="thumb sq"></span>`}
      <div class="main"><b>${esc(it.label)}</b><small>${esc(cur ? cur.path : (it.path || it.pathBase + ".jpg") + " (없음)")} · ${esc(it.hint)}</small></div>
      <button class="btn sm" data-act="img-replace" data-key="${it.key}">교체</button></div>`;
  }).join("")}</div>
  <div class="card"><div class="head"><h2>협력기관 로고</h2><span class="n">${partners.length}개</span><span class="grow"></span><button class="btn sm" data-act="partner-add">＋ 로고 추가</button></div>
    <p class="hint">로고 파일을 올린 뒤, 배너에 넣으려면 '파일 직접 편집' 에서 <code>data/site-data.js</code> 의 partners 목록에 파일 이름을 추가하세요 (README 7장).</p>
    <div class="photos">${partners.map(p => `<figure><img src="${esc(p.download_url)}" alt="" style="object-fit:contain;background:#fff;border:1px solid var(--line)"><figcaption>${esc(p.name)}</figcaption><button class="del" data-act="partner-del" data-path="${esc(p.path)}">✕</button></figure>`).join("")}</div></div>`;
}
async function imageReplace(key) {
  const it = FIXED_IMAGES.find(x => x.key === key); const { root } = await loadImages();
  await modal(`${it.label} 교체`, F.file("새 이미지", "image", { hint: it.hint }) + (it.jpg ? F.check("원본 그대로 올리기 (줄이지 않음)", "keepOriginal") : ""), {
    save: "교체", onOpen: wirePreviews,
    onSave: async form => {
      const f = filesOf(form, "image")[0]; if (!f) throw new Error("이미지를 고르세요");
      let changes;
      if (it.jpg) {
        const img = await prepareImage(f, { maxDim: it.maxDim, keepOriginal: chk(form, "keepOriginal") });
        const path = `${it.pathBase}.${img.ext}`; changes = [{ path, bytes: img.bytes }];
        for (const old of root) if (old.path !== path && new RegExp(`^${it.pathBase.split("/").pop()}\\.(${IMG_EXTS.join("|")})$`, "i").test(old.name)) changes.push({ path: old.path, delete: true });
      } else {
        if (extOf(f.name) !== extOf(it.path)) throw new Error(`이 파일은 .${extOf(it.path)} 형식이어야 합니다`);
        changes = [{ path: it.path, bytes: new Uint8Array(await f.arrayBuffer()) }];
      }
      await need().commit(changes, `${it.label} 교체`);
    }
  }) && after("교체했습니다 — 브라우저 캐시 때문에 잠시 옛 그림이 보일 수 있습니다");
}
async function partnerAdd() {
  const { partners } = await loadImages();
  await modal("협력기관 로고 추가", F.file("로고 파일 (png/jpg/webp)", "image") + F.text("파일 이름 (비우면 원래 이름)", "name", "", { hint: "영문·숫자·붙임표 권장 (예: knut.png)" }), {
    save: "올리기", onOpen: wirePreviews,
    onSave: async form => {
      const f = filesOf(form, "image")[0]; if (!f) throw new Error("파일을 고르세요");
      const ext = extOf(f.name); if (!IMG_EXTS.includes(ext)) throw new Error("png·jpg·webp 파일만 올릴 수 있습니다");
      const name = (safeName(val(form, "name").replace(/\.[A-Za-z0-9]+$/, "")) || safeName(f.name.replace(/\.[A-Za-z0-9]+$/, ""))) + "." + ext;
      if (partners.some(p => p.name === name)) throw new Error(`같은 이름의 파일이 있습니다: ${name}`);
      await need().commit([{ path: `images/partners/${name}`, bytes: new Uint8Array(await f.arrayBuffer()) }], `협력기관 로고 추가: ${name}`);
    }
  }) && after("올렸습니다 — site-data.js 의 partners 목록에 파일 이름을 추가해야 배너에 나옵니다");
}
async function partnerDelete(path) {
  if (!confirmBox(`${path.split("/").pop()} 을(를) 삭제할까요? site-data.js 에서도 지워야 배너가 깨지지 않습니다.`)) return;
  if (await run("삭제 중…", () => need().commit([{ path, delete: true }], `협력기관 로고 삭제: ${path}`))) after("삭제했습니다");
}

/* ================================================================
   9. 파일 직접 편집 + 캐시 번호 올리기
   ================================================================ */
const TEXT_EXT = /\.(html|css|js|mjs|md|txt|json|yml|yaml|webmanifest)$/i;
async function renderFiles(view) {
  const tree = state.tree || (state.tree = (await need().tree()).filter(t => t.type === "blob" && TEXT_EXT.test(t.path) && !t.path.startsWith(".git")).sort((a, b) => natural(a.path, b.path)));
  const groups = [["자주 고치는 파일", p => /^(professor|index|contact)\.html$|^data\/site-data\.js$|^data\/(news|patents)\.txt$/.test(p)],
                  ["구성원·연구·갤러리 텍스트", p => /^(members|research|gallery)\//.test(p)],
                  ["페이지(HTML)", p => /^[^/]+\.html$/.test(p)], ["디자인·동작(CSS·JS)", p => /^(css|js)\//.test(p)], ["설명서·기타", () => true]];
  const used = new Set();
  const options = groups.map(([label, test]) => { const items = tree.filter(t => !used.has(t.path) && test(t.path)); items.forEach(t => used.add(t.path)); return items.length ? `<optgroup label="${esc(label)}">${items.map(t => `<option value="${esc(t.path)}">${esc(t.path)}</option>`).join("")}</optgroup>` : ""; }).join("");
  view.innerHTML = `
  <h1>파일 직접 편집</h1>
  <p class="lead">화면에서 지원하지 않는 내용(교수 프로필 글, 홈 화면 문구, 연락처, 색상 등)은 파일을 직접 고칩니다. 저장하면 바로 커밋됩니다.</p>
  <div class="card">
    <div class="btns"><label class="f" style="flex:1;margin:0"><span>파일</span><select id="file-select"><option value="">— 파일을 고르세요 —</option>${options}</select></label>
      <button class="btn" id="file-open">열기</button></div>
    <div id="file-editor" hidden style="margin-top:12px">
      <div class="hint" id="file-path"></div>
      <textarea id="file-text" class="code" spellcheck="false"></textarea>
      <div class="btns" style="margin-top:10px"><input id="file-msg" placeholder="변경 내용 한 줄 (커밋 메시지)" style="flex:1;border:1px solid #cfd8e3;border-radius:8px;padding:8px 10px"><button class="btn primary" id="file-save">저장</button></div>
      <p class="hint" style="margin-top:6px">CSS/JS 를 고쳤으면 아래 '캐시 번호 올리기' 도 눌러야 방문자에게 바로 보입니다.</p>
    </div>
  </div>
  <div class="card"><div class="head"><h2>캐시 번호 올리기</h2><span class="grow"></span><button class="btn" data-act="cache-bump">캐시 번호 올리기</button></div>
    <p class="hint">모든 페이지의 <code>?v=N</code> 과 <code>js/common.js</code> 의 <code>ASSET_V</code>, README 의 안내 숫자를 한 번에 다음 번호로 올립니다 (README 13장). 글·사진만 바꿨을 때는 필요 없습니다.</p></div>`;
  let cur = null;
  $("#file-open").onclick = async () => {
    const path = $("#file-select").value; if (!path) return;
    const f = await run("파일 읽는 중…", () => need().readFile(path)); if (!f) return;
    cur = { path, sha: f.sha }; $("#file-path").textContent = `${path} (${f.size.toLocaleString()} bytes)`; $("#file-text").value = f.text; $("#file-msg").value = ""; $("#file-editor").hidden = false;
  };
  $("#file-save").onclick = async () => {
    if (!cur) return;
    const msg = $("#file-msg").value.trim() || `파일 수정: ${cur.path}`;
    if (await run("저장 중…", () => need().commit([{ path: cur.path, text: $("#file-text").value }], msg))) { toast("저장했습니다 — 1~2분 뒤 반영"); state.tree = null; }
  };
}
async function cacheBump() {
  const g = need();
  const common = await g.readFile("js/common.js");
  const m = common.text.match(/const ASSET_V = "\?v=(\d+)"/); if (!m) throw new Error("js/common.js 에서 ASSET_V 를 찾지 못했습니다");
  const n = +m[1], next = n + 1;
  if (!confirmBox(`캐시 번호를 v${n} → v${next} 로 올릴까요? (모든 html + js/common.js + README)`)) return;
  const tree = await g.tree();
  const htmls = tree.filter(t => t.type === "blob" && /(^|\/)[^/]+\.html$/.test(t.path) && !t.path.startsWith("node_modules"));
  const changes = [];
  for (const h of htmls) { const f = await g.readFile(h.path); if (f.text.includes(`?v=${n}`)) changes.push({ path: h.path, text: f.text.split(`?v=${n}`).join(`?v=${next}`) }); }
  changes.push({ path: "js/common.js", text: common.text.replace(/const ASSET_V = "\?v=\d+"/, `const ASSET_V = "?v=${next}"`) });
  try {
    const readme = await g.readFile("README.md");
    const t2 = readme.text.split(`?v=${next}`).join(`?v=${next + 1}`).split(`?v=${n}`).join(`?v=${next}`);
    if (t2 !== readme.text) changes.push({ path: "README.md", text: t2 });
  } catch {}
  await g.commit(changes, `캐시 버전 v${n} → v${next}`);
  toast(`캐시 번호를 v${next} 로 올렸습니다 (${changes.length}개 파일)`);
}

/* ================================================================
   10. 배포 상태
   ================================================================ */
async function renderStatus(view) {
  const g = need();
  const [commits, runs, pages] = await Promise.all([g.commits(8).catch(e => ({ error: e.message })), g.runs("update-manifest.yml", 5), g.pagesBuild()]);
  const fmt = d => d ? new Date(d).toLocaleString("ko-KR") : "";
  const runRows = runs?.workflow_runs?.length ? runs.workflow_runs.map(r => `<tr><td>${r.status === "completed" ? (r.conclusion === "success" ? "✅ 성공" : "❌ " + esc(r.conclusion)) : "⏳ " + esc(r.status)}</td><td>${esc(r.display_title || r.name || "")}</td><td>${fmt(r.created_at)}</td><td><a href="${esc(r.html_url)}" target="_blank" rel="noopener">보기 ↗</a></td></tr>`).join("") : `<tr><td colspan="4" class="hint">${runs ? "실행 기록 없음" : "권한 없음 (토큰에 Actions 읽기 권한이 있으면 보입니다)"}</td></tr>`;
  view.innerHTML = `
  <h1>배포 상태</h1>
  <p class="lead">저장하면 GitHub 이 1~2분 안에 사이트를 다시 만듭니다. 구성원·갤러리를 바꾸면 '자동: 목록 갱신' 작업이 한 번 더 돕니다.</p>
  <div class="card"><div class="head"><h2>사이트(GitHub Pages)</h2></div>
    <p>${pages ? `마지막 배포: <b>${esc(pages.status)}</b> · ${fmt(pages.created_at)}` : `<span class="hint">권한 없음 (토큰에 Pages 읽기 권한이 있으면 보입니다)</span>`} · <a href="${esc(state.conn?.siteUrl || "../")}" target="_blank" rel="noopener">사이트 열기 ↗</a> · <a href="https://github.com/${esc(settings.owner)}/${esc(settings.repo)}/actions" target="_blank" rel="noopener">Actions 탭 ↗</a></p></div>
  <div class="card"><div class="head"><h2>목록 자동 갱신 작업 (update-manifest)</h2></div>
    <table class="t"><thead><tr><th>결과</th><th>내용</th><th>시각</th><th></th></tr></thead><tbody>${runRows}</tbody></table></div>
  <div class="card"><div class="head"><h2>최근 변경 (커밋)</h2></div>
    ${commits.error ? `<div class="err-box">${esc(commits.error)}</div>` : `<table class="t"><thead><tr><th>내용</th><th>누가</th><th>시각</th><th></th></tr></thead><tbody>${commits.map(c => `<tr><td>${esc((c.commit?.message || "").split("\n")[0])}</td><td>${esc(c.commit?.author?.name || "")}</td><td>${fmt(c.commit?.author?.date)}</td><td><a href="${esc(c.html_url)}" target="_blank" rel="noopener">보기 ↗</a></td></tr>`).join("")}</tbody></table>`}</div>`;
}

/* ================================================================
   버튼 동작 연결 (data-act)
   ================================================================ */
const ACTIONS = {
  "member-new": d => memberNew(d.prefix || "MS"), "member-edit": d => memberEdit(d.base), "member-del": d => memberDelete(d.base),
  "member-move": d => memberMove(d.base), "member-grad": d => memberMove(d.base, "ALU"),
  "order-move": d => orderMove(d.prefix, d.base, +d.dir), "order-save": d => orderSave(d.prefix), "order-cancel": d => { delete state.order[d.prefix]; show("members"); },
  "gal-new": () => galleryNew(), "gal-edit": d => galleryEdit(d.base), "gal-photos": d => galleryPhotos(d.base), "gal-photo-del": d => galleryPhotoDelete(d.base, d.path), "gal-del": d => galleryDelete(d.base), "gal-move": d => galleryMove(d.base, +d.dir),
  "res-new": () => researchNew(), "res-edit": d => researchEdit(d.base), "res-del": d => researchDelete(d.base), "res-move": d => researchMove(d.base, +d.dir),
  "news-new": () => newsSave(null), "news-edit": d => newsSave(+d.i), "news-del": d => newsDelete(+d.i), "news-move": d => newsMove(+d.i, +d.dir),
  "pat-new": () => patentSave(null), "pat-edit": d => patentSave(+d.i), "pat-del": d => patentDelete(+d.i),
  "award-new": () => awardSave(null), "award-edit": d => awardSave(d.path), "award-del": d => awardDelete(d.path),
  "img-replace": d => imageReplace(d.key), "partner-add": () => partnerAdd(), "partner-del": d => partnerDelete(d.path),
  "cache-bump": () => run("캐시 번호 올리는 중…", cacheBump)
};
$("#view").addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const fn = ACTIONS[b.dataset.act]; if (!fn) return;
  try { await fn(b.dataset); } catch (err) { console.error(err); toast(err.message || String(err), "err"); }
});

/* ---------- 시작 ---------- */
(async () => {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  const start = (location.hash || "#connect").slice(1);
  if (settings.owner && settings.repo && settings.token) {
    const r = await run("저장된 정보로 연결 중…", () => connect(settings));
    if (r) { await show(TABS[start] && start !== "connect" ? start : "members"); return; }
  }
  await show(TABS[start] ? start : "connect");
})();
