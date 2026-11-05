// places/ 아래 장소 폴더를 모두 훑어서
//  1) 각 place.json 형식을 검사하고
//  2) 첫 화면용 가벼운 목록 places/index.json을 만든다.
//  3) 걸어서 갈 만한 장소 후보(직선 2km 이내 쌍) docs/walk-candidates.md를 만든다 (화면에는 안 나옴, 사람이 확인할 목록)
// 실행: npm run build
import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLACES = join(ROOT, "places");
const CATEGORIES = JSON.parse(await readFile(join(PLACES, "categories.json"), "utf8"));
const CATEGORY_IDS = new Set(CATEGORIES.map(c => c.id));
// 첫 화면 지역별 보기: 외국인이 아는 이름으로 사람이 정한 묶음 (거리를 뜻하지 않는다)
const AREAS = JSON.parse(await readFile(join(PLACES, "areas.json"), "utf8"));
const AREA_IDS = new Set(AREAS.map(a => a.id));

const areaErrors = [];
AREAS.forEach((a, i) => {
  const where = `places/areas.json ${i + 1}번째(${a.id ?? "id 없음"})`;
  if (typeof a.id !== "string" || !/^[a-z0-9-]+$/.test(a.id)) areaErrors.push(`${where}: id는 영어 소문자·숫자·-만 써요.`);
  if (!["seoul", "daytrip"].includes(a.group)) areaErrors.push(`${where}: group은 "seoul" 또는 "daytrip"이어야 해요.`);
  if (!Number.isInteger(a.order)) areaErrors.push(`${where}: order(순서)는 정수여야 해요.`);
  ["ko", "en", "zh", "ja"].filter(l => typeof a.name?.[l] !== "string" || !a.name[l].trim())
    .forEach(l => areaErrors.push(`${where}: name.${l}(이름) 번역이 없어요.`));
});
if (AREA_IDS.size !== AREAS.length) areaErrors.push("places/areas.json에 같은 id가 두 번 있어요.");

const CONDITIONS = ["lost", "kid", "car", "transit", "foreign", "mustgo"]; // mustgo: "오늘은 꼭 가야 해요" 모드
const LANGS = ["en", "zh", "ja"]; // 번역 언어 (한국어는 place.json 원문)

// 장소 품질 기준(docs/place-quality.md)의 조사 체크리스트 11가지
const CHECKLIST = {
  entry: "출입 조건", transit: "대중교통", car: "자차", confusing: "헷갈리는 것",
  arrival: "도착한 뒤", kid: "아이 동반", bring: "챙길 것", crowd: "붐비는 때",
  foreign: "외국인 장벽", mustgo: "붐빌 때 대안", walk: "걸어서 갈 수 있는 이웃"
};
// 11번(walk)은 메모 id가 아니라 walkTo에 적은 장소 id를 가리킨다
const WALK_KINDS = ["skipSubway", "hard"]; // 지하철 말고 걸어가세요 / 가까워 보여도 힘들어요
const WALK_CANDIDATE_KM = 2;
const CHECK_WORDS = ["해당 없음", "확인 못함", "기본 정보에 표시"];
const MODES = ["car", "transit"];

const errors = [];
const isText = v => typeof v === "string" && v.trim() !== "";

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function checkPlace(folder, place) {
  const where = `[${folder}]`;
  const err = msg => errors.push(`${where} ${msg}`);

  if (place.id !== folder) err(`id("${place.id}")가 폴더 이름("${folder}")과 달라요.`);
  // 첫 화면 지역: 장소마다 하나, places/areas.json 에 있는 것만
  if (!isText(place.area)) err("area(첫 화면 지역별 보기의 지역)가 없어요. places/areas.json 의 id 하나를 적어 주세요. 예: \"central-seoul\"");
  else if (!AREA_IDS.has(place.area)) err(`지역 "${place.area}"는 places/areas.json에 없어요.`);
  // 첫 화면 카테고리: places/categories.json 에 있는 것만, 최소 1개
  if (!Array.isArray(place.categories) || place.categories.length === 0) err("categories(카테고리)가 하나도 없어요.");
  else place.categories.filter(c => !CATEGORY_IDS.has(c))
    .forEach(c => err(`카테고리 "${c}"는 places/categories.json에 없어요.`));
  // 카드에 보이는 안내 한 줄: 짧게
  if (place.notice !== undefined && (!isText(place.notice) || place.notice.length > 14)) {
    err("notice(카드 안내 한 줄)는 14자 이내로 써 주세요.");
  }
  for (const key of ["name", "region", "address", "hours"]) {
    if (!isText(place[key])) err(`${key}가 비어 있어요.`);
  }
  // 날씨용 좌표 (없으면 날씨 칸만 비어 보임)
  if (place.lat === undefined || place.lon === undefined) err("lat/lon(위도·경도)이 없어서 날씨를 보여줄 수 없어요.");
  else if (!(place.lat >= 32 && place.lat <= 39.5 && place.lon >= 124 && place.lon <= 132)) err("lat/lon이 한국 범위를 벗어났어요. 위도·경도 순서를 확인하세요.");
  // 대표 사진: 저작권 원칙에 따라 촬영자·라이선스·원본 링크가 모두 있어야 한다
  if (place.cover !== undefined) {
    const c = place.cover;
    for (const key of ["file", "credit", "license", "link"]) if (!isText(c[key])) err(`cover(대표 사진)의 ${key}가 비어 있어요.`);
    if (isText(c.file) && !(await exists(join(PLACES, folder, c.file)))) err(`대표 사진 파일 ${c.file}을 찾을 수 없어요.`);
  }
  // 쉬는 요일 (0=일 … 6=토): 붐빔 예측이 쉬는 날을 "덜 붐비는 날"로 추천하지 않게 한다
  if (place.closedWeekdays !== undefined &&
      !(Array.isArray(place.closedWeekdays) && place.closedWeekdays.every(d => Number.isInteger(d) && d >= 0 && d <= 6))) {
    err("closedWeekdays(쉬는 요일)는 0(일)~6(토) 숫자 목록이어야 해요. 예: [2]는 화요일.");
  }
  // 붐빔 예측: 한국관광공사 목록의 시도코드(2자리)·시군구코드(5자리)·관광지 이름
  // 오늘의 판정에 쓰는 구조화된 값 (카드 글자 notice 를 읽어서 판단하지 않으려고 따로 둔다)
  if (place.reservation !== undefined && !["all", "part"].includes(place.reservation)) {
    err('reservation(예약 필요)은 "all"(장소 전체) 또는 "part"(일부만, 예: 창덕궁 후원) 중 하나여야 해요.');
  }
  if (place.irregularClosure !== undefined && place.irregularClosure !== true) {
    err("irregularClosure(쉬는 날이 정해져 있지 않음)는 true 로만 써요. 해당이 없으면 지워 주세요.");
  }
  if (place.irregularClosure && place.closedWeekdays?.length) {
    err("irregularClosure 와 closedWeekdays(쉬는 요일)를 함께 쓸 수 없어요. 쉬는 요일이 정해져 있으면 irregularClosure 를 지워 주세요.");
  }
  if (place.crowd !== undefined) {
    const c = place.crowd;
    if (!/^\d{2}$/.test(c.area ?? "")) err("crowd.area(시도 코드)는 숫자 2자리여야 해요.");
    if (!/^\d{5}$/.test(c.signgu ?? "")) err("crowd.signgu(시군구 코드)는 숫자 5자리여야 해요.");
    if (!isText(c.name)) err("crowd.name(관광공사 목록의 관광지 이름)이 비어 있어요.");
  }
  // 요약 칸은 메모 중 중요한 3개로 자동으로 만들므로 장소 파일에 따로 쓰지 않는다
  if (place.summary !== undefined) err("summary(요약 문장)는 더 이상 쓰지 않아요. 지워 주세요.");

  if (!Array.isArray(place.memos) || place.memos.length === 0) { err("memos(메모)가 하나도 없어요."); return; }

  // 체크리스트: 8가지 모두 결과가 있어야 하고, 메모 id를 적었다면 그 메모가 실제로 있어야 한다
  const memoIds = new Set(place.memos.map(m => m.id));
  const checked = place.checked ?? {};
  if (!place.checked) err("checked(조사 체크리스트 결과)가 없어요. docs/place-quality.md를 보고 채워 주세요.");
  else for (const [key, label] of Object.entries(CHECKLIST)) {
    const value = checked[key];
    if (value === undefined) { err(`체크리스트 '${label}'(${key}) 결과가 없어요. ${key === "walk" ? "walkTo에 적은 장소 id" : "메모 id"}, "해당 없음", "확인 못함" 중 하나를 적어 주세요.`); continue; }
    for (const v of [].concat(value)) {
      if (key === "walk") {
        if (!CHECK_WORDS.includes(v) && !(place.walkTo ?? []).some(w => w.to === v)) err(`체크리스트 '${label}'에 적힌 "${v}"가 walkTo에 없어요.`);
      } else if (!CHECK_WORDS.includes(v) && !memoIds.has(v)) err(`체크리스트 '${label}'에 적힌 "${v}"라는 메모가 없어요.`);
    }
  }
  for (const key of Object.keys(checked)) if (!(key in CHECKLIST)) err(`체크리스트에 모르는 항목 "${key}"가 있어요.`);
  // 고정 메모가 많으면 "꼭 기억할 3가지"가 길어져 의미가 흐려진다
  if (place.memos.filter(m => m.pin).length > 2) err("pin(항상 맨 위) 메모는 2개까지만 쓸 수 있어요.");
  const seen = new Set();
  for (const [i, m] of place.memos.entries()) {
    const at = `메모 ${i + 1}번(${m.id ?? "id 없음"})`;
    if (!isText(m.id)) err(`${at}: id가 없어요.`);
    else if (seen.has(m.id)) err(`${at}: id가 다른 메모와 겹쳐요.`);
    seen.add(m.id);
    for (const key of ["title", "body", "category"]) {
      if (!isText(m[key])) err(`${at}: ${key}가 비어 있어요.`);
    }
    if (!Array.isArray(m.conditions)) err(`${at}: conditions는 목록([...])이어야 해요.`);
    else m.conditions.filter(c => !CONDITIONS.includes(c))
      .forEach(c => err(`${at}: 조건 "${c}"는 ${CONDITIONS.join("/")} 중 하나여야 해요.`));
    if (m.onlyMode !== undefined && !MODES.includes(m.onlyMode)) err(`${at}: onlyMode는 car 또는 transit이어야 해요.`);
    // 외국인에게만 필요한 메모(한국어 화면에서는 숨김)
    if (m.audience !== undefined && m.audience !== "foreign") err(`${at}: audience는 "foreign"만 쓸 수 있어요.`);
    if (typeof m.importance !== "number") err(`${at}: importance(기본 중요도)는 숫자여야 해요.`);
    if (m.pin !== undefined && typeof m.pin !== "boolean") err(`${at}: pin은 true 또는 false여야 해요.`);
    if (m.trust !== undefined && !Array.isArray(m.trust)) err(`${at}: trust는 목록([...])이어야 해요.`);
    for (const [j, ph] of (m.photos ?? []).entries()) {
      const pat = `${at} 사진 ${j + 1}번`;
      if (!isText(ph.file)) { err(`${pat}: file이 없어요.`); continue; }
      if (!isText(ph.caption)) err(`${pat}: caption(설명)이 없어요.`);
      // 저작권 원칙: 출처(누가 찍었는지)를 반드시 남긴다
      if (!isText(ph.credit)) err(`${pat}: credit(촬영자·사용 허락 출처)이 없어요.`);
      if (!(await exists(join(PLACES, folder, ph.file)))) err(`${pat}: 파일 ${ph.file}을 찾을 수 없어요.`);
    }
  }
}

// 번역 파일 places/<장소>/i18n.json: { "en": { name, region, notice?, address?, hours?, fee?, memos?: { 메모id: { title, body } } }, "zh": …, "ja": … }
// 이름·지역·주소·운영시간(·요금)과 모든 메모 번역이 필수다.
// (처음엔 메모 번역을 "있는 만큼만"으로 두었다가, 영어 화면에 한국어 메모가 섞여 나오는 문제를 사용자가 발견해 필수로 바꿨다)
function checkI18n(folder, place, tr) {
  const err = msg => errors.push(`[${folder}] i18n.json ${msg}`);
  const memoIds = new Set((place.memos ?? []).map(m => m.id));
  for (const key of Object.keys(tr)) if (!LANGS.includes(key)) err(`모르는 언어 "${key}"가 있어요. (${LANGS.join("/")})`);
  for (const lang of LANGS) {
    const t = tr[lang];
    if (!t) { err(`${lang} 번역이 없어요.`); continue; }
    for (const key of ["name", "region", "address", "hours"]) if (!isText(t[key])) err(`${lang}.${key}가 비어 있어요.`);
    if (isText(place.fee) && !isText(t.fee)) err(`${lang}.fee(요금) 번역이 없어요.`);
    if (place.notice && !isText(t.notice)) err(`${lang}.notice(카드 안내 한 줄) 번역이 없어요.`);
    for (const [id, m] of Object.entries(t.memos ?? {})) {
      if (!memoIds.has(id)) err(`${lang}.memos에 place.json에 없는 메모 "${id}"가 있어요.`);
      if (!isText(m.title) || !isText(m.body)) err(`${lang}.memos.${id}의 title·body가 비어 있어요.`);
    }
    // 번역이 빠진 메모는 외국어 화면에 한국어로 섞여 나오므로 하나도 빠지면 안 된다
    for (const m of place.memos ?? []) {
      if (!t.memos?.[m.id]) err(`메모 "${m.id}"의 ${lang} 번역이 없어요.`);
    }
    // 걸어서 갈 이웃의 메모(note)도 같은 이유로 필수: { "walkTo": { "대상 장소 id": "번역한 메모" } }
    for (const w of place.walkTo ?? []) {
      if (!isText(t.walkTo?.[w.to])) err(`walkTo "${w.to}"의 ${lang} 메모(note) 번역이 없어요.`);
    }
    for (const id of Object.keys(t.walkTo ?? {})) {
      if (!(place.walkTo ?? []).some(w => w.to === id)) err(`${lang}.walkTo에 place.json에 없는 "${id}"가 있어요.`);
    }
  }
}

const folders = (await readdir(PLACES, { withFileTypes: true }))
  .filter(d => d.isDirectory())
  .map(d => d.name);

const list = [];
const all = []; // 걸어서 갈 이웃 검사·후보 계산용 (모든 장소를 다 읽은 뒤에 한다)
for (const folder of folders) {
  const file = join(PLACES, folder, "place.json");
  if (!(await exists(file))) { errors.push(`[${folder}] place.json 파일이 없어요.`); continue; }
  let place;
  try {
    // 윈도우 메모장이 파일 맨 앞에 붙이는 숨은 글자(BOM)는 떼고 읽는다
    place = JSON.parse((await readFile(file, "utf8")).replace(/^﻿/, ""));
  } catch (e) {
    errors.push(`[${folder}] place.json을 읽을 수 없어요(쉼표·따옴표 확인): ${e.message}`);
    continue;
  }
  await checkPlace(folder, place);
  let tr;
  const trFile = join(PLACES, folder, "i18n.json");
  if (!(await exists(trFile))) errors.push(`[${folder}] i18n.json(영어·중국어·일본어 번역)이 없어요. docs/place-quality.md 6번을 보고 만들어 주세요.`);
  else {
    try {
      tr = JSON.parse((await readFile(trFile, "utf8")).replace(/^\uFEFF/, ""));
      checkI18n(folder, place, tr);
    } catch (e) {
      errors.push(`[${folder}] i18n.json을 읽을 수 없어요(쉼표·따옴표 확인): ${e.message}`);
    }
  }
  all.push({ folder, place });
  // 첫 화면 카드에 필요한 것만 담는다 (메모는 장소를 고를 때 불러옴)
  list.push({
    id: place.id, name: place.name, region: place.region, address: place.address,
    categories: place.categories, area: place.area, notice: place.notice, closedWeekdays: place.closedWeekdays, irregularClosure: place.irregularClosure,
    cover: place.cover ? { file: place.cover.file, position: place.cover.position } : undefined,
    // 첫 화면 카드용 번역 (이름·지역·안내 한 줄만)
    i18n: tr ? Object.fromEntries(LANGS.filter(l => tr[l]).map(l => [l, { name: tr[l].name, region: tr[l].region, notice: tr[l].notice }])) : undefined
  });
}

// 걸어서 갈 이웃(walkTo): 지도 앱 보행 경로로 사람이 확인한 것만 적는다. 숫자를 추측해서 넣지 않는다.
// { "to": 장소 id, "minutes": 걷는 분, "kind": "skipSubway" | "hard", "note": 오르막·계단 등 한 줄, "trust": [], "source": 출처, "checkedOn": "YYYY-MM-DD" }
const placeIds = new Set(all.map(a => a.place.id));
for (const { folder, place } of all) {
  const err = msg => errors.push(`[${folder}] ${msg}`);
  if (place.walkTo === undefined) continue;
  if (!Array.isArray(place.walkTo)) { err("walkTo(걸어서 갈 이웃)는 목록([...])이어야 해요."); continue; }
  const seenTo = new Set();
  for (const [i, w] of place.walkTo.entries()) {
    const at = `walkTo ${i + 1}번(${w.to ?? "대상 없음"})`;
    if (!placeIds.has(w.to)) err(`${at}: to에 적은 장소가 places/에 없어요.`);
    else if (w.to === place.id) err(`${at}: 자기 자신을 가리키고 있어요.`);
    if (seenTo.has(w.to)) err(`${at}: 같은 장소가 두 번 있어요.`);
    seenTo.add(w.to);
    if (!(Number.isInteger(w.minutes) && w.minutes > 0 && w.minutes <= 60)) err(`${at}: minutes(걷는 분)는 1~60 사이 정수여야 해요. 확인 못 했으면 이 항목을 넣지 마세요.`);
    if (!WALK_KINDS.includes(w.kind)) err(`${at}: kind는 ${WALK_KINDS.join(" 또는 ")}이어야 해요.`);
    if (!isText(w.note)) err(`${at}: note(오르막·계단·큰길 건너기 등 한 줄)가 비어 있어요.`);
    if (!Array.isArray(w.trust)) err(`${at}: trust는 목록([...])이어야 해요.`);
    if (!isText(w.source)) err(`${at}: source(어디서 확인했는지)가 비어 있어요.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w.checkedOn ?? "")) err(`${at}: checkedOn(확인한 날짜)은 2026-11-02 같은 형식이어야 해요.`);
  }
}

// 후보 목록: 좌표 직선거리로 가까운 쌍을 뽑아 사람이 지도 앱에서 확인하도록 한다 (화면에는 쓰지 않는다)
const km = (a, b) => {
  const r = d => d * Math.PI / 180, R = 6371;
  const x = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const walkOf = (a, b) => (a.walkTo ?? []).find(w => w.to === b.id);
const pairs = [];
for (const [i, { place: a }] of all.entries()) for (const { place: b } of all.slice(i + 1)) {
  if (typeof a.lat !== "number" || typeof b.lat !== "number") continue;
  const d = km(a, b);
  if (d <= WALK_CANDIDATE_KM) pairs.push({ a, b, d });
}
pairs.sort((x, y) => x.d - y.d);
const status = (a, b) => {
  const w = walkOf(a, b) ?? walkOf(b, a);
  return w ? `확인됨: ${w.minutes}분, ${w.kind === "hard" ? "가까워 보여도 힘듦" : "걸어가세요"}` : "확인 못함";
};
const md = [
  "# 걸어서 갈 수 있는 이웃 — 후보 목록 (자동 생성, 손으로 고치지 않음)",
  "",
  `\`npm run build\`가 장소 좌표로 직선거리 ${WALK_CANDIDATE_KM}km 이내인 쌍을 뽑은 목록이다. **화면에는 나오지 않는다.**`,
  "지도 앱의 보행 경로로 걷는 시간·오르막·계단을 확인한 뒤 place.json의 `walkTo`에 적어야 화면에 나온다.",
  "직선거리는 실제 걷는 거리보다 짧다(길이 꺾이고, 큰길·언덕이 있다). 직선거리만 보고 분을 계산해 넣지 않는다.",
  "",
  "| 직선거리 | 장소 A | 장소 B | 상태 |",
  "|---|---|---|---|",
  ...pairs.map(({ a, b, d }) => `| ${d.toFixed(2)}km | ${a.name} (\`${a.id}\`) | ${b.name} (\`${b.id}\`) | ${status(a, b)} |`),
  ""
].join("\n");

// $5 이용권 설정(premium.json): 잠글 수 있는 기능만, 출입·안전 정보는 목록에 없다(항상 무료).
// 결제 링크를 넣으려면 약관·환불·개인정보 페이지의 빈칸([CONTACT EMAIL] 등)을 먼저 채워야 한다.
const PREMIUM_FEATURES = { mustgo: "오늘은 꼭 가야 해요 모드", "quiet-days": "붐빔 칸의 덜 붐비는 날 추천" };
try {
  const premium = JSON.parse((await readFile(join(ROOT, "premium.json"), "utf8")).replace(/^﻿/, ""));
  if (!Array.isArray(premium.features)) errors.push("[premium.json] features는 목록([])이어야 해요.");
  else premium.features.filter(f => !(f in PREMIUM_FEATURES)).forEach(f =>
    errors.push(`[premium.json] "${f}"는 잠글 수 있는 기능이 아니에요. ${Object.keys(PREMIUM_FEATURES).join(" / ")} 중에서 골라 주세요.`));
  if (premium.checkoutUrl) {
    if (!/^https:\/\//.test(premium.checkoutUrl)) errors.push("[premium.json] checkoutUrl은 https:// 로 시작하는 결제 링크여야 해요.");
    for (const page of ["terms.html", "refund.html", "privacy.html"]) {
      const html = await readFile(join(ROOT, page), "utf8");
      const blanks = [...new Set(html.match(/\[[A-Z ]+\]/g) ?? [])];
      if (blanks.length) errors.push(`[premium.json] 결제 링크를 열기 전에 ${page}의 빈칸 ${blanks.join(", ")}을 채워 주세요.`);
    }
  }
} catch (e) {
  errors.push(`[premium.json] 파일을 읽을 수 없어요: ${e.message}`);
}

if (errors.length) {
  console.error(`\n장소·설정 파일에서 문제 ${errors.length}개를 찾았어요:\n`);
  errors.forEach(e => console.error("  - " + e));
  console.error("\n고친 뒤 다시 npm run build를 실행해주세요. (index.json은 바꾸지 않았어요)\n");
  process.exit(1);
}

list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
await writeFile(join(PLACES, "index.json"), JSON.stringify(list, null, 2) + "\n");
console.log(`장소 ${list.length}곳 검사 통과 → places/index.json 만들었어요.`);
await writeFile(join(ROOT, "docs", "walk-candidates.md"), md);
console.log(`걸어서 갈 이웃 후보 ${pairs.length}쌍(직선 ${WALK_CANDIDATE_KM}km 이내) → docs/walk-candidates.md`);
