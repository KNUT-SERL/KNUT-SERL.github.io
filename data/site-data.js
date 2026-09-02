/* ============================================================================
   ★★★  SER Lab 데이터 파일 — 논문 설정·협력기관  ★★★

   [수정 방법]
   1) 이 파일을 메모장(또는 GitHub 웹의 연필 아이콘)으로 연다
   2) 아래 섹션 중 바꿀 부분을 찾아 형식 그대로 고친다
   3) 저장 후 GitHub 저장소에 다시 업로드(덮어쓰기) → 1분 내 사이트 반영

   [이 파일에 없는 것] 구성원(members/) · 연구분야(research/) · 갤러리(gallery/) ·
   특허(data/patents.txt) · 뉴스(data/news.txt) — 자세한 방법은 README.md

   [형식 규칙 — 이것만 지키면 안 깨집니다]
   · 글자 값은 반드시 따옴표로 감싼다:  name: "Junwon Jang",
   · 각 항목(중괄호 덩어리) 끝에는 쉼표를 붙인다:  { ... },
   · 항목을 지울 때는 { 부터 }, 까지 통째로 지운다
   · 비워둘 값은 "" 로 남겨둔다 (줄을 지워도 됨)
   ============================================================================ */
"use strict";
window.SITE = {

  /* ==========================================================================
     [1] 논문 자동 로딩 설정  →  publications.html 의 Papers 탭
     논문 목록 자체는 OpenAlex에서 자동으로 오므로 새 논문이 나와도 손댈 것 없음
     ========================================================================== */
  pub: {
    authorId: "A5005572587",       // 교수님의 OpenAlex 저자 ID (바꿀 일 없음)
    mailto: "dawankim@ut.ac.kr",    // OpenAlex 예의상 연락 이메일
    ifThreshold: 10,                 // 저널 IF(근사)가 이 값 이상 → 빨간 IF 배지
    autoTopCited: true,              // 인용 상위 1%/10% 금색 배지 자동 표시

    // ── 목록에서 뺄 논문: OpenAlex 논문 ID를 적는다 (예: "W4285719527")
    //    ID 찾는 법: openalex.org 에서 논문 검색 → 주소창의 W로 시작하는 코드
    exclude: [],

    // ── 특정 저널의 공식 JCR IF를 직접 표기 (근사치 대신 사용됨)
    //    형식: "저널명(소문자)": 숫자
    ifOverride: {
      // "advanced functional materials": 18.5,
    },

    // ── 표지 선정·Q1 등 수동 배지와 공동1저자(†) 지정
    //    형식: "DOI(소문자)": { badges: [...], equal: [저자명...] }
    //    DOI는 논문의 DOI 버튼 주소에서 https://doi.org/ 뒷부분
    extras: {
      // "10.3390/biomimetics10010001": { badges: ["Front Cover", "SCI Q1"],
      //                                  equal: ["Junwon Jang", "Junho Lee"] },
    },

    // ── 논문 대표 이미지 (썸네일)
    //    형식: "DOI(소문자)": "이미지 경로"  (이미지는 images/ 폴더에 업로드)
    thumbs: {
      // "10.3390/biomimetics10010001": "images/pubs/pub37.jpg",
    }
  },

  /* ==========================================================================
     [2] 연구 분야 → 이 파일에서 분리되었습니다
     research/ 폴더에 'R-001-이름.jpg' + 같은 이름 .txt(제목·요약)를 올리면
     Research 페이지와 홈 화면 카드에 자동 반영됩니다. 방법은 README.md 참고.
     ========================================================================== */

  /* ==========================================================================
     [3] 구성원·갤러리·특허·뉴스는 이 파일에 없습니다
     --------------------------------------------------------------------------
     · 구성원  : members/ 폴더 — 'MS-001-JunwonJang.txt' + 같은 이름 사진
     · 갤러리  : gallery/ 폴더 — 'G-2026_09_01-001-연구실OT.png' + 같은 이름 .txt
     · 특허    : data/patents.txt      · 뉴스: data/news.txt
     파일을 올리기만 하면 사이트가 자동으로 인식합니다. 방법은 README.md 참고.
     ========================================================================== */

  /* ==========================================================================
     [4] 협력 기관 회전 배너  →  홈 하단
     배열 순서 = 배너에 흐르는 순서.  로고는 images/partners/ 에 업로드
     ========================================================================== */
  partners: [
    { name: "한국표준과학연구원 KRISS", img: "images/partners/kriss.webp?v=18",      url: "https://www.kriss.re.kr" },
    { name: "한국전자통신연구원 ETRI",  img: "images/partners/etri.webp?v=18",       url: "https://www.etri.re.kr" },
    { name: "경찰대학",                 img: "images/partners/police.webp?v=18",     url: "https://www.police.ac.kr" },
    { name: "LG생활건강",               img: "images/partners/lghnh.webp?v=18",      url: "https://www.lghnh.com" },
    { name: "콜마비앤에이치",           img: "images/partners/kolmarbnh.webp?v=18",  url: "https://www.kolmarbnh.co.kr" },
    { name: "MIMETICS",                 img: "images/partners/mimetics.png?v=18",   url: "https://mimetics.co.kr" },
    { name: "Physionics",               img: "images/partners/physionics.png?v=18", url: "https://www.physionics.co.kr" }
  ]
};
