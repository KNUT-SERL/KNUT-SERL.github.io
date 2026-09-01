/* ============================================================
   공통 내비게이션·푸터 — 모든 페이지에서 이 파일 하나로 관리합니다.
   메뉴를 바꾸려면 아래 MENU 배열만 수정하세요.
   세 번째 값이 있으면 드롭다운 하위 메뉴가 됩니다.
   ============================================================ */
"use strict";

/* 캐시 갱신용 버전 문자열 — 파일을 고쳤는데 사이트가 옛 내용을 보여주면 숫자를 올리세요.
   (HTML 안의 ?v=7 도 같은 숫자로 함께 올려 주면 됩니다.) */
const ASSET_V = "?v=11";

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
      <p>Website administrator: <a href="mailto:saa4563123@naver.com">saa4563123@naver.com</a>
         — please contact this address to report bugs or request corrections.</p>
      <p>Copyright © 2026 Soft Electronics &amp; Robotics Lab., Korea National University of
         Transportation. All rights reserved.</p>
    </div>`;
  document.body.append(foot);

  /* 교수 사진(#prof-photo): 목록(manifest)에 있는 실제 파일을 그대로 표시.
     사진이 하나도 없으면 이니셜(DW)로 대체합니다. */
  const prof = document.getElementById("prof-photo");
  if (prof) {
    const toInitials = () => {
      const d = document.createElement("div");
      d.className = prof.className;
      d.textContent = prof.dataset.initials || "";
      prof.replaceWith(d);
    };
    loadManifest().then(mf => {
      if (!mf.professor) return toInitials();
      prof.onerror = () => {
        if (!prof.dataset.retried) {   // 일시적 실패면 한 번만 다시 시도
          prof.dataset.retried = "1";
          setTimeout(() => { prof.src = encodeURI(mf.professor) + "?r=" + Date.now(); }, 900);
          return;
        }
        toInitials();
      };
      prof.src = encodeURI(mf.professor);
    }).catch(toInitials);
  }
});

/* ---- 카드 높이 통일 ----
   내용 길이가 달라도 모든 카드를 가장 큰 카드 높이에 맞춰
   줄마다 들쭉날쭉해 보이지 않게 합니다. (상세 패널이 열린 카드는 예외) */
function equalizeCards(el) {
  const cards = [...el.querySelectorAll(".person")];
  if (cards.length < 2) return;
  const apply = () => {
    const closed = cards.filter(c => !c.classList.contains("open"));
    closed.forEach(c => { c.style.minHeight = ""; });
    const h = Math.max(...closed.map(c => c.offsetHeight));
    cards.forEach(c => { c.style.minHeight = h + "px"; });
  };
  apply();
  window.addEventListener("resize", apply);            // 창 크기가 바뀌면 다시 계산
  if (document.fonts?.ready) document.fonts.ready.then(apply);   // 글꼴 로딩 후 재계산
}

/* ---- 과정 페이지 렌더링 ----
   한 페이지의 여러 과정(예: 박사 코스 = 포닥 → 박사 → 석박사 연계)을
   구분선 없이 하나의 목록으로 이어 붙입니다. 연계과정은 그 과정의 맨 뒤에 이어짐. */
function renderMemberPage(groups, subgroups, wrapId, emptyMsg) {
  const wrap = document.getElementById(wrapId);
  const list = subgroups.flatMap(g => groups[g.prefix] || []);
  wrap.innerHTML = `<div class="grid c3" id="${wrapId}-list"></div>`;
  renderMembers(list, `${wrapId}-list`, emptyMsg);
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

  // 사진: 목록(manifest)이 알려 준 실제 파일을 그대로 사용. 없으면 이니셜 아바타.
  const photoHtml = s => s.image
    ? `<img class="avatar" src="${encodeURI(s.image)}" alt="${s.name}" data-initials="${initials(s.name)}">`
    : `<div class="avatar">${initials(s.name)}</div>`;

  // 직책 태그(랩장·부랩장·페이지 관리자 등) — 종류에 따라 모양을 달리해 한눈에 보이게
  const tagHtml = t =>
    `<span class="tag${t === "랩장" ? " lead" : t === "부랩장" ? " vice" : ""}">${t}</span>`;

  el.innerHTML = list.length ? list.map(s => {
    const d = detailHtml(s);
    // 힌트 줄은 모든 카드에 같은 높이로 자리만 잡아 두어 카드 크기가 서로 같아지게 함
    return `
    <div class="card person${d ? " hasdetail" : ""}">
      ${photoHtml(s)}
      <div class="nm">${s.name}${s.kor ? ` <span style="font-weight:400;color:var(--sub)">(${s.kor})</span>` : ""}${(s.tags || []).map(tagHtml).join("")}</div>
      <div class="role">${s.role || ""}</div>
      <div class="info">${s.interests || ""}${s.email ? `<br><a href="mailto:${s.email}">${s.email}</a>` : ""}</div>
      <div class="hint">${d ? "▾ CLICK FOR DETAILS" : "&nbsp;"}</div>
      ${d}
    </div>`;
  }).join("") : `<p style="color:var(--sub)">${emptyMsg}</p>`;

  // 로딩 실패 시: 배포 직후처럼 일시적인 문제일 수 있어 한 번만 다시 시도하고,
  // 그래도 안 되면 이니셜 아바타로 대체합니다
  el.querySelectorAll("img.avatar").forEach(img => img.addEventListener("error", () => {
    if (!img.dataset.retried) {
      img.dataset.retried = "1";
      setTimeout(() => { img.src = img.src.split("?")[0] + "?r=" + Date.now(); }, 900);
      return;
    }
    const d = document.createElement("div");
    d.className = "avatar";
    d.textContent = img.dataset.initials || "";
    img.replaceWith(d);
  }));

  equalizeCards(el);   // 모든 카드를 같은 높이로

  // 클릭으로 열고 닫기 (링크 클릭은 방해하지 않음)
  el.querySelectorAll(".person.hasdetail").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest("a")) return;
      const wasOpen = card.classList.contains("open");
      el.querySelectorAll(".person.open").forEach(c => c.classList.remove("open"));
      if (!wasOpen) card.classList.add("open");
    });
  });

}
