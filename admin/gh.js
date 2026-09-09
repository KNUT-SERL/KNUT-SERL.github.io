/* ============================================================
   GitHub API 클라이언트 — 관리자 화면(admin/)에서만 사용합니다.

   · 읽기: contents API (폴더 목록 · 파일 내용)
   · 쓰기: Git Data API — 여러 파일의 추가·수정·삭제·이름 바꾸기를
           "한 번의 커밋"으로 묶어 main 브랜치에 반영합니다.
   · 토큰이 없으면 공개 저장소 읽기만 됩니다 (시간당 60회 제한).
   ============================================================ */
"use strict";

class GitHubClient {
  constructor({ api, owner, repo, branch, token }) {
    this.api = (api || "https://api.github.com").replace(/\/+$/, "");
    this.owner = owner; this.repo = repo; this.branch = branch || "main"; this.token = token || "";
    this.rate = null;                      // 마지막 응답의 요청 한도 정보
  }
  get repoPath() { return `/repos/${this.owner}/${this.repo}`; }
  encPath(p) { return String(p).split("/").map(encodeURIComponent).join("/"); }

  /* ---- 공통 요청 ---- */
  async req(method, path, body, { allow = [] } = {}) {
    const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (this.token) headers.Authorization = "Bearer " + this.token;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    let r;
    try {
      r = await fetch(this.api + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
    } catch (e) { throw new Error(`네트워크 오류 — 인터넷 연결이나 API 주소를 확인하세요 (${e.message})`); }
    const remaining = r.headers.get("x-ratelimit-remaining");
    if (remaining !== null) this.rate = { remaining: +remaining, limit: +r.headers.get("x-ratelimit-limit"), reset: +r.headers.get("x-ratelimit-reset") };
    if (r.status === 204) return null;
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!r.ok) {
      if (allow.includes(r.status)) return null;
      const msg = (data && data.message) || r.statusText || "";
      const hint = { 401: "토큰이 틀리거나 만료되었습니다", 403: "권한이 없거나 요청 한도를 넘었습니다 (토큰의 Contents 권한 확인)",
                     404: "찾을 수 없습니다 (저장소 이름·브랜치·토큰의 접근 범위 확인)", 409: "다른 변경과 겹쳤습니다 — 다시 시도하세요",
                     422: "요청이 거부되었습니다 — 새로고침 후 다시 시도하세요" }[r.status] || "";
      const err = new Error(`GitHub ${r.status}: ${msg}${hint ? " — " + hint : ""}`);
      err.status = r.status; err.data = data; throw err;
    }
    return data;
  }

  /* ---- 읽기 ---- */
  me() { return this.req("GET", "/user"); }
  repoInfo() { return this.req("GET", this.repoPath); }
  async ls(dir) {                         // 폴더 목록 → [{ name, path, sha, size, type:'file'|'dir', download_url }]
    const d = await this.req("GET", `${this.repoPath}/contents/${this.encPath(dir)}?ref=${encodeURIComponent(this.branch)}`, undefined, { allow: [404] });
    return Array.isArray(d) ? d : [];
  }
  async readFile(path) {                  // 텍스트 파일 → { text, sha, size }
    const d = await this.req("GET", `${this.repoPath}/contents/${this.encPath(path)}?ref=${encodeURIComponent(this.branch)}`);
    if (Array.isArray(d)) throw new Error(`${path} 은(는) 폴더입니다`);
    const b64 = d.encoding === "base64" && d.content ? d.content : (await this.req("GET", `${this.repoPath}/git/blobs/${d.sha}`)).content;
    return { text: GitHubClient.b64ToText(b64), sha: d.sha, size: d.size };
  }
  async readBytes(sha) { return GitHubClient.b64ToBytes((await this.req("GET", `${this.repoPath}/git/blobs/${sha}`)).content); }
  async headSha() { return (await this.req("GET", `${this.repoPath}/git/ref/heads/${this.encPath(this.branch)}`)).object.sha; }
  async tree() {                          // 저장소 전체 파일 목록 → [{ path, type, sha, size }]
    const t = await this.req("GET", `${this.repoPath}/git/trees/${this.encPath(this.branch)}?recursive=1`);
    return t.tree || [];
  }
  commits(n = 8) { return this.req("GET", `${this.repoPath}/commits?sha=${encodeURIComponent(this.branch)}&per_page=${n}`); }
  runs(workflowFile, n = 5) { return this.req("GET", `${this.repoPath}/actions/workflows/${workflowFile}/runs?per_page=${n}`, undefined, { allow: [403, 404] }); }
  pagesBuild() { return this.req("GET", `${this.repoPath}/pages/builds/latest`, undefined, { allow: [403, 404] }); }

  /* ---- 쓰기: 여러 변경을 한 커밋으로 ----
     changes 항목:  { path, text }          새 내용(문자열)
                    { path, bytes }         새 내용(Uint8Array — 이미지)
                    { path, sha }           기존 blob 재사용 (이름 바꾸기·복사)
                    { path, delete: true }  삭제
     같은 path 를 두 번 넣지 마세요 (삭제 + 추가는 서로 다른 path 일 때만). */
  async commit(changes, message) {
    const seen = new Set();
    for (const c of changes) {
      if (!c.path) throw new Error("경로가 빈 변경이 있습니다");
      if (seen.has(c.path)) throw new Error(`같은 경로가 두 번 들어 있습니다: ${c.path}`);
      seen.add(c.path);
    }
    if (!changes.length) throw new Error("바꿀 내용이 없습니다");
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const head = await this.headSha();
      const parent = await this.req("GET", `${this.repoPath}/git/commits/${head}`);
      const tree = [];
      for (const c of changes) {
        if (c.delete) { tree.push({ path: c.path, mode: "100644", type: "blob", sha: null }); continue; }
        let sha = c.sha;
        if (!sha) {
          const content = c.bytes ? GitHubClient.bytesToB64(c.bytes) : GitHubClient.textToB64(c.text ?? "");
          sha = (await this.req("POST", `${this.repoPath}/git/blobs`, { content, encoding: "base64" })).sha;
        }
        tree.push({ path: c.path, mode: "100644", type: "blob", sha });
      }
      const newTree = await this.req("POST", `${this.repoPath}/git/trees`, { base_tree: parent.tree.sha, tree });
      const commit = await this.req("POST", `${this.repoPath}/git/commits`, { message, tree: newTree.sha, parents: [head] });
      try {
        await this.req("PATCH", `${this.repoPath}/git/refs/heads/${this.encPath(this.branch)}`, { sha: commit.sha, force: false });
        return commit;
      } catch (e) {                       // 그 사이 다른 커밋(예: 자동 manifest 갱신)이 들어오면 한 번 더 시도
        lastErr = e;
        if (!(e.status === 422 || e.status === 409)) throw e;
      }
    }
    throw lastErr;
  }

  /* ---- base64 도구 ---- */
  static textToB64(s) { return GitHubClient.bytesToB64(new TextEncoder().encode(s)); }
  static bytesToB64(u8) {
    let bin = "";
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  static b64ToBytes(b64) {
    const bin = atob(String(b64 || "").replace(/\s/g, ""));
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  static b64ToText(b64) { return new TextDecoder().decode(GitHubClient.b64ToBytes(b64)); }
}
