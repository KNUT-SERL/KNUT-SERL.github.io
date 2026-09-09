/* 관리자 화면을 "앱으로 설치" 할 수 있게 해 주는 최소 서비스 워커.
   아무것도 저장(캐시)하지 않고 요청을 그대로 네트워크로 넘깁니다 — 항상 최신 화면이 뜹니다. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => { e.respondWith(fetch(e.request)); });
