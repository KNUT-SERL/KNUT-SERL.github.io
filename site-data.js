/* ============================================================================
   ★★★  SER Lab 콘텐츠 데이터 파일 — 사이트 내용은 여기서만 수정하면 됩니다  ★★★

   [수정 방법]
   1) 이 파일을 메모장(또는 GitHub 웹의 연필 아이콘)으로 연다
   2) 아래 섹션 중 바꿀 부분을 찾아 형식 그대로 고친다
   3) 저장 후 GitHub 저장소에 다시 업로드(덮어쓰기) → 1분 내 사이트 반영

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
    //    형식: "DOI(소문자)": "이미지 경로"  (이미지는 GitHub 저장소에 업로드)
    thumbs: {
      // "10.3390/biomimetics10010001": "pub37.jpg",
    }
  },

  /* ==========================================================================
     [2] 연구 분야  →  research.html 카드 + 홈 화면의 4개 카드
     title(제목)·desc(설명)를 고치면 두 페이지에 동시에 반영됨
     img 에 지정된 경로로 사진을 올리면 카드 상단에 표시 (없으면 아이콘만)
     ========================================================================== */
  research: [
    {
      title: "Soft Robot & Electronics",
      icon: "🤖",                              // 이모지 아이콘 (자유롭게 교체)
      img: "soft-robot.jpg?v=3",
      desc: "Bioinspired soft sensors and actuators — pneumatic soft grippers with haptic "
          + "recognition frameworks and dome-structured tactile sensing arrays."
    },
    {
      title: "Bioinspired Haptic Sensors",
      icon: "🖐️",
      img: "haptic.jpg?v=3",
      desc: "Haptic sensor systems inspired by human skin mechanoreceptors — from receptor-level "
          + "signal pathways to fingertip-integrated haptic sensing systems."
    },
    {
      title: "XR Skin-Adhesive Interfaces",
      icon: "🥽",
      img: "xr.jpg?v=3",
      desc: "Vibration-resistive, sweat-tolerant skin-adhesive haptic interfaces that deliver "
          + "realistic tactile feedback for immersive XR experiences."
    },
    {
      title: "Wearable Sensors for Biosignal Monitoring",
      icon: "⌚",
      img: "wearable.jpg?v=3",
      desc: "Skin-conformal adhesive soft electronics with minimal residue and conformal contact "
          + "for long-term EMG and biosignal monitoring."
    }
  ],

  /* ==========================================================================
     [3] 구성원 — 박사(phd) / 석사(ms) / 학부(bs) 페이지의 카드
     --------------------------------------------------------------------------
     ▸ 한 사람 = 중괄호 한 덩어리 { ... },   순서대로 카드가 나열됨
     ▸ 각 칸의 의미:
         name      영문 이름 (카드 제목)
         kor       한글 이름 (괄호 안에 표시)
         role      과정 표기 (예: "M.S. Student")
         email     이메일 — 비우면("") 표시 안 됨
         photo     사진 경로 —  폴더에 같은 이름으로 업로드.
                   사진이 없으면 자동으로 이니셜 원형 아바타가 대신 표시됨
         interests 카드에 항상 보이는 한 줄 (연구 키워드)
     ▸ 아래 4개는 [마우스를 올리면 펼쳐지는 상세 패널]에 표시됩니다.
       전부 비워두면 카드가 평범하게 나오고 패널 자체가 안 생깁니다:
         bio       "Research" 항목 — 대표 연구 설명 1~2문장
         pubs      "Selected Publications" — 논문 제목 목록 (기울임은 <i></i>)
         patents   "Patents" — 특허 목록
         awards    "Honors" — 수상 목록
     ▸ 사람 추가: 아래 덩어리 하나를 복사해 붙이고 내용만 교체
     ▸ 졸업 처리: 덩어리를 잘라내 [4] alumni 로 옮기고 형식을 맞춰줌
     ========================================================================== */

  phd: [
    /* 박사과정 입학자가 생기면 아래 주석을 풀고(앞의 // 제거) 내용 교체
    {
      name: "Hong Gildong", kor: "홍길동", role: "Ph.D. Student",
      email: "hong@example.com", photo: "hong-gildong.jpg",
      interests: "Soft robotics",
      bio: "", pubs: [], patents: [], awards: []
    },
    */
  ],

  ms: [
    {
      name: "Junwon Jang", kor: "장준원", role: "M.S. Student",
      email: "wertt1027@gmail.com", photo: "jang-junwon.jpg",
      interests: "Soft grippers, tactile sensing",
      bio: "Octopus-inspired soft grippers and their sensing frameworks for intelligent object handling.",
      pubs: [
        "Design and Sensing Frameworks of Soft Octopus-Inspired Grippers Toward Artificial Intelligence — <i>Biomimetics</i>, 2025 (co-first author)",
        "Bioinspired Hierarchical Soft Gripper with Hexagonal and Suction Interfaces for Strain-Guided Object Handling — 2025"
      ],
      patents: [],
      awards: []
    },
    {
      name: "Junho Lee", kor: "이준호", role: "M.S. Student",
      email: "wnsgh1916@naver.com", photo: "lee-junho.jpg",
      interests: "Soft grippers, bioinspired interfaces",
      bio: "Bioinspired suction interfaces for strain-guided, adaptive object handling.",
      pubs: [
        "Bioinspired Hierarchical Soft Gripper with Hexagonal and Suction Interfaces for Strain-Guided Object Handling — 2025 (first author)",
        "Design and Sensing Frameworks of Soft Octopus-Inspired Grippers Toward Artificial Intelligence — <i>Biomimetics</i>, 2025"
      ],
      patents: [],
      awards: []
    },
    {
      name: "Subi Jeon", kor: "전수비", role: "M.S. Student",
      email: "jxxnsub@gmail.com", photo: "jeon-subi.jpg",
      interests: "",                                    // TODO: 연구 키워드 입력
      bio: "",
      pubs: [
        "Amphibian toe pad-mimicking wearable plant gas sensor for nitrogen dioxide detection — 2025"
      ],
      patents: [],
      awards: []
    },
    {
      name: "Taeyoung Chang", kor: "장태영", role: "M.S. Student",
      email: "changtae0329@gmail.com", photo: "chang-taeyoung.jpg",
      interests: "",                                    // TODO: 연구 키워드 입력
      bio: "",
      pubs: [
        "Bioinspired Hierarchical Soft Gripper with Hexagonal and Suction Interfaces for Strain-Guided Object Handling — 2025"
      ],
      patents: [],
      awards: []
    },
    {
      name: "Sangyoon Kang", kor: "강상윤", role: "M.S. Student",
      email: "kanghan2000@naver.com", photo: "kang-sangyoon.jpg",
      interests: "",                                    // TODO: 연구 키워드 입력
      bio: "", pubs: [], patents: [], awards: []
    },
    {
      name: "Seunghwan Lee", kor: "이승환", role: "M.S. Student (B.S.–M.S. Combined)",  // 학석사 연계과정
      email: "saa4563123@naver.com", photo: "lee-seunghwan.jpg",
      interests: "",                                    // TODO: 연구 키워드 입력
      bio: "", pubs: [], patents: [], awards: []
    }
  ],

  bs: [
    {
      name: "Younghun Kim", kor: "김영훈", role: "Undergraduate Researcher",
      email: "tommy102030@naver.com", photo: "kim-younghun.jpg",
      interests: "", bio: "", pubs: [], patents: [], awards: []
    },
    {
      name: "Kangmin Lee", kor: "이강민", role: "Undergraduate Researcher",
      email: "ckkm1112@gmail.com", photo: "lee-kangmin.jpg",
      interests: "", bio: "", pubs: [], patents: [], awards: []
    },
    {
      name: "Yeonwoo Choi", kor: "최연우", role: "Undergraduate Researcher",
      email: "choiyeonwoo12@naver.com", photo: "choi-yeonwoo.jpg",
      interests: "", bio: "", pubs: [], patents: [], awards: []
    },
    {
      name: "Jinseo Kim", kor: "김진서", role: "Undergraduate Researcher",
      email: "sky201210@naver.com", photo: "kim-jinseo.jpg",
      interests: "", bio: "", pubs: [], patents: [], awards: []
    },
    {
      name: "Jihyeon Byeon", kor: "변지현", role: "Undergraduate Researcher",
      email: "", photo: "byeon-jihyeon.jpg",   // email "" → 표시 안 됨
      interests: "", bio: "", pubs: [], patents: [], awards: []
    },
    {
      name: "Chaeyeon Jang", kor: "장채연", role: "Undergraduate Researcher",
      email: "", photo: "jang-chaeyeon.jpg",
      interests: "", bio: "", pubs: [], patents: [], awards: []
    },
    {
      name: "Inho Jeong", kor: "정인호", role: "Undergraduate Researcher",
      email: "", photo: "jeong-inho.jpg",
      interests: "", bio: "", pubs: [], patents: [], awards: []
    }
  ],

  /* ==========================================================================
     [4] 졸업생  →  alumni.html
     각 칸: name/kor(이름), degree(취득 학위), email, now(현재 소속 — 비우면 표시 안 됨)
     ========================================================================== */
  alumni: [
    { name: "Junyoung Sim", kor: "심준영", degree: "B.S. (Electronics)",
      email: "shimjuny123@gmail.com", now: "" },        // TODO: 현재 소속 입력
    { name: "Jongheon Jang", kor: "장종헌", degree: "B.S. (Electronics)",
      email: "qkdkew123@naver.com", now: "Yukyung — Control S/W Development" },
    { name: "Hyeokjun Gwon", kor: "권혁준", degree: "B.S. (Electronics)",
      email: "kwonhyeokjun12@naver.com", now: "Egtronics — Charger H/W Development" },
    { name: "Haejun Bak", kor: "박해준", degree: "B.S. (Electronics)",
      email: "hjpak2000@gmail.com", now: "Kalman Corp. — Robot Electrical System H/W" },
    { name: "Yusin Lee", kor: "이유신", degree: "B.S. (Electronics)",
      email: "leeyushin5029@gmail.com", now: "Bluu Inc. — Tech Support, IT Dept." }
  ],

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
      img: ""   // 사진을 넣으려면:  에 업로드 후 "파일명.jpg"
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
     사진을  에 올린 뒤 아래에 한 줄 추가
     ========================================================================== */
  gallery: [
    // { src: "2025-workshop.jpg", caption: "Lab workshop, Summer 2025" },
  ],

  /* ==========================================================================
     [8] 협력 기관 회전 배너  →  홈 하단
     배열 순서 = 배너에 흐르는 순서.  로고는  에 업로드
     ========================================================================== */
  partners: [
    { name: "한국표준과학연구원 KRISS", img: "kriss.png",      url: "https://www.kriss.re.kr" },
    { name: "한국전자통신연구원 ETRI",  img: "etri.png",       url: "https://www.etri.re.kr" },
    { name: "경찰대학",                 img: "police.png",     url: "https://www.police.ac.kr" },
    { name: "LG생활건강",               img: "lghnh.png",      url: "https://www.lghnh.com" },
    { name: "콜마비앤에이치",           img: "kolmarbnh.png",  url: "https://www.kolmarbnh.co.kr" },
    { name: "MIMETICS",                 img: "mimetics.png",   url: "https://mimetics.co.kr" },
    { name: "Physionics",               img: "physionics.png", url: "https://www.physionics.co.kr" }
  ]
};
