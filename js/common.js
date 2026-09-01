/* ============================================================
   공통 내비게이션·푸터 — 모든 페이지에서 이 파일 하나로 관리합니다.
   메뉴를 바꾸려면 아래 MENU 배열만 수정하세요.
   세 번째 값이 있으면 드롭다운 하위 메뉴가 됩니다.
   ============================================================ */
"use strict";

/* 캐시 갱신용 버전 문자열 — 파일을 고쳤는데 사이트가 옛 내용을 보여주면 숫자를 올리세요.
   (HTML 안의 ?v=7 도 같은 숫자로 함께 올려 주면 됩니다.) */
const ASSET_V = "?v=7";

const MENU = [
  ["index.html", "Home"],
  ["research.html", "Research"],
  ["professor.html", "Members", [
    ["professor.html", "Professor"],
    ["students-phd.html", "Ph.D. Course"],
    ["students-ms.html", "M.S. Course"],
    ["students-bs.html", "Undergraduate"],
    ["alumni.html", "Alumni"]
  ]],
  ["publications.html", "Publications"],
  ["news.html", "News"],
  ["gallery.html", "Gallery"],
  ["contact.html", "Contact"]
];

document.addEventListener("DOMContentLoaded", () => {
  const here = location.pathname.split("/").pop() || "index.html";

  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.innerHTML = `
    <div class="in">
      <a class="logo" href="index.html"><img src="images/logo.png?v=7" alt="SER Lab — Electronic Engineering Laboratory"></a>
      <button class="burger" aria-label="menu">☰</button>
      <ul>${MENU.map(([href, label, sub]) => {
        const active = here === href || (sub && sub.some(([h]) => h === here));
        return `<li>
          <a href="${href}" class="${active ? "on" : ""}">${label}${sub ? " ▾" : ""}</a>
          ${sub ? `<ul class="sub">${sub.map(([h, l]) =>
            `<li><a href="${h}" class="${here === h ? "on" : ""}">${l}</a></li>`).join("")}</ul>` : ""}
        </li>`;
      }).join("")}
      </ul>
    </div>`;
  document.body.prepend(nav);
  nav.querySelector(".burger").onclick = () => nav.querySelector(".in > ul").classList.toggle("open");

  const foot = document.createElement("footer");
  foot.className = "site";
  foot.innerHTML = `
    <div class="in">
      <b>Soft Electronics &amp; Robotics Lab.</b>
      <p>Smart ICT Building E17, Room 507 · 50, Daehak-ro, Daesowon-myeon, Chungju-si,
         Chungcheongbuk-do, Republic of Korea<br>
         Tel. +82-43-841-5327 · <a href="mailto:dawankim@ut.ac.kr">dawankim@ut.ac.kr</a></p>
      <p>Copyright © 2026 Soft Electronics &amp; Robotics Lab., Korea National University of
         Transportation. All rights reserved.</p>
    </div>`;
  document.body.append(foot);

  initPhotoFallback(document);   // 페이지에 직접 넣은 사진(교수 프로필 등)의 폴백 처리
});

/* ---- 사진 3단 폴백 ----
   images/members/성-이름.jpg 가 없으면 같은 이름의 .png 를 쓰고,
   그것도 없으면 이니셜 동그라미(또는 이니셜 사각형)로 대체합니다.
   HTML 에서는 아래 두 속성만 붙이면 됩니다:
     data-fallback="다음에 시도할 이미지 경로"   data-initials="표시할 이니셜" */
function initPhotoFallback(root) {
  root.querySelectorAll("img[data-fallback]").forEach(img => {
    const nextStep = () => {
      const png = img.getAttribute("data-fallback");
      if (png) {                      // 2단계 — 같은 이름의 .png 를 시도
        img.removeAttribute("data-fallback");
        img.src = png;
        return;
      }
      const box = document.createElement("div");   // 3단계 — 이니셜로 대체
      box.className = img.className;               // .avatar / .photo 모양을 그대로 물려받음
      box.textContent = img.getAttribute("data-initials") || "";
      img.replaceWith(box);
    };
    img.addEventListener("error", nextStep);
    // 리스너를 붙이기 전에 이미 실패했을 수도 있으므로 한 번 확인
    if (img.complete && img.naturalWidth === 0) nextStep();
  });
}

/* ---- 구성원 데이터 로딩 ----
   구성원 한 명 = data/members/ 안의 파일 하나.
   data/members-list.js 에 적힌 순서 그대로 읽어
   { phd, ms, bs, alumni } 그룹별 배열로 모아 돌려줍니다.
   사용법:  loadMembers().then(M => renderMembers(M.ms, "cards", "...")) */
window.MEMBERS = { phd: [], ms: [], bs: [], alumni: [] };

// data/members/*.js 파일들이 자기 자신을 등록할 때 부르는 함수
function MEMBER(person) {
  const g = person.group || "bs";
  (window.MEMBERS[g] ??= []).push(person);
}

function loadScript(src) {
  return new Promise(resolve => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve(true);
    el.onerror = () => { console.warn("구성원 파일을 읽지 못했습니다:", src); resolve(false); };
    document.head.append(el);
  });
}

let membersPromise = null;          // 한 페이지에서 두 번 읽지 않도록 기억해 둠
function loadMembers() {
  if (membersPromise) return membersPromise;
  membersPromise = (async () => {
    await loadScript("data/members-list.js" + ASSET_V);
    for (const file of window.MEMBER_FILES || [])   // 목록에 적힌 순서를 그대로 지킴
      await loadScript(file + ASSET_V);
    return window.MEMBERS;
  })();
  return membersPromise;
}

/* ---- 멤버 카드 렌더링 (professor 제외 각 멤버 페이지에서 사용) ----
   bio / pubs / awards 중 하나라도 있으면, 마우스를 올렸을 때(모바일은 터치)
   카드 아래로 상세 패널이 자연스럽게 펼쳐집니다. */
function renderMembers(list, elId, emptyMsg) {
  const el = document.getElementById(elId);
  const initials = n => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  function detailHtml(s) {
    if (!s.bio && !s.pubs?.length && !s.patents?.length && !s.awards?.length) return "";
    return `<div class="detail">
      ${s.bio ? `<h4>Research</h4><p>${s.bio}</p>` : ""}
      ${s.pubs?.length ? `<h4>Selected Publications</h4>
        <ul>${s.pubs.map(p => `<li>${p}</li>`).join("")}</ul>` : ""}
      ${s.patents?.length ? `<h4>Patents</h4>
        <ul>${s.patents.map(p => `<li>${p}</li>`).join("")}</ul>` : ""}
      ${s.awards?.length ? `<h4>Honors</h4>
        <ul>${s.awards.map(a => `<li>${a}</li>`).join("")}</ul>` : ""}
    </div>`;
  }

  // 사진: images/members/<slug>.jpg → 같은 이름 .png → 이니셜 아바타
  const photoHtml = s => s.slug
    ? `<img class="avatar" src="images/members/${s.slug}.jpg${ASSET_V}" alt="${s.name}"
           data-fallback="images/members/${s.slug}.png${ASSET_V}"
           data-initials="${initials(s.name)}">`
    : `<div class="avatar">${initials(s.name)}</div>`;

  el.innerHTML = list.length ? list.map(s => {
    const d = detailHtml(s);
    return `
    <div class="card person${d ? " hasdetail" : ""}">
      ${photoHtml(s)}
      <div class="nm">${s.name}${s.kor ? ` <span style="font-weight:400;color:var(--sub)">(${s.kor})</span>` : ""}</div>
      <div class="role">${s.role || ""}</div>
      <div class="info">${s.interests || ""}${s.email ? `<br><a href="mailto:${s.email}">${s.email}</a>` : ""}</div>
      ${d ? `<div class="hint">▾ CLICK FOR DETAILS</div>` : ""}
      ${d}
    </div>`;
  }).join("") : `<p style="color:var(--sub)">${emptyMsg}</p>`;

  initPhotoFallback(el);   // 방금 만든 카드 사진에 3단 폴백 연결

  // 클릭으로 열고 닫기 (링크 클릭은 방해하지 않음)
  el.querySelectorAll(".person.hasdetail").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest("a")) return;
      const wasOpen = card.classList.contains("open");
      el.querySelectorAll(".person.open").forEach(c => c.classList.remove("open"));
      if (!wasOpen) card.classList.add("open");
    });
  });

  if (list.length) masonryLayout(el);
}

/* ---- 벽돌식(masonry) 배치 ----
   카드가 열려 길어지면 그 카드만 아래로 늘어나고,
   다음 카드들이 빈 자리를 채우며 재배치됩니다.
   (1 2 3 / 4 5 6  →  1이 열리면  1 2 3 / 1 4 5 / 6 ...) */
function masonryLayout(el) {
  el.classList.add("masonry");
  const cards = [...el.querySelectorAll(".person")];
  const gap = 22;
  const twoCol = el.classList.contains("c2");   // alumni 페이지는 2열

  function layout() {
    const cw = el.clientWidth;
    const n = cw <= 560 ? 1 : (cw <= 860 || twoCol) ? 2 : 3;   // 화면 폭에 따른 열 수
    const w = (cw - gap * (n - 1)) / n;
    const colH = Array(n).fill(0);
    for (const c of cards) {
      c.style.width = w + "px";
      const i = colH.indexOf(Math.min(...colH));   // 가장 짧은 열에 배치
      c.style.left = i * (w + gap) + "px";
      c.style.top = colH[i] + "px";
      colH[i] += c.offsetHeight + gap;
    }
    el.style.height = (Math.max(...colH) - gap) + "px";
  }

  // 카드 높이가 변할 때(패널 열림/닫힘, 사진 로딩)마다 자동 재배치
  const ro = new ResizeObserver(layout);
  cards.forEach(c => ro.observe(c));
  window.addEventListener("resize", layout);
  layout();
}
