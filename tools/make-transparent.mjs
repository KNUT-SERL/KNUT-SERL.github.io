/* ============================================================================
   흰 배경 로고 → 투명 배경 PNG  (개발자용 — playwright 가 필요합니다)

   사용법 (저장소 최상위에서):
       node tools/make-transparent.mjs images/partners/logo.webp images/partners/other.png

   · 이미지 가장자리에 닿아 있는 흰(거의 흰) 영역만 투명하게 만듭니다.
     글자 속 구멍처럼 갇힌 흰 부분은 그대로 둡니다.
   · 배경과 맞닿은 밝은 픽셀은 밝기에 따라 반투명 처리해 테두리가 부드럽습니다.
   · 결과는 같은 폴더에 같은 이름의 .png 로 저장되고, 원본이 png 가 아니면 원본은 지웁니다.
   ============================================================================ */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { basename, extname, join, dirname } from "node:path";

// playwright 는 CommonJS 모듈이라 default 로 받아야 chromium 이 나옵니다
async function loadPlaywright() {
  for (const spec of ["playwright", "/opt/node22/lib/node_modules/playwright/index.js"]) {
    try { const m = await import(spec); return m.chromium ?? m.default?.chromium; } catch {}
  }
}
const chromium = await loadPlaywright();
if (!chromium) { console.error("playwright 가 필요합니다:  npm i -g playwright  (브라우저 포함)"); process.exit(1); }
const files = process.argv.slice(2);
if (!files.length) { console.log("사용법: node tools/make-transparent.mjs <이미지 파일...>"); process.exit(0); }

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const browser = await chromium.launch();
const page = await browser.newPage();
for (const f of files) {
  const mt = MIME[extname(f).toLowerCase()];
  if (!mt) { console.warn("건너뜀(지원하지 않는 형식):", f); continue; }
  const dataUrl = `data:${mt};base64,${readFileSync(f).toString("base64")}`;
  const pngDataUrl = await page.evaluate(async src => {
    const img = new Image(); img.src = src; await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
    const im = ctx.getImageData(0, 0, w, h), d = im.data;
    const minc = p => Math.min(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
    const HARD = 245, SOFT = 200;                     // 245 이상: 배경으로 간주 / 200~245: 가장자리 반투명
    const bg = new Uint8Array(w * h); const stack = [];
    const push = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return;
      const p = y * w + x; if (bg[p] || minc(p) < HARD) return; bg[p] = 1; stack.push(p); };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) { const p = stack.pop(); const x = p % w, y = (p / w) | 0;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
    for (let p = 0; p < w * h; p++) if (bg[p]) d[p * 4 + 3] = 0;
    for (let p = 0; p < w * h; p++) {
      if (bg[p]) continue;
      const x = p % w, y = (p / w) | 0;
      const touches = (x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (y > 0 && bg[p - w]) || (y < h - 1 && bg[p + w]);
      if (!touches) continue;
      const m = minc(p);
      if (m >= SOFT) d[p * 4 + 3] = Math.round(255 * (HARD - m) / (HARD - SOFT));
    }
    ctx.putImageData(im, 0, 0);
    return c.toDataURL("image/png");
  }, dataUrl);
  const out = join(dirname(f), basename(f, extname(f)) + ".png");
  writeFileSync(out, Buffer.from(pngDataUrl.split(",")[1], "base64"));
  if (out !== f && existsSync(f)) unlinkSync(f);
  console.log(`  ${f} → ${out}`);
}
await browser.close();
