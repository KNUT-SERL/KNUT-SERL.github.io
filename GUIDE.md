# SER Lab 웹사이트 운영 가이드 (폴더 없는 단순 구조)

이 사이트는 **모든 파일이 저장소 맨 바깥에 평평하게** 놓이는 구조입니다.
폴더가 없으므로 업로드 실수가 원천적으로 불가능합니다 —
어떤 파일이든 저장소 첫 화면에서 **Add file → Upload files → 드래그 → Commit** 하면 끝.

---

## 1. 파일 구성

| 파일 | 역할 |
|---|---|
| index.html | 홈 |
| research.html | 연구 분야 |
| professor.html | 교수 프로필 (내용은 이 파일에서 직접 수정) |
| students-phd/ms/bs.html, alumni.html | 구성원 페이지들 (명단은 site-data.js에서) |
| publications.html | 논문(자동)·특허 |
| news.html / gallery.html / contact.html | 뉴스 / 갤러리 / 연락처 |
| **site-data.js** | ★ 거의 모든 내용은 이 파일 하나만 수정 ★ |
| style.css | 디자인 (색상은 맨 위 :root 변수) |
| common.js | 상단 메뉴·푸터 / pubs.js | 논문 자동 로딩 |
| logo.png, kriss.png 등 | 이미지 (그냥 저장소에 같이 있음) |

## 2. 일상적인 수정 = site-data.js 하나

GitHub에서 `site-data.js` 클릭 → 연필 아이콘(Edit) → 수정 → Commit.
파일 안에 [1]~[8] 섹션별로 무엇을 어떻게 고치는지 주석으로 설명되어 있습니다.

- 뉴스 추가: `news:` 맨 위에 `{ date:"...", title:"...", text:"...", img:"" },`
- 갤러리: 사진을 저장소에 업로드 후 `gallery:`에 `{ src:"파일명.jpg", caption:"..." },`
- 학생 추가/졸업: `phd:`/`ms:`/`bs:` ↔ `alumni:` 사이에서 항목 이동
- 특허 추가: `patents:` 맨 위에 한 덩어리 추가

## 3. 사진 파일명 규칙 (전부 저장소 맨 바깥에 업로드)

- 교수님 사진: `professor.jpg` (3:4 세로 권장)
- 학생 사진: site-data.js의 photo 값과 같은 이름 (예: jang-junwon.jpg)
- 논문 썸네일·뉴스·갤러리: 자유 파일명 — site-data.js에 그 이름을 적으면 연결됨
- 사진이 없으면 자동으로 이니셜 아바타/아이콘으로 대체됩니다

## 4. 논문 페이지 (자동)

publications.html은 열릴 때마다 OpenAlex에서 논문을 실시간으로 불러옵니다.
새 논문이 나와도 손댈 것 없음 (반영까지 보통 며칠).
배지·제외 목록 등은 site-data.js 의 `pub:` 섹션에서 조정.

## 5. 문제 해결

- 수정했는데 안 바뀜 → 1~2분 기다린 후 Ctrl+F5 (강력 새로고침)
- 사이트가 안 뜸 → 저장소 이름이 `계정명.github.io`인지, index.html이 첫 화면에 보이는지 확인
- 뭔가 꼬임 → 파일 클릭 → History에서 이전 버전으로 복구 가능
