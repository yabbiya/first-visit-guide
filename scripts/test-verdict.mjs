// 오늘의 판정(verdict.js) 시험 — npm run build 때 함께 돈다. 하나라도 틀리면 build 를 멈춘다.
// 붐빔·날씨는 가짜 데이터로 넣는다 (실제 서버에 묻지 않음).
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const read = f => readFile(new URL(`../${f}`, import.meta.url), "utf8");
const V = vm.runInNewContext(`${await read("verdict.js")}\n;({ kstToday, weekdayOf, addDays, verdict })`);
const { UI } = vm.runInNewContext(`${await read("ui-text.js")}\n;({ UI })`);

let failed = 0;
const check = (name, got, want) => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "  통과" : "✗ 실패"}  ${name}${ok ? "" : ` — 기대 ${want}, 실제 ${got}`}`);
};

// 가짜 붐빔 예측: start 부터 30일. rates 로 날짜별 점수를 정한다 (없으면 50)
const crowd = (start, rates = {}) => Array.from({ length: 30 }, (_, i) => {
  const date = V.addDays(start, i);
  return { date, rate: rates[date] ?? 50 + (i % 7) }; // 날마다 조금씩 다르게
});
const dry = { hours: [{ rain: null }, { rain: null }, { rain: null }, { rain: null }] };
const wetSoon = { hours: [{ rain: null }, { rain: "비" }, { rain: null }] };
const wetLater = { hours: [{ rain: null }, { rain: null }, { rain: null }, { rain: "비" }] }; // 4시간 뒤 → 3시간 밖

const TUE = "2026-11-03", MON = "2026-11-02", WED = "2026-11-04";
const gyeongbokgung = { closedWeekdays: [2] };
const changdeokgung = { closedWeekdays: [1], reservation: "part" };
const openDaily = { closedWeekdays: [] };

console.log("오늘의 판정 시험");
// 1) 쉬는 요일 → 빨강
check("경복궁 화요일 → 빨강", V.verdict(gyeongbokgung, TUE, crowd(TUE), dry).level, "closed");
check("창덕궁 월요일 → 빨강", V.verdict(changdeokgung, MON, crowd(MON), dry).level, "closed");
const closed = V.verdict(gyeongbokgung, TUE, crowd(TUE), dry);
check("빨강일 때 덜 붐비는 날 2개", closed.better.length, 2);
check("덜 붐비는 날에 쉬는 요일(화)이 없음", closed.better.some(d => V.weekdayOf(d.date) === 2), false);
check("붐빔 자료 없이 빨강 → 다음에 여는 날 수요일", V.verdict(gyeongbokgung, TUE, null, null).nextOpen, WED);

// 4) 초록: 붐빔 하위 30% + 비 없음
const quiet = crowd(WED, { [WED]: 1 });
check("쉬는 요일 없음 + 한산 + 비 없음 → 초록", V.verdict(openDaily, WED, quiet, dry).level, "good");
check("4시간 뒤 비는 3시간 밖 → 초록", V.verdict(openDaily, WED, quiet, wetLater).level, "good");

// 5) 회색: 자료가 없으면 초록 금지
check("붐빔 자료 없음 → 회색", V.verdict(openDaily, WED, null, dry).level, "open");
check("붐빔 자료가 빈 목록 → 회색", V.verdict(openDaily, WED, [], dry).level, "open");
check("한산해도 날씨를 못 받음 → 회색", V.verdict(openDaily, WED, quiet, null).level, "open");
check("붐빔 목록에 오늘 날짜가 없음 → 회색", V.verdict(openDaily, "2026-12-25", quiet, dry).level, "open");

// 3) 노랑: 붐빔 상위 20% 또는 3시간 안 비
check("붐빔 상위 20% → 노랑", V.verdict(openDaily, WED, crowd(WED, { [WED]: 100 }), dry).level, "plan");
check("비 예보 → 노랑", V.verdict(openDaily, WED, quiet, wetSoon).level, "plan");
check("붐빔 자료 없어도 비 예보 → 노랑", V.verdict(openDaily, WED, null, wetSoon).level, "plan");

// 2) 노랑: 쉬는 날이 정해져 있지 않은 곳 (붐빔·날씨보다 먼저)
check("irregularClosure → 노랑 '쉬는 날 확인'", V.verdict({ irregularClosure: true }, WED, quiet, dry).level, "check");

// 날짜 경계: 한국 시간 자정 = UTC 15:00
check("한국 11/2 23:59:59 → 11/2", V.kstToday(Date.parse("2026-11-02T14:59:59Z")), "2026-11-02");
check("한국 11/3 00:00:00 → 11/3", V.kstToday(Date.parse("2026-11-02T15:00:00Z")), "2026-11-03");
check("자정 직후 경복궁(화) → 빨강", V.verdict(gyeongbokgung, V.kstToday(Date.parse("2026-11-02T15:00:01Z")), null, null).level, "closed");
check("자정 직전 경복궁(월) → 빨강 아님", V.verdict(gyeongbokgung, V.kstToday(Date.parse("2026-11-02T14:59:59Z")), null, null).level, "open");
// 공휴일은 추측하지 않는다: 쉬는 요일 기준으로만 판단 (공휴일 목록이 없음 — README 참고)

// 화면 글자: 판정 글자가 4개 언어에 모두 있는지
for (const lang of ["ko", "en", "zh", "ja"]) {
  const u = UI[lang];
  const missing = [
    ...["closed", "check", "plan", "good", "open"].filter(k => !u.verdict?.[k]).map(k => `verdict.${k}`),
    ...["all", "part"].filter(k => !u.vBook?.[k]).map(k => `vBook.${k}`),
    ...["vNextOpen", "vCheckWhy", "vNoCrowd", "vNoWeather", "vRain", "vPlanCta"].filter(k => !u[k])
  ];
  check(`${lang} 판정 글자 빠짐 없음`, missing.join(", ") || "없음", "없음");
}

if (failed) {
  console.error(`\n오늘의 판정 시험 ${failed}개 실패 — 위의 ✗ 줄을 확인해 주세요.`);
  process.exit(1);
}
console.log("오늘의 판정 시험 모두 통과\n");
