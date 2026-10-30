// places/ 아래 장소 폴더를 모두 훑어서
//  1) 각 place.json 형식을 검사하고
//  2) 첫 화면용 가벼운 목록 places/index.json을 만든다.
// 실행: npm run build
import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLACES = join(ROOT, "places");
const CATEGORIES = JSON.parse(await readFile(join(PLACES, "categories.json"), "utf8"));
const CATEGORY_IDS = new Set(CATEGORIES.map(c => c.id));

const CONDITIONS = ["lost", "kid", "car", "transit", "foreign"];
const LANGS = ["en", "zh", "ja"]; // 번역 언어 (한국어는 place.json 원문)

// 장소 품질 기준(docs/place-quality.md)의 조사 체크리스트 9가지
const CHECKLIST = {
  entry: "출입 조건", transit: "대중교통", car: "자차", confusing: "헷갈리는 것",
  arrival: "도착한 뒤", kid: "아이 동반", bring: "챙길 것", crowd: "붐비는 때",
  foreign: "외국인 장벽"
};
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
    if (value === undefined) { err(`체크리스트 '${label}'(${key}) 결과가 없어요. 메모 id, "해당 없음", "확인 못함" 중 하나를 적어 주세요.`); continue; }
    for (const v of [].concat(value)) {
      if (!CHECK_WORDS.includes(v) && !memoIds.has(v)) err(`체크리스트 '${label}'에 적힌 "${v}"라는 메모가 없어요.`);
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
// 이름·지역은 첫 화면 카드에 쓰이므로 필수, 메모 번역은 있는 만큼만 (없는 메모는 한국어로 보임)
function checkI18n(folder, place, tr) {
  const err = msg => errors.push(`[${folder}] i18n.json ${msg}`);
  const memoIds = new Set((place.memos ?? []).map(m => m.id));
  for (const key of Object.keys(tr)) if (!LANGS.includes(key)) err(`모르는 언어 "${key}"가 있어요. (${LANGS.join("/")})`);
  for (const lang of LANGS) {
    const t = tr[lang];
    if (!t) { err(`${lang} 번역이 없어요.`); continue; }
    for (const key of ["name", "region"]) if (!isText(t[key])) err(`${lang}.${key}가 비어 있어요.`);
    if (place.notice && !isText(t.notice)) err(`${lang}.notice(카드 안내 한 줄) 번역이 없어요.`);
    for (const [id, m] of Object.entries(t.memos ?? {})) {
      if (!memoIds.has(id)) err(`${lang}.memos에 place.json에 없는 메모 "${id}"가 있어요.`);
      if (!isText(m.title) || !isText(m.body)) err(`${lang}.memos.${id}의 title·body가 비어 있어요.`);
    }
    // 외국인 전용 메모는 번역이 없으면 외국인에게 한국어로만 보이므로 반드시 번역
    if (t.memos) for (const m of place.memos ?? []) {
      if (m.audience === "foreign" && !t.memos[m.id]) err(`외국인 전용 메모 "${m.id}"의 ${lang} 번역이 없어요.`);
    }
  }
}

const folders = (await readdir(PLACES, { withFileTypes: true }))
  .filter(d => d.isDirectory())
  .map(d => d.name);

const list = [];
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
  if (await exists(trFile)) {
    try {
      tr = JSON.parse((await readFile(trFile, "utf8")).replace(/^\uFEFF/, ""));
      checkI18n(folder, place, tr);
    } catch (e) {
      errors.push(`[${folder}] i18n.json을 읽을 수 없어요(쉼표·따옴표 확인): ${e.message}`);
    }
  }
  // 첫 화면 카드에 필요한 것만 담는다 (메모는 장소를 고를 때 불러옴)
  list.push({
    id: place.id, name: place.name, region: place.region, address: place.address,
    categories: place.categories, notice: place.notice, closedWeekdays: place.closedWeekdays,
    cover: place.cover ? { file: place.cover.file, position: place.cover.position } : undefined,
    // 첫 화면 카드용 번역 (이름·지역·안내 한 줄만)
    i18n: tr ? Object.fromEntries(LANGS.filter(l => tr[l]).map(l => [l, { name: tr[l].name, region: tr[l].region, notice: tr[l].notice }])) : undefined
  });
}

if (errors.length) {
  console.error(`\n장소 파일에서 문제 ${errors.length}개를 찾았어요:\n`);
  errors.forEach(e => console.error("  - " + e));
  console.error("\n고친 뒤 다시 npm run build를 실행해주세요. (index.json은 바꾸지 않았어요)\n");
  process.exit(1);
}

list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
await writeFile(join(PLACES, "index.json"), JSON.stringify(list, null, 2) + "\n");
console.log(`장소 ${list.length}곳 검사 통과 → places/index.json 만들었어요.`);
