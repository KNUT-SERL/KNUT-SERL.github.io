# SER Lab 웹사이트 운영 가이드

이 사이트는 **폴더로 정리된 정적 사이트**입니다.
고칠 내용에 따라 아래 표의 폴더만 찾아가면 됩니다.

수정 방법은 어디서나 똑같습니다 —
**GitHub에서 파일 클릭 → 연필 아이콘(Edit) → 고치기 → Commit changes.**
사진처럼 새 파일을 넣을 때는 **해당 폴더로 들어가서 → Add file → Upload files.**
(반드시 그 폴더 안에서 업로드해야 합니다. 맨 바깥에 올리면 사진이 안 보입니다.)

---

## 1. 폴더 구조 한눈에 보기

```
├─ index.html, research.html, professor.html …   ← 페이지들 (맨 바깥에 그대로)
│
├─ data/                    ← ★ 내용(글자)은 전부 여기
│   ├─ site-data.js         연구분야·뉴스·갤러리·특허·협력기관·논문설정
│   ├─ members-list.js      구성원 파일 목록과 표시 순서
│   └─ members/             ★ 구성원 한 명 = 파일 하나
│       ├─ ms-jang-junwon.js
│       ├─ bs-kim-younghun.js
│       └─ alumni-lee-yusin.js …
│
├─ images/                  ← ★ 사진은 전부 여기
│   ├─ logo.png             상단 로고
│   ├─ members/             구성원·교수 사진
│   ├─ research/            연구분야 카드 사진
│   └─ partners/            협력기관 로고
│
├─ css/style.css            디자인 (색상은 맨 위 :root 부분)
├─ js/common.js             상단 메뉴·푸터·구성원 불러오기
├─ js/pubs.js               논문 자동 로딩
└─ tools/                   자리표시 이미지 생성 스크립트 (평소엔 쓸 일 없음)
```

**한 줄 요약**
- 사람 관련 → `data/members/`
- 그 밖의 글 → `data/site-data.js`
- 사진 → `images/` 아래 알맞은 폴더

---

## 2. 구성원 추가하기

구성원 한 명이 파일 하나입니다. **두 단계**면 끝납니다.

### ① 파일 만들기 — `data/members/` 안에

파일 이름 규칙은 **`과정-성-이름.js`** (전부 소문자, 영문):

| 과정 | 앞에 붙이는 말 | 예시 |
|---|---|---|
| 박사과정 | `phd-` | `phd-hong-gildong.js` |
| 석사과정 | `ms-` | `ms-jang-junwon.js` |
| 학부연구생 | `bs-` | `bs-kim-younghun.js` |
| 졸업생 | `alumni-` | `alumni-lee-yusin.js` |

> 이름이 `Junwon Jang`(장준원)이면 **성이 앞** → `jang-junwon` 입니다.

가장 쉬운 방법은 **비슷한 사람의 파일을 복사**하는 것입니다.
`data/members/` 폴더에서 기존 파일 클릭 → 우측 상단 `...` → **Copy raw file** →
`Add file → Create new file` 로 새 이름을 지어 붙여넣고 내용만 바꾸면 됩니다.

파일 안에는 `MEMBER({ ... })` 가 **딱 한 번** 들어갑니다.
칸마다 무슨 뜻인지 한국어 주석이 붙어 있으니 그대로 따라 고치세요.

```js
MEMBER({
  group: "ms",                  // phd / ms / bs / alumni 중 하나
  slug: "jang-junwon",          // 사진 파일 이름 (images/members/jang-junwon.jpg)
  name: "Junwon Jang",          // 영문 이름
  kor: "장준원",                // 한글 이름
  role: "M.S. Student",         // 과정 표기
  email: "wertt1027@gmail.com", // 비우면("") 표시 안 됨
  interests: "Tactile sensors, soft grippers",   // 카드에 늘 보이는 한 줄

  bio: "",        // 이 아래 4개는 카드를 클릭하면 펼쳐지는 상세 패널
  pubs: [],       // 네 개를 모두 비우면 패널이 아예 안 생깁니다
  patents: [],
  awards: []
});
```

### ② 목록에 한 줄 추가 — `data/members-list.js`

**이 단계를 빼먹으면 파일을 만들어도 화면에 나오지 않습니다.**
알맞은 과정 자리에 경로 한 줄을 넣어 주세요. 여기 적힌 **순서 그대로** 카드가 표시됩니다.

```js
  /* ---- 석사과정 (ms) ---- */
  "data/members/ms-jang-junwon.js",        // 장준원
  "data/members/ms-lee-junho.js",          // 이준호
  "data/members/ms-hong-gildong.js",       // ← 새로 추가한 줄
```

> 줄 끝의 쉼표(`,`)를 빠뜨리지 마세요. **맨 마지막 줄에는 쉼표를 붙이지 않습니다.**

---

## 3. 졸업 처리하기

재학생 파일을 졸업생 형식으로 바꾸면 됩니다. 사람을 지웠다 다시 만들 필요 없습니다.

1. `data/members/` 에서 그 사람 파일을 엽니다. (예: `bs-lee-yusin.js`)
2. 내용을 졸업생 형식으로 고칩니다.
   - `group` 을 `"alumni"` 로 바꿉니다
   - `role`·`interests`·`bio`·`pubs`·`patents`·`awards` 줄은 지웁니다
   - `degree`(취득 학위)와 `now`(현재 소속)를 새로 넣습니다

   ```js
   MEMBER({
     group: "alumni",
     slug: "lee-yusin",
     name: "Yusin Lee",
     kor: "이유신",
     degree: "B.S. (Electronics)",              // 취득 학위
     email: "leeyushin5029@gmail.com",
     now: "Bluu Inc. — Tech Support, IT Dept."  // 현재 소속 (비우면 표시 안 됨)
   });
   ```
3. 파일 이름 앞부분을 `alumni-` 로 바꿉니다.
   (파일 편집 화면에서 파일명 칸을 `bs-lee-yusin.js` → `alumni-lee-yusin.js` 로 고치면 됩니다)
4. `data/members-list.js` 에서 그 줄을 **졸업생 구역으로 옮기고** 경로도 새 이름으로 고칩니다.

   ```js
   -  "data/members/bs-lee-yusin.js",       // 학부 구역에서 삭제
   +  "data/members/alumni-lee-yusin.js",   // 졸업생 구역에 추가
   ```

---

## 4. 사진 넣기·바꾸기

### 어디에 올리나요

구성원·교수 사진은 모두 **`images/members/` 폴더 안**에 올립니다.

| 대상 | 파일 이름 | 권장 크기 |
|---|---|---|
| 학생·졸업생 | `성-이름.jpg` (파일 안의 `slug` 와 같은 이름) | 정사각형, 480×480 이상 |
| 교수 | `professor.jpg` | 세로 3:4, 600×800 이상 |

예: `ms-jang-junwon.js` 의 `slug` 가 `"jang-junwon"` 이면 → `images/members/jang-junwon.jpg`

### 사진이 없으면 어떻게 되나요 (3단 자동 대체)

사진은 **세 단계로 차례차례** 찾아서 표시됩니다.

```
① images/members/성-이름.jpg     ← 실제 사진 (있으면 이것)
        ↓ 없으면
② images/members/성-이름.png     ← 파스텔 자리표시 그림 (지금 들어 있는 것)
        ↓ 없으면
③ 이니셜 동그라미                 ← 예: 장준원 → "JJ"
```

지금은 모든 구성원과 교수의 **②번 자리표시 그림**이 들어 있어서,
실제 사진이 없어도 카드가 비어 보이지 않습니다.
나중에 실제 사진을 `.jpg` 로 올리기만 하면 **자동으로 그 사진이 우선 표시**됩니다.
자리표시 그림(`.png`)은 지우지 않아도 됩니다.

> **참고 — 개발자 도구에 뜨는 404 메시지는 정상입니다**
> 브라우저는 먼저 `.jpg` 를 찾아보고, 없으면 `.png` 로 넘어갑니다.
> 그래서 아직 실제 사진이 없는 사람은 `F12 → Console` 에
> `...jang-junwon.jpg 404 (Not Found)` 같은 줄이 보일 수 있습니다.
> **화면에는 아무 문제가 없고**, 그 사람의 실제 사진을 올리면 이 메시지도 사라집니다.

### 새로 들어온 사람의 자리표시 그림 만들기

구성원을 추가했는데 아직 사진이 없다면 그냥 두어도 됩니다(이니셜이 표시됨).
파스텔 자리표시 그림까지 만들고 싶다면, 컴퓨터에 저장소를 내려받은 뒤:

```bash
node tools/make-placeholders.mjs
```

`data/members-list.js` 를 읽어 빠진 그림을 만들어 `images/members/` 에 넣어 줍니다.

### 그 밖의 사진

| 종류 | 올릴 곳 | 연결하는 곳 |
|---|---|---|
| 연구분야 카드 | `images/research/` | `data/site-data.js` 의 `research:` → `img` |
| 협력기관 로고 | `images/partners/` | `data/site-data.js` 의 `partners:` → `img` |
| 뉴스·갤러리·논문 썸네일 | `images/` 아래 원하는 폴더 | `data/site-data.js` 의 해당 섹션 |

경로는 항상 **`images/` 부터 전부** 적습니다. (예: `"images/research/haptic.jpg"`)

---

## 5. 사람 말고 다른 내용 고치기 — `data/site-data.js`

파일 안에 번호가 매겨진 안내 주석이 있습니다.

| 섹션 | 내용 |
|---|---|
| `[1] pub` | 논문 자동 로딩 설정 (배지·제외 목록 등) |
| `[2] research` | 연구 분야 4개 — 홈과 Research 페이지에 함께 반영 |
| `[5] patents` | 특허 목록 |
| `[6] news` | 뉴스 — 맨 위에 추가하면 맨 위에 표시 |
| `[7] gallery` | 갤러리 사진 |
| `[8] partners` | 협력기관 회전 배너 |

> 교수 프로필의 학력·경력 글은 `professor.html` 파일에서 직접 고칩니다.

**형식 규칙 (이것만 지키면 안 깨집니다)**
- 글자 값은 큰따옴표로 감싼다: `name: "Junwon Jang",`
- 항목 덩어리 끝에는 쉼표: `{ ... },`
- 지울 때는 `{` 부터 `},` 까지 통째로
- 비울 값은 `""` 로 남긴다

---

## 6. 논문 페이지는 자동입니다

`publications.html` 은 열릴 때마다 OpenAlex에서 논문을 실시간으로 불러옵니다.
새 논문이 나와도 손댈 것이 없습니다 (반영까지 보통 며칠).
배지·제외 목록은 `data/site-data.js` 의 `[1] pub` 에서 조정합니다.

---

## 7. 문제 해결

**고쳤는데 화면이 그대로예요**
1~2분 기다린 뒤 `Ctrl+F5`(Mac은 `Cmd+Shift+R`)로 강력 새로고침.
그래도 안 바뀌면 브라우저가 옛 파일을 붙잡고 있는 것이니 **캐시 번호**를 올립니다:
- 모든 `.html` 파일 안의 `?v=7` → `?v=8`
- `js/common.js` 맨 위의 `const ASSET_V = "?v=7";` → `"?v=8"`

**구성원을 추가했는데 안 보여요**
- `data/members-list.js` 에 줄을 추가했나요? (가장 흔한 원인)
- 경로와 파일 이름의 철자가 정확한가요? 대소문자도 구분됩니다
- 줄 끝 쉼표를 빠뜨리지 않았나요?

**사진이 안 보여요**
- `images/members/` **폴더 안**에 올렸나요? (맨 바깥에 올리면 안 됩니다)
- 파일 이름이 그 사람의 `slug` 와 정확히 같은가요?
- 확장자가 `.JPG` 처럼 대문자면 `.jpg` 로 바꿔 주세요

**페이지가 아예 깨져요**
`data/` 안의 `.js` 파일에서 따옴표나 쉼표를 빠뜨린 경우가 대부분입니다.
GitHub에서 그 파일 → **History** → 이전 버전으로 되돌릴 수 있습니다.

**사이트가 아예 안 떠요**
저장소 이름이 `계정명.github.io` 인지, 맨 바깥에 `index.html` 이 있는지 확인하세요.
