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

// 장소 핵심 정보 칸 (주소·시간·요금·휴무) — 화면(app.js)과 검색용 장소 페이지(build-pages)가 같은 내용을 쓰게 여기 둔다.
// 사실만: 요금이 비어 있는 장소는 칸을 만들지 않는다. 휴무는 closedWeekdays(매주 쉬는 요일)·irregularClosure(정해지지 않음)만 보고,
// 둘 다 없으면 "매주 쉬는 요일 없음"이라고만 쓴다 (매월 마지막 ○요일 같은 휴관은 시간 칸 글자에 있다).
// tr = 이 장소의 번역(없으면 null), T = 고른 언어의 화면 글자(ui-text.js)
// 정보 칸 아이콘 (선 그림, 24×24). 일본어·중국어 화면에서만 보이고 영어·한국어는 글자 이름표만 쓴다
const FACT_ICON = {
  addr: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
  hours: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  fee: '<path d="M4 8.5V6h16v2.5a2.5 2.5 0 0 0 0 5V18H4v-4.5a2.5 2.5 0 0 0 0-5z"/><path d="M14 6v12" stroke-dasharray="1.5 2"/>',
  closed: '<rect x="4" y="5.5" width="16" height="14" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M9.5 13.5l5 4M14.5 13.5l-5 4"/>'
};
const factHTML = (f, esc) => `<div class="fact fact-${f.key}"><dt><svg class="fact-ico" viewBox="0 0 24 24" aria-hidden="true">${FACT_ICON[f.key] ?? ""}</svg>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`;
function placeFacts(place, tr, T) {
  const closed = place.closedWeekdays?.length
    ? place.closedWeekdays.map(d => T.closedDay(T.weekdays[d])).join(" · ")
    : place.irregularClosure ? T.factClosedVaries : T.factClosedNone;
  return [
    { key: "addr", label: T.factAddr, value: tr?.address ?? place.address },
    { key: "hours", label: T.factHours, value: tr?.hours ?? place.hours },
    { key: "fee", label: T.factFee, value: tr?.fee ?? place.fee },
    { key: "closed", label: T.factClosed, value: closed }
  ].filter(f => f.value);
}
