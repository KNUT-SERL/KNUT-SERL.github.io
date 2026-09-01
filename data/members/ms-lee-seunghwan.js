/* ============================================================
   이승환 (Seunghwan Lee) — 석사과정

   이 파일 하나가 구성원 한 명입니다. 값만 고치면 카드에 그대로 반영됩니다.
   · 새 구성원  : 이 파일을 복사 → 이름을 "과정-성-이름.js" 로 바꾸고 내용 교체
                  → data/members-list.js 목록에 경로 한 줄 추가
   · 졸업 처리  : 아래 group 을 "alumni" 로 바꾸고 degree·now 를 채운 뒤
                  파일 이름 앞부분을 alumni- 로 변경 (data/members-list.js 도 함께 수정)
   ============================================================ */
MEMBER({
  group: "ms",                    // 소속: phd(박사) / ms(석사) / bs(학부) / alumni(졸업생)
  slug: "lee-seunghwan",          // 사진 이름 → images/members/lee-seunghwan.jpg (없으면 .png, 그것도 없으면 이니셜)
  name: "Seunghwan Lee",          // 영문 이름 — 카드 제목
  kor: "이승환",                  // 한글 이름 — 이름 옆 괄호 안에 표시
  role: "M.S. Student (B.S.–M.S. Combined)", // 과정 표기 (학석사 연계과정)
  email: "saa4563123@naver.com",  // 이메일 — 비우면("") 카드에 표시되지 않음
  interests: "Robot control, bio-inspired robotics", // 카드에 늘 보이는 연구 키워드 한 줄

  /* 아래 4개는 카드를 클릭했을 때 펼쳐지는 상세 패널 내용입니다.
     네 개를 모두 비워 두면 패널 자체가 만들어지지 않습니다. */
  bio: "",                        // Research — 대표 연구 설명 1~2문장
  pubs: [],                       // Selected Publications — 논문 제목 (기울임은 <i></i>)
  patents: [],                    // Patents — 특허 목록
  awards: [],                     // Honors — 수상 목록
});
