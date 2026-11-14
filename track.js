// 클릭 세기 (2026-11-14): track("cube_click", { item: "arex" }) 처럼 부르면 /api/event 로 한 줄을 보낸다.
// 무엇을 세는가: 상단 큐브 면(cube_click), 결제 버튼(checkout_click), Klook 링크(klook_click) — 이 세 가지뿐.
// 쿠키·기기 번호·IP 같은 "누가 눌렀는지"는 보내지 않는다. 서버는 날짜별 "몇 번 눌렸는지" 숫자만 더한다.
// GA4 도 검토했지만 쿠키를 써서 개인정보 안내("추적 쿠키 없음")를 바꿔야 하고, Vercel Analytics 의 맞춤 이벤트는 유료라서
// 이미 쓰고 있는 무료 저장소(Upstash Redis)에 직접 세는 쪽을 골랐다. 결과 보기: /api/stats (비밀번호 = 환경변수 STATS_KEY)
(function () {
  var EVENTS = { cube_click: 1, checkout_click: 1, klook_click: 1 };
  window.track = function (ev, params) {
    if (!EVENTS[ev]) return;
    var p = params || {};
    // 언어: 첫 주소(/)에는 FVG_PAGE 가 없어서 "언어 모름"으로 세졌다 → 화면이 실제로 고른 언어(<html lang>)를 읽는다
    var lang = (document.documentElement.lang || "").slice(0, 2);
    var body = JSON.stringify({ ev: ev, item: p.item || "", from: p.from || "", place: p.place || "", lang: lang });
    try {
      // 새 창으로 열리는 링크·창 닫기 직전에도 끊기지 않게 sendBeacon 을 먼저 쓴다
      if (navigator.sendBeacon && navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }))) return;
      fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body: body, keepalive: true }).catch(function () {});
    } catch (e) { /* 기록이 실패해도 화면 동작에는 영향이 없게 */ }
  };
})();
