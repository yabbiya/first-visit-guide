// 메모 순서 규칙 — 화면(app.js)과 검색용 장소 페이지(scripts/build-pages.mjs)가 함께 쓴다.
// 규칙이 두 곳에 있으면 언젠가 달라져서 검색 결과와 실제 화면의 "꼭 기억할 3가지"가 어긋나므로 한 곳에 둔다.
// s = { kid, mustgo, foreign } (foreign: 외국어 화면인지)

const TOP_COUNT = 3; // "꼭 기억할 3가지"로 보여줄 메모 수 (아래 목록에는 다시 나오지 않음)

// 대상이 "한국에 처음 오는, 대중교통으로 다니는 외국인"이라 길치·대중교통은 고르지 않고 항상 켠 것으로 본다.
function memoScore(m, s) {
  let score = m.importance;
  if (m.conditions.includes("lost")) score += 10;     // 처음 오는 사람 = 길치 기준
  if (s.kid && m.conditions.includes("kid")) score += 8;
  // 꼭 가야 하는 날: 대안 메모가 늘 먼저 오게 한다. 길치(+10)·대중교통(+6)은 모든 메모에 기본으로 붙어서,
  // +15로는 "케이블카 대기 1~2시간" 같은 핵심 메모가 길 안내 메모에 밀렸다 (남산서울타워에서 발견)
  if (s.mustgo && m.conditions.includes("mustgo")) score += 20;
  if (m.conditions.includes("transit")) score += 6;  // 대중교통 기준
  if (s.foreign && m.conditions.includes("foreign")) score += 10; // 외국어로 볼 때는 외국인에게 필요한 메모를 앞으로
  return score;
}
function memoVisible(m, s) {
  if (m.audience === "foreign" && !s.foreign) return false; // 외국인 전용 메모는 한국어 화면에서 숨김
  return !m.onlyMode || m.onlyMode === "transit";          // 자차 전용 메모(주차 등)는 보이지 않는다
}
// "pin": true 인 메모(출입에 꼭 필요한 것 등)는 스위치와 상관없이 항상 맨 앞에 둔다
function rankMemos(memos, s) {
  const ranked = memos.filter(m => memoVisible(m, s)).sort((a, b) => memoScore(b, s) - memoScore(a, s));
  const list = [...ranked.filter(m => m.pin), ...ranked.filter(m => !m.pin)];
  const topCount = Math.max(TOP_COUNT, ranked.filter(m => m.pin).length);
  return { top: list.slice(0, topCount), more: list.slice(topCount) };
}
