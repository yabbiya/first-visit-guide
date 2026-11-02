// 오늘의 판정 — "오늘 여기 가도 되나?"를 신호등 한 줄로 답한다.
// 화면(app.js)과 시험(scripts/test-verdict.mjs)이 함께 쓰고, 나중에 첫 화면 지역별 보기·날짜 고르기에서도 쓴다.
// 그래서 화면·현재 시각에 기대지 않는 순수 함수로 둔다(날짜는 인자로 받는다).

// 한국 시간 기준 오늘 날짜 "YYYY-MM-DD" (now 를 넘기면 그 시각 기준 — 시험용)
function kstToday(now = Date.now()) {
  return new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
function weekdayOf(iso) {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---------- 붐빔 예측 해석 ----------
// 점수는 "그 장소가 가장 붐빌 때 = 100"인 상대 점수라 숫자만으로는 감이 안 온다.
// 그래서 그 장소의 앞으로 30일과 비교해 오늘이 어느 쪽인지 보고, 일주일 안의 덜 붐비는 날을 고른다.
// 쉬는 요일은 사람이 없어서 예측 점수가 낮게 나온다.
// 그대로 두면 "문 닫는 날에 가세요"라고 추천하게 되므로, 쉬는 요일은 비교와 추천에서 뺀다.
function judgeCrowd(days, todayIso, closedWeekdays = []) {
  const isOpen = d => !closedWeekdays.includes(weekdayOf(d.date));
  const upcoming = days.filter(d => d.date >= todayIso);
  const today = upcoming[0];
  if (!today || today.date !== todayIso) return null;
  const openDays = upcoming.filter(isOpen);
  const nextOpen = openDays.filter(d => d.date > todayIso).slice(0, 7);
  if (!isOpen(today)) {
    const best = [...nextOpen].sort((a, b) => a.rate - b.rate).slice(0, 2).sort((a, b) => a.date.localeCompare(b.date));
    return { level: "closed", better: best, n: openDays.length };
  }
  const n = openDays.length;
  const rank = [...openDays].sort((a, b) => b.rate - a.rate).indexOf(today) + 1; // 1 = 가장 붐빔
  const level = rank <= Math.ceil(n * 0.2) ? "busy" : rank > n - Math.ceil(n * 0.3) ? "calm" : "normal";
  const better = nextOpen.filter(d => d.rate < today.rate)
    .sort((a, b) => a.rate - b.rate).slice(0, 2)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { level, rank, n, better };
}

// ---------- 판정 ----------
// place: closedWeekdays, irregularClosure 를 본다 (카드 글자 notice 는 읽지 않는다)
// date: "YYYY-MM-DD" (한국 날짜)
// crowdDays: 관광공사 붐빔 예측 [{ date, rate }] — 없거나 못 받았으면 null
// weather: { hours: [{ rain }] } — 그날이 오늘일 때만, 못 받았으면 null
// 돌려주는 값: { level, crowd, rain, better, nextOpen }
//   level: closed(빨강) / check(노랑, 쉬는 날 확인) / plan(노랑, 붐빔·비) / good(초록) / open(회색, 판단할 자료 부족)
// 공휴일은 모른다: 쉬는 요일과 공휴일이 겹칠 때 여는지 등은 추측하지 않고 쉬는 요일 기준으로만 판단한다.
function verdict(place, date, crowdDays, weather) {
  const closedWeekdays = place.closedWeekdays ?? [];
  const crowd = crowdDays?.length ? judgeCrowd(crowdDays, date, closedWeekdays) : null;

  // 1) 빨강: 정해진 쉬는 요일. 붐빔 자료가 있으면 덜 붐비는 날 2개, 없으면 다음에 여는 날
  if (closedWeekdays.includes(weekdayOf(date))) {
    let nextOpen = null;
    for (let i = 1; i <= 7 && !nextOpen; i++) if (!closedWeekdays.includes(weekdayOf(addDays(date, i)))) nextOpen = addDays(date, i);
    return { level: "closed", better: crowd?.better ?? [], nextOpen };
  }
  // 2) 노랑: 쉬는 날이 정해져 있지 않은 곳 — 붐빔·날씨보다 먼저 확인할 일
  if (place.irregularClosure) return { level: "check" };

  // 3) 노랑: 붐빔 상위 20% 또는 3시간 안 비·눈 (예보가 1시간 단위라 앞 3칸)
  const rain = weather?.hours ? weather.hours.slice(0, 3).some(h => h.rain) : null; // null = 날씨를 모름
  if (crowd?.level === "busy" || rain === true) return { level: "plan", crowd, rain: rain === true };

  // 4) 초록: 붐빔 자료가 있고 한산/보통이며, 날씨를 받았고 비가 없을 때만
  if (crowd && rain === false) return { level: "good", crowd };

  // 5) 회색: 붐빔 자료가 없거나 날씨를 못 받은 곳 — 자료 없이 "가기 좋은 날"이라고 하지 않는다
  return { level: "open", crowd, rain };
}
