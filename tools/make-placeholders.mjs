/* ============================================================================
   구성원 사진 자리표시(placeholder) 이미지 만들기

   members/ 안의 프로필(.txt) 중 이미지가 없는 사람에게
   파스텔 배경 + 흰 실루엣 PNG(같은 이름 .png)를 만들어 줍니다.
   교수 사진(images/professor.*)이 없으면 그것도 만듭니다.
   이미 이미지가 있는 사람은 절대 건드리지 않습니다.

   GitHub Actions 가 파일이 올라올 때마다 자동 실행하므로 평소 손댈 일 없음.
   수동 실행:  node tools/make-placeholders.mjs
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

/* ---------- 이미지가 없는 구성원 찾기 ---------- */
import { readdirSync, existsSync } from "node:fs";
const IMG_EXTS = ["jpg", "jpeg", "webp", "png"];
const files = (() => { try { return readdirSync("members"); } catch { return []; } })();
const txts = files.filter(f => /\.txt$/i.test(f) && /^(PHD|DR|DRMS|MS|MSBS|BS|INT|ALU)-\d{3}-/i.test(f));
const hasImage = base => IMG_EXTS.some(x => files.some(f => f.toLowerCase() === (base + "." + x).toLowerCase()));

/* 이름을 숫자로 바꿔(해시) 그 사람만의 고정된 파스텔 색을 고릅니다 */
const hashOf = str => { let h = 0; for (const c of str) h = (h * 31 + c.codePointAt(0)) >>> 0; return h; };

let made = 0;
for (const t of txts) {
  const base = t.replace(/\.txt$/i, "");
  if (hasImage(base)) continue;
  const h = hashOf(base);
  writeFileSync(`members/${base}.png`, drawFigure(STUDENT, h % 360, h % 3));
  console.log(`  members/${base}.png  (${STUDENT.w}×${STUDENT.h}) 생성`);
  made++;
}
if (!IMG_EXTS.some(x => existsSync(`images/professor.${x}`))) {
  writeFileSync("images/professor.png", drawFigure(PROFESSOR, 210, 0));
  console.log(`  images/professor.png  (${PROFESSOR.w}×${PROFESSOR.h}) 생성`);
  made++;
}
console.log(made ? `\n${made}개 생성 완료.` : "모든 구성원에게 이미지가 있어 만들 것이 없습니다.");
