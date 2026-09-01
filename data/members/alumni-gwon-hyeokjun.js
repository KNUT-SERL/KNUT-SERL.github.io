/* ============================================================
   권혁준 (Hyeokjun Gwon) — 졸업생

   졸업생 카드는 이름·학위·현재 소속만 표시합니다.
   재학생을 졸업 처리할 때는 data/members/ 의 해당 파일에서 group 을 "alumni" 로
   바꾸고 degree·now 를 채운 뒤, 파일 이름을 alumni-성-이름.js 로 바꾸면 됩니다.
   ============================================================ */
MEMBER({
  group: "alumni",                // 소속: 졸업생
  slug: "gwon-hyeokjun",          // 사진 이름 → images/members/gwon-hyeokjun.jpg (없으면 .png, 그것도 없으면 이니셜)
  name: "Hyeokjun Gwon",          // 영문 이름 — 카드 제목
  kor: "권혁준",                  // 한글 이름 — 이름 옆 괄호 안에 표시
  degree: "B.S. (Electronics)",   // 취득 학위
  email: "kwonhyeokjun12@naver.com", // 이메일 — 비우면("") 표시되지 않음
  now: "Egtronics — Charger H/W Development" // 현재 소속 — 비우면("") 표시되지 않음
});
