# 작업 원칙 (Claude Code 세션용)

이 저장소는 GitHub Pages 정적 사이트(SER Lab)입니다. 코드를 바꿀 때 아래를 지킵니다.

## 1. 문서를 항상 함께 갱신한다
- 사이트 기능·파일 형식·폴더 규칙·표시 방식이 바뀌면 **같은 커밋에서** `README.md`(관리자 상세 설명서)와
  `GUIDE.md`(한 장 요약표)를 갱신한다. 관리자가 README만 읽고도 사이트를 운영할 수 있어야 한다.
- 관련 데이터 파일의 머리 주석(`data/news.txt`, `data/patents.txt`, `gallery/형식-안내.txt` 등)도 같이 맞춘다.

## 2. 콘텐츠는 "파일만 올리면 되는" 방식
- 폴더 방식: `members/`(PREFIX-NNN-Name), `research/`(R-NNN-이름), `gallery/`(G-날짜-NNN-제목), `awards/`(A-연도-NNN-이름)
- 텍스트 방식: `data/news.txt`, `data/patents.txt` (맨 아래에 이어 붙이면 화면에는 최신이 위)
- 새 콘텐츠 종류를 추가하면 `tools/make-manifest.mjs`, `js/content.js`(파서·API 폴백),
  `.github/workflows/update-manifest.yml`의 감시 경로에 함께 등록한다.

## 3. 캐시 버전
- JS/CSS를 바꾸면 모든 `.html`의 `?v=N`과 `js/common.js`의 `ASSET_V`를 같은 숫자로 올리고,
  README 13장(문제 해결)의 안내 숫자도 다음 번호로 갱신한다. 데이터·이미지만 바꿀 때는 올리지 않는다.

## 4. 배포 전 확인
- 로컬 서버 + Chromium(playwright)으로 해당 페이지를 열어 콘솔 에러·404·렌더링을 확인한 뒤 푸시한다.
- 흐름: 작업 브랜치 → PR → 머지 (사용자가 "바로 반영"을 요청하면 즉시 머지). 머지 후 Pages가 자동 배포된다.
