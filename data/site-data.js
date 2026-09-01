/* ============================================================================
   ★★★  SER Lab 콘텐츠 데이터 파일 — 연구분야·뉴스·갤러리·특허·협력기관  ★★★

   [수정 방법]
   1) 이 파일을 메모장(또는 GitHub 웹의 연필 아이콘)으로 연다
   2) 아래 섹션 중 바꿀 부분을 찾아 형식 그대로 고친다
   3) 저장 후 GitHub 저장소에 다시 업로드(덮어쓰기) → 1분 내 사이트 반영

   [구성원(학생·졸업생)은 이 파일이 아닙니다]
   한 사람 = 파일 하나로 data/members/ 에 들어 있습니다.
   목록과 순서는 data/members-list.js 에서 관리합니다.

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
     [2] 연구 분야  →  research.html 카드 + 홈 화면의 4개 카드
     title(제목)·desc(설명)를 고치면 두 페이지에 동시에 반영됨
     img 에 지정된 경로(images/research/)로 사진을 올리면 카드 상단에 표시
     ========================================================================== */
  research: [
    {
      title: "Soft Robot & Electronics",
      icon: "🤖",                              // 이모지 아이콘 (자유롭게 교체)
      img: "images/research/soft-robot.jpg?v=7",
      desc: "Bioinspired soft sensors and actuators — pneumatic soft grippers with haptic "
          + "recognition frameworks and dome-structured tactile sensing arrays."
    },
    {
      title: "Bioinspired Haptic Sensors",
      icon: "🖐️",
      img: "images/research/haptic.jpg?v=7",
      desc: "Haptic sensor systems inspired by human skin mechanoreceptors — from receptor-level "
          + "signal pathways to fingertip-integrated haptic sensing systems."
    },
    {
      title: "XR Skin-Adhesive Interfaces",
      icon: "🥽",
      img: "images/research/xr.jpg?v=7",
      desc: "Vibration-resistive, sweat-tolerant skin-adhesive haptic interfaces that deliver "
          + "realistic tactile feedback for immersive XR experiences."
    },
    {
      title: "Wearable Sensors for Biosignal Monitoring",
      icon: "⌚",
      img: "images/research/wearable.jpg?v=7",
      desc: "Skin-conformal adhesive soft electronics with minimal residue and conformal contact "
          + "for long-term EMG and biosignal monitoring."
    }
  ],

  /* ==========================================================================
     [3] 구성원 (박사·석사·학부) 과 [4] 졸업생 → 이 파일에서 분리되었습니다
     --------------------------------------------------------------------------
     구성원은 이제 "한 사람 = 파일 하나" 로 관리합니다.

         data/members/ms-jang-junwon.js      ← 석사 장준원
         data/members/bs-kim-younghun.js     ← 학부 김영훈
         data/members/alumni-lee-yusin.js    ← 졸업생 이유신
                                             (파일 이름 규칙: 과정-성-이름.js)

     · 사람 추가·수정·졸업 처리 : data/members/ 안의 해당 파일을 고칩니다
     · 표시 순서와 목록          : data/members-list.js 에서 관리합니다
     · 사진                      : images/members/성-이름.jpg (없으면 .png)
     자세한 방법은 저장소의 GUIDE.md 를 보세요.
     ========================================================================== */

  /* ==========================================================================
     [5] 특허  →  publications.html 의 Patents 탭 (논문과 같은 디자인)
     출처: dawankim.com/publications/patent  (원본에도 10번 항목은 없음)
     각 칸: no(번호) / year(연도) / title(특허명) / inventors(발명자) /
            number(등록번호 — 미국특허 등. 없으면 "") / country(국가)
     새 특허 추가: 맨 위에 { ... }, 한 덩어리를 복사해 넣고 no를 이어서 부여
     ========================================================================== */
  patents: [
    { no: 13, year: 2022, title: "Fiber composite and preparing method of the same",
      inventors: "Chang Hyun Pang, Gi Ra Yi, Ji Sun Kim, Da Wan Kim, Si Yeon Jang",
      number: "US11530909B2", country: "US Patent" },
    { no: 12, year: 2022, title: "Dry adhesive patch with micro-absorbent hybrid structure capable of capturing and cleanly-adhering body-fluid and manufacturing method thereof",
      inventors: "Chang Hyun Pang, Sang Yul Baik, Da Wan Kim, Ji Hyun Lee",
      number: "US11504036B2", country: "US Patent" },
    { no: 11, year: 2021, title: "Adhesive patch",
      inventors: "Chang Hyun Pang, Da Wan Kim, Sang Yul Baik",
      number: "US11058609B2", country: "US Patent" },
    { no: 9, year: 2021, title: "Vibration resistant dry skin adhesive patch",
      inventors: "C. Pang, Da Wan Kim, J. Kim", number: "", country: "Korea Patent" },
    { no: 8, year: 2021, title: "Water-repellent adhesive patch and method manufacturing the same",
      inventors: "C. Pang, H. Min, J. Kim, Da Wan Kim", number: "", country: "Korea Patent" },
    { no: 7, year: 2021, title: "Fiber-type temperature sensor with compressed micro-wrinkles and manufacturing method thereof",
      inventors: "C. Pang, J. Lee, Da Wan Kim", number: "", country: "Korea Patent" },
    { no: 6, year: 2021, title: "Adhesive patch",
      inventors: "C. Pang, Da Wan Kim, S. Baik", number: "", country: "Korea Patent" },
    { no: 5, year: 2021, title: "Fiber composite and preparing method of the same",
      inventors: "C. Pang, G. Lee, J. Kim, Da Wan Kim, S. Jang", number: "", country: "Korea Patent" },
    { no: 4, year: 2021, title: "Dry adhesive patches having a micro-absorbent hybrid structure that can collect fluids and attach them cleanly",
      inventors: "C. Pang, S. Baik, Da Wan Kim, J. Lee", number: "", country: "Korea Patent" },
    { no: 3, year: 2021, title: "Dry adhesive skin patch",
      inventors: "C. Pang, S. Chun, Da Wan Kim", number: "", country: "Korea Patent" },
    { no: 2, year: 2021, title: "Fiber-based sensors and method of manufacturing the same",
      inventors: "T. Lee, C. Pang, J. Lee, S. Shin, S. Kang, Y. Park, Da Wan Kim, S. Choi",
      number: "", country: "Korea Patent" },
    { no: 1, year: 2021, title: "Gas sensing nano actuator and method for manufacturing of the same",
      inventors: "T. Lee, C. Pang, J. Seo, Da Wan Kim, S. Baik", number: "", country: "Korea Patent" }
  ],

  /* ==========================================================================
     [6] 뉴스  →  news.html   (맨 위 항목이 가장 위에 표시됨)
     각 칸: date(표시용 날짜) / title(제목) / text(내용) / img(사진 — 선택)
     새 소식: 맨 위에 { date: "...", title: "...", text: "...", img: "" }, 추가
     ========================================================================== */
  news: [
    {
      date: "2025-01",
      title: "Paper published in Biomimetics",
      text: "\"Design and Sensing Frameworks of Soft Octopus-Inspired Grippers Toward Artificial Intelligence\" has been published.",
      img: ""   // 사진을 넣으려면 images/news/ 에 올리고 "images/news/파일명.jpg"
    },
    {
      date: "2023-03",
      title: "SER Lab opens at Korea National University of Transportation",
      text: "The Soft Electronics & Robotics Lab. begins its journey in the Department of Electronics Engineering.",
      img: ""
    }
  ],

  /* ==========================================================================
     [7] 갤러리  →  gallery.html
     사진을 images/gallery/ 에 올린 뒤 아래에 한 줄 추가
     ========================================================================== */
  gallery: [
    // { src: "images/gallery/2025-workshop.jpg", caption: "Lab workshop, Summer 2025" },
  ],

  /* ==========================================================================
     [8] 협력 기관 회전 배너  →  홈 하단
     배열 순서 = 배너에 흐르는 순서.  로고는 images/partners/ 에 업로드
     ========================================================================== */
  partners: [
    { name: "한국표준과학연구원 KRISS", img: "images/partners/kriss.png?v=7",      url: "https://www.kriss.re.kr" },
    { name: "한국전자통신연구원 ETRI",  img: "images/partners/etri.png?v=7",       url: "https://www.etri.re.kr" },
    { name: "경찰대학",                 img: "images/partners/police.png?v=7",     url: "https://www.police.ac.kr" },
    { name: "LG생활건강",               img: "images/partners/lghnh.png?v=7",      url: "https://www.lghnh.com" },
    { name: "콜마비앤에이치",           img: "images/partners/kolmarbnh.png?v=7",  url: "https://www.kolmarbnh.co.kr" },
    { name: "MIMETICS",                 img: "images/partners/mimetics.png?v=7",   url: "https://mimetics.co.kr" },
    { name: "Physionics",               img: "images/partners/physionics.png?v=7", url: "https://www.physionics.co.kr" }
  ]
};
