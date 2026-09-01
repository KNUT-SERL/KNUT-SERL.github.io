/* ============================================================================
   구성원 사진 자리표시(placeholder) 이미지 만들기

   실제 사진이 준비되기 전까지 카드에 표시할 일러스트 PNG를 만듭니다.
   사람마다 다른 파스텔 배경 + 흰색 사람 실루엣이며,
   결과물은 images/members/<성-이름>.png 로 저장됩니다.

   실행 방법 (저장소 최상위에서):
       node tools/make-placeholders.mjs

   data/members-list.js 를 읽어 만들기 때문에, 구성원을 추가한 뒤 다시 실행하면
   새 사람의 자리표시 이미지도 함께 만들어집니다.
   ※ 실제 사진(.jpg)을 images/members/ 에 올리면 그 사진이 우선 표시됩니다.
   ============================================================================ */
import zlib from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

/* 학생·졸업생 카드용 (정사각형) — 동그란 아바타로 잘려도 자연스럽게 보이는 배치 */
const STUDENT = {
  w: 480, h: 480,
  head: { cx: 0.50, cy: 0.345, r: 0.150 },              // 머리(원)
  body: { cx: 0.50, cy: 0.950, rx: 0.375, ry: 0.430 }   // 어깨·상체(타원, 아래는 잘림)
};
/* 교수 프로필용 (3:4 세로) — 인물 사진처럼 머리를 위쪽 1/3 에 두고 어깨가 화면 밖으로 */
const PROFESSOR = {
  w: 600, h: 800,
  head: { cx: 0.50, cy: 0.300, r: 0.165 },
  body: { cx: 0.50, cy: 0.890, rx: 0.460, ry: 0.440 }
};

/* ---------- PNG 인코더 (외부 라이브러리 없이 직접 작성) ---------- */
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = buf => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgb) {
  const stride = w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;                                   // 필터: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;  // 8bit truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

/* ---------- 파스텔 색 ---------- */
function hsl(hDeg, s, l) {
  const h = ((hDeg % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255));
}

/* ---------- 사람 실루엣 그리기 ----------
   머리(원)와 어깨(타원)를 정사각형 기준 비율로 배치하고,
   픽셀마다 4×4로 잘게 나눠 검사해 가장자리를 부드럽게(안티에일리어싱) 만듭니다. */
function drawFigure({ w, h, head, body }, hue, tint = 0) {
  // 색상(hue)만 돌리면 이웃한 사람끼리 비슷해 보이므로
  // 진하기(채도·밝기)도 세 단계로 번갈아 주어 서로 확실히 구분되게 합니다.
  const S = [0.46, 0.62, 0.38][tint % 3];
  const L = [0.815, 0.775, 0.865][tint % 3];
  const bg = hsl(hue, S, L);              // 파스텔 배경
  const bgTop = hsl(hue, S + 0.02, L + 0.055);   // 위쪽을 살짝 밝게 (은은한 그라데이션)
  const headX = w * head.cx, headY = h * head.cy, headR = w * head.r;
  const bodyX = w * body.cx, bodyY = h * body.cy;
  const bodyRX = w * body.rx, bodyRY = h * body.ry;

  const inside = (px, py) => {
    const dh = (px - headX) ** 2 + (py - headY) ** 2;
    if (dh <= headR * headR) return true;
    const ex = (px - bodyX) / bodyRX, ey = (py - bodyY) / bodyRY;
    return ex * ex + ey * ey <= 1;
  };

  const out = Buffer.alloc(w * h * 3);
  const SS = 4, step = 1 / SS, off = step / 2;
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);                                  // 세로 그라데이션 비율
    const base = [0, 1, 2].map(i => bgTop[i] + (bg[i] - bgTop[i]) * t);
    for (let x = 0; x < w; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++)
          if (inside(x + sx * step + off, y + sy * step + off)) hits++;
      const a = hits / (SS * SS);                           // 실루엣이 덮은 비율
      const p = (y * w + x) * 3;
      for (let i = 0; i < 3; i++) out[p + i] = Math.round(base[i] * (1 - a) + 255 * a);
    }
  }
  return encodePNG(w, h, out);
}

/* ---------- 구성원 목록 읽기 ---------- */
const win = {};
new Function("window", readFileSync("data/members-list.js", "utf8"))(win);
const people = [];
global.MEMBER = p => people.push(p);
for (const file of win.MEMBER_FILES) new Function("MEMBER", readFileSync(file, "utf8"))(p => people.push(p));

/* ---------- 만들기 ---------- */
mkdirSync("images/members", { recursive: true });
const GOLDEN = 137.508;          // 황금각 — 사람 수가 늘어도 색이 골고루 퍼짐
let n = 0;
for (const p of people) {
  if (!p.slug) continue;
  writeFileSync(`images/members/${p.slug}.png`, drawFigure(STUDENT, 24 + n * GOLDEN, n));
  console.log(`  images/members/${p.slug}.png  (${STUDENT.w}×${STUDENT.h})  ${p.kor || p.name}`);
  n++;
}
writeFileSync("images/members/professor.png", drawFigure(PROFESSOR, 210, 0));
console.log(`  images/members/professor.png  (${PROFESSOR.w}×${PROFESSOR.h})  교수`);
console.log(`\n총 ${n + 1}개 생성 완료.`);
