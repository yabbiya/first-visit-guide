// 사이트의 모든 내용을 Markdown 한 파일로 모은다 → docs/site-content.md
// 장소 데이터(places/*/place.json, 한국어 원본)를 그대로 옮긴다. 장소를 고친 뒤 다시 돌리면 새로 만들어진다.
// 실행: node scripts/export-content.mjs
// 유료 상품(네이버 지도 목록)의 링크와 메모 입력표는 공개 저장소에 두지 않으므로 여기에 넣지 않는다.
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const json = async f => JSON.parse((await readFile(join(ROOT, f), "utf8")).replace(/^﻿/, ""));

const index = await json("places/index.json");
const categories = await json("places/categories.json");
const areas = await json("places/areas.json");
const premium = await json("premium.json");
const SITE = "https://first-visit-korea-guide.vercel.app";
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const COND = { lost: "길치", kid: "아이", car: "자차", transit: "대중교통", foreign: "외국인", mustgo: "꼭 가야 할 때" };
// 한국 날짜 (세계 표준시로 찍으면 밤에는 하루 전 날짜가 된다)
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const catName = id => categories.find(c => c.id === id)?.name ?? id;
const areaName = id => areas.find(a => a.id === id)?.name?.ko ?? id;
const oneLine = s => String(s ?? "").replace(/\s*\n\s*/g, " ").trim();

const places = [];
for (const e of index) {
  const p = await json(`places/${e.id}/place.json`);
  places.push({ ...p, en: e.i18n?.en?.name ?? "" });
}

const out = [];
const w = (...l) => out.push(...l);

w("# First Visit Korea — 사이트 전체 내용", "",
  `- 주소: ${SITE}`,
  `- 정리한 날: ${today} (\`node scripts/export-content.mjs\`로 자동 생성)`,
  `- 장소: ${places.length}곳 · 언어: 영어(기본)·중국어·일본어·한국어`,
  "- 아래 장소 메모는 사이트의 한국어 원본이다. 영어·중국어·일본어 번역은 각 장소 폴더의 `i18n.json`에 있다.", "");

w("## 1. 사이트 소개", "",
  "한국을 처음 여행하는 외국인을 위한 장소 안내 사이트. 유명한 곳의 **휴무일·예약·입장 조건·헷갈리는 길**을",
  "공식 출처 중심으로 모아, \"오늘 가도 되는지\"를 미리 판단하게 돕는다.", "",
  "### 화면과 기능", "",
  "| 화면 | 내용 |", "|---|---|",
  "| 첫 화면 | 로고와 \"First Visit Korea\", 위젯 2개(네이버 지도 팩·준비물 큐브), 질문 제목 \"Should I go here today?\", 검색, 분류 칩, 장소 카드(소개 한 줄·안내·휴무 뱃지·대표 사진), 테마별(By theme)·지역별 보기(By area), 언어 선택, 아래 메뉴 줄(홈·지역별·검색) |",
  "| 장소 화면 | 오늘의 판정(Today's verdict), 날씨(기상청 초단기예보), 오늘 붐빔 예측(한국관광공사 관광지 집중률), \"꼭 기억할 3가지\", 메모 카드, 걸어서 갈 이웃 장소(Nearby on foot), 택시 카드, 방문자 한 줄 제보 |",
  "| 스위치 | 길치·대중교통 기준이 항상 기본(2026-11-01부터). 사용자가 고르는 것은 \"아이와 함께\"(With kids)와 \"오늘은 꼭 가야 해요\" 두 개 |",
  "| \"오늘은 꼭 가야 해요\" 모드 | 켜면 대안 메모(`mustgo`)가 \"꼭 기억할 3가지\"로 올라오고, 최근 3시간 방문자 제보가 먼저 보인다 |",
  "| 검색용 페이지 | 언어별·장소별 페이지를 미리 만들어 둔다 (`/en/`, `/en/gyeongbokgung/` 등, 4개 언어 × 33개 = 132개) |",
  "| 약관·환불·개인정보 | `terms.html`, `refund.html`, `privacy.html` (영어) |", "");

const ml = premium.mapList ?? {};
w("### 유료 상품", "",
  `- **네이버 지도 목록** (${ml.price ?? "확인 필요"}, 한 번 결제, Lemon Squeezy): 사이트 장소 ${ml.count ?? "?"}곳을 영어 별명·50자 메모·사이트 링크와 함께 담은 네이버 지도 저장 목록.`,
  `- 결제 링크: ${ml.checkoutUrl ? ml.checkoutUrl : "아직 비어 있음 → 첫 화면 배너와 장소 화면 카드가 숨겨져 있다"}`,
  "- 휴무·예약·입장 조건·안전 정보와 붐빔 정보는 결제와 상관없이 항상 무료.",
  "- 환불: 구매 후 14일 안에 이유 없이 전액. 목록은 링크로 전달되므로 환불 뒤 회수는 못 하고 사용 중단을 부탁한다.", "");

w("## 2. 장소 목록", "", "| # | 장소 | 영어 이름 | 분류 | 지역 | 정기 휴무 |", "|---|---|---|---|---|---|");
places.forEach((p, i) => w(`| ${i + 1} | [${p.name}](#${p.id}) | ${p.en} | ${(p.categories ?? []).map(catName).join(", ")} | ${areaName(p.area)} | ${p.closedWeekdays?.length ? p.closedWeekdays.map(d => DAYS[d] + "요일").join(", ") : "없음"} |`));
w("");

w("## 3. 장소별 상세", "",
  "메모 표시: 📌 = \"꼭 기억할 3가지\"에 고정 · ⚠️ = 빨간 주의 카드 · [조건] = 관련 상황 · 「…」 = 신뢰도 표시 · (… 때만) = 그 이동수단일 때만 보임. 자차 전용 메모는 데이터에 남아 있지만 2026-11-01부터 화면에 보이지 않는다.", "");
for (const [i, p] of places.entries()) {
  w(`<a id="${p.id}"></a>`, `### ${i + 1}. ${p.name} (${p.en})`, "",
    ...(p.intro ? [`- 소개: ${oneLine(p.intro)}`] : []),
    `- 주소: ${p.address}`,
    `- 분류·지역: ${(p.categories ?? []).map(catName).join(", ")} · ${areaName(p.area)}`,
    `- 운영 시간: ${oneLine(p.hours) || "확인 필요"}`);
  if (p.fee) w(`- 요금: ${oneLine(p.fee)}`);
  w(`- 정기 휴무: ${p.closedWeekdays?.length ? p.closedWeekdays.map(d => DAYS[d] + "요일").join(", ") : "없음"}`,
    `- 사이트 페이지: ${SITE}/en/${p.id}/`,
    `- 마지막 확인: ${p.updated ?? "확인 필요"}`, "",
    "**메모**", "");
  const memos = [...p.memos].sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (b.importance ?? 0) - (a.importance ?? 0));
  for (const m of memos) {
    const marks = [m.pin && "📌", m.warn && "⚠️"].filter(Boolean).join("");
    const cond = (m.conditions ?? []).map(c => COND[c] ?? c);
    const tags = [m.category, cond.length && `[${cond.join("·")}]`, m.onlyMode === "car" ? "(자차일 때만 · 지금 화면에는 안 보임)" : m.onlyMode && `(${COND[m.onlyMode] ?? m.onlyMode}일 때만)`,
      ...(m.trust ?? []).map(t => `「${t}」`)].filter(Boolean).join(" ");
    w(`- ${marks ? marks + " " : ""}**${oneLine(m.title)}** — ${tags}`, `  ${oneLine(m.body)}`);
    if (m.source) w(`  *출처: ${oneLine(m.source)}*`);
  }
  w("", "**출처**", "", ...(p.sources ?? []).map(s => `- ${s}`), "");
}

await writeFile(join(ROOT, "docs/site-content.md"), out.join("\n"), "utf8");
console.log(`docs/site-content.md 만들었어요: 장소 ${places.length}곳, 메모 ${places.reduce((n, p) => n + p.memos.length, 0)}개`);
