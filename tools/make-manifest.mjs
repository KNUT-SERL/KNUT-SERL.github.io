/* ============================================================================
   콘텐츠 목록(data/manifest.json) 자동 생성기

   정적 사이트(GitHub Pages)는 폴더 안 파일 목록을 스스로 읽지 못하므로,
   이 스크립트가 members/ 와 gallery/ 폴더를 훑어 목록 파일을 만들어 줍니다.
   GitHub Actions(.github/workflows/update-manifest.yml)가 파일이 올라올 때마다
   자동으로 실행하므로 평소에 손으로 돌릴 일은 없습니다.

   수동 실행:  node tools/make-manifest.mjs
   ============================================================================ */
import { readdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";

const IMG_EXTS = ["jpg", "jpeg", "webp", "png"];   // 같은 이름이 여럿이면 앞쪽 확장자 우선
const PREFIXES = ["PHD", "DR", "DRMS", "MS", "MSBS", "BS", "INT", "ALU"];

const listDir = d => { try { return readdirSync(d); } catch { return []; } };
const warn = [];

/* ---- 구성원: members/PREFIX-NNN-Name.(txt|이미지) ---- */
const memberRe = new RegExp(`^(${PREFIXES.join("|")})-(\\d{3})-(.+?)\\.(txt|${IMG_EXTS.join("|")})$`, "i");
const members = new Map();   // base → { prefix, order, name, txt, images:{ext:file} }
for (const f of listDir("members")) {
  const m = f.match(memberRe);
  if (!m) { if (!f.startsWith(".")) warn.push(`members/${f} — 이름 형식이 달라 무시함`); continue; }
  const [, rawPrefix, num, name, rawExt] = m;
  const prefix = rawPrefix.toUpperCase(), ext = rawExt.toLowerCase();
  const base = `${prefix}-${num}-${name}`;
  const e = members.get(base) || { base, prefix, order: +num, name, txt: null, images: {} };
  if (ext === "txt") e.txt = `members/${f}`; else e.images[ext] = `members/${f}`;
  members.set(base, e);
}
const memberList = [...members.values()]
  .map(e => ({ base: e.base, prefix: e.prefix, order: e.order, name: e.name,
               txt: e.txt, image: IMG_EXTS.map(x => e.images[x]).find(Boolean) || null }))
  .sort((a, b) => PREFIXES.indexOf(a.prefix) - PREFIXES.indexOf(b.prefix) || a.order - b.order
                  || a.base.localeCompare(b.base));

/* ---- 갤러리: gallery/G-YYYY_MM_DD-NNN-제목.(이미지|txt) ---- */
const galleryRe = new RegExp(`^G-(\\d{4})_(\\d{2})_(\\d{2})-(\\d{3})-(.+?)\\.(txt|${IMG_EXTS.join("|")})$`, "i");
const shots = new Map();
for (const f of listDir("gallery")) {
  const m = f.match(galleryRe);
  if (!m) { if (!f.startsWith(".") && !/안내|readme/i.test(f)) warn.push(`gallery/${f} — 이름 형식이 달라 무시함`); continue; }
  const [, y, mo, d, num, title, rawExt] = m;
  const ext = rawExt.toLowerCase();
  const base = f.slice(0, -(ext.length + 1));
  const e = shots.get(base) || { base, date: `${y}-${mo}-${d}`, order: +num, title, txt: null, images: {} };
  if (ext === "txt") e.txt = `gallery/${f}`; else e.images[ext] = `gallery/${f}`;
  shots.set(base, e);
}
const galleryList = [...shots.values()]
  .map(e => ({ base: e.base, date: e.date, order: e.order, title: e.title,
               txt: e.txt, image: IMG_EXTS.map(x => e.images[x]).find(Boolean) || null }))
  .filter(e => e.image || (warn.push(`${e.base} — 이미지 없이 .txt만 있어 무시함`), false))
  .sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order || a.base.localeCompare(b.base));

/* ---- 연구 분야: research/R-순번-이름.(이미지|txt)  (날짜가 끼어 있어도 허용) ---- */
const researchRe = new RegExp(`^R-(?:\\d{4}_\\d{2}_\\d{2}-)?(\\d{3})-(.+?)\\.(txt|${IMG_EXTS.join("|")})$`, "i");
const areas = new Map();
for (const f of listDir("research")) {
  const m = f.match(researchRe);
  if (!m) { if (!f.startsWith(".") && !/안내|readme/i.test(f)) warn.push(`research/${f} — 이름 형식이 달라 무시함`); continue; }
  const [, num, title, rawExt] = m;
  const ext = rawExt.toLowerCase();
  const base = f.slice(0, -(ext.length + 1));
  const e = areas.get(base) || { base, order: +num, title, txt: null, images: {} };
  if (ext === "txt") e.txt = `research/${f}`; else e.images[ext] = `research/${f}`;
  areas.set(base, e);
}
const researchList = [...areas.values()]
  .map(e => ({ base: e.base, order: e.order, title: e.title,
               txt: e.txt, image: IMG_EXTS.map(x => e.images[x]).find(Boolean) || null }))
  .sort((a, b) => a.order - b.order || a.base.localeCompare(b.base));

/* ---- 교수 사진: images/professor.* ---- */
const professor = IMG_EXTS.map(x => `images/professor.${x}`).find(existsSync) || null;

/* ---- 저장 (내용이 같으면 건드리지 않음 → 불필요한 커밋 방지) ---- */
const json = JSON.stringify({ professor, members: memberList, research: researchList, gallery: galleryList }, null, 1);
const before = existsSync("data/manifest.json") ? readFileSync("data/manifest.json", "utf8") : "";
if (before !== json) { writeFileSync("data/manifest.json", json); console.log("data/manifest.json 갱신됨"); }
else console.log("data/manifest.json 변화 없음");
console.log(`구성원 ${memberList.length}명 · 연구분야 ${researchList.length}개 · 갤러리 ${galleryList.length}장 · 교수 사진 ${professor || "(없음 → 이니셜)"}`);
for (const w of warn) console.log("⚠ " + w);
