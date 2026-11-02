// 먼저 다녀온 메모 — 화면 동작
// 장소 데이터는 places/<장소id>/place.json 에 있고, 이 파일에는 장소 전용 코드가 없다.

const STORE_KEY = "first-visit-guide:state";

const $ = id => document.getElementById(id);
// 대상이 "한국에 처음 오는, 대중교통으로 다니는 외국인"이라 길치·대중교통은 고르지 않고 항상 켠 것으로 본다.
// 사용자가 고르는 스위치는 아이 동반뿐이다. (예전 주소의 lost=·mode= 는 무시한다)
const state = { kid: false, mustgo: false }; // mustgo: "오늘은 꼭 가야 해요"
let place = null;
let allPlaces = []; // places/index.json (걸어서 갈 이웃의 이름을 보여줄 때 쓴다)
// 검색용 장소 페이지(/en/gyeongbokgung/ 등, npm run build 가 만듦)는 { place, lang } 를 window.FVG_PAGE 에 적어 둔다.
// 예전 주소(/?place=…&lang=…)도 계속 동작한다.
const PAGE = window.FVG_PAGE ?? {};
const pagePlace = () => new URLSearchParams(location.search).get("place") ?? PAGE.place ?? null;

// ---------- 언어: 주소의 ?lang= > 전에 고른 언어 > 휴대폰 언어 > 영어 ----------
// 글자는 ui-text.js(화면)와 places/<장소>/i18n.json(장소 메모)에 있다. 번역이 없으면 한국어를 그대로 보여준다.
const LANG_KEY = "first-visit-guide:lang";
function pickLang() {
  const ids = LANGS.map(l => l.id);
  const q = new URLSearchParams(location.search).get("lang") ?? PAGE.lang;
  if (ids.includes(q)) {
    try { localStorage.setItem(LANG_KEY, q); } catch { /* 무시 */ }
    return q;
  }
  try { const saved = localStorage.getItem(LANG_KEY); if (ids.includes(saved)) return saved; } catch { /* 무시 */ }
  // 외국인 여행자용: 휴대폰 언어는 영어·중국어·일본어만 알아본다. 한국어는 언어 버튼(?lang=ko)으로만 고른다.
  for (const l of navigator.languages ?? [navigator.language]) {
    const two = String(l).slice(0, 2).toLowerCase();
    if (["en", "zh", "ja"].includes(two)) return two;
  }
  return "en";
}
const lang = pickLang();
const T = UI[lang];
const foreign = lang !== "ko";
let placeT = null; // 이 장소의 번역 (i18n.json 에서 고른 언어 부분, 없으면 null)

function t(key, ...args) {
  const v = T[key] ?? UI.en[key] ?? UI.ko[key];
  return typeof v === "function" ? v(...args) : v;
}
// 한국어 낱말 → 번역 (메모 분류, 확인 필요 표시, 날씨 등). 없으면 한국어 그대로
const word = (group, k) => T[group]?.[k] ?? k;
// 사진 출처 글자 안의 기관·라이선스 이름만 번역 (촬영자 이름은 그대로)
const credit = c => Object.entries(T.credits ?? {}).reduce((out, [ko, tr]) => out.replaceAll(ko, tr), c);

function applyStaticText() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  if (!PAGE.lang) document.title = t("appName"); // 미리 만든 페이지는 검색용 제목을 그대로 둔다
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const [key, i] = el.dataset.i18n.split(".");
    el.textContent = i === undefined ? t(key) : t(key)[Number(i)];
  });
  document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  // 언어 고르기: 지금 언어만 보이는 작은 버튼(EN ▾), 누르면 목록이 펼쳐진다.
  // 각 줄은 같은 장소의 다른 언어 페이지(/zh/gyeongbokgung/)로. 아이·꼭 가야 해요 스위치는 그대로 넘긴다
  const cur = LANGS.find(l => l.id === lang) ?? LANGS[0];
  document.querySelectorAll("[data-langs]").forEach(box => {
    const links = LANGS.map(l => {
      const q = new URLSearchParams(location.search);
      q.delete("lang"); q.delete("place");
      return `<a href="${esc(pageUrl(l.id, pagePlace()) + (q.size ? "?" + q : ""))}" hreflang="${l.id}"${l.id === lang ? ' aria-current="true"' : ""}>${esc(l.label)}</a>`;
    }).join("");
    box.innerHTML = `<summary aria-label="Language: ${esc(cur.label)}">${esc(cur.label)}</summary><nav aria-label="Language">${links}</nav>`;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => { if (el.title) el.title = el.getAttribute("aria-label"); });
}
// 언어 목록은 바깥을 누르거나 Esc를 누르면 닫는다
document.addEventListener("click", e => {
  document.querySelectorAll("[data-langs][open]").forEach(d => { if (!d.contains(e.target)) d.open = false; });
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") document.querySelectorAll("[data-langs][open]").forEach(d => { d.open = false; d.querySelector("summary").focus(); });
});

// 언어·장소별 페이지 주소: /en/ (첫 화면), /en/gyeongbokgung/ (장소)
function pageUrl(l, id) {
  return id ? `/${l}/${encodeURIComponent(id)}/` : `/${l}/`;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- 스위치 상태: 주소(링크 공유용) > 브라우저 기억 > 기본값 ----------
function loadState() {
  try {
    Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY)) || {});
  } catch { /* 저장소를 못 쓰는 브라우저면 기본값 사용 */ }
  const q = new URLSearchParams(location.search);
  if (q.has("kid")) state.kid = q.get("kid") === "1";
  if (q.has("mustgo")) state.mustgo = q.get("mustgo") === "1";
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ kid: state.kid, mustgo: state.mustgo })); } catch { /* 무시 */ }
  const q = new URLSearchParams(location.search);
  q.delete("lost"); q.delete("mode");
  q.set("kid", state.kid ? "1" : "0");
  q.set("mustgo", state.mustgo ? "1" : "0");
  history.replaceState(null, "", location.pathname + "?" + q.toString()); // 장소 페이지 주소(/en/…/)는 그대로 둔다
}

// 메모 순서(점수·숨김·pin 먼저)는 memo-rank.js 에 있다 (검색용 장소 페이지와 같은 규칙을 쓰려고)
// ---------- 오늘의 판정 (판정 규칙은 verdict.js) ----------
// 붐빔 예측: 서버 코드 /api/crowd 가 한국관광공사에 대신 물어봄. 못 받으면 null
function shortDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return t("shortDate", d.getUTCMonth() + 1, d.getUTCDate(), T.weekdays[d.getUTCDay()]);
}
async function loadCrowd() {
  if (!place.crowd) return null; // 관광공사 목록에 없는 장소
  const { area, signgu, name } = place.crowd;
  try {
    const c = await fetchWithRetry(`api/crowd?area=${area}&signgu=${signgu}&name=${encodeURIComponent(name)}`);
    return c.ok && !c.empty ? c.days : null;
  } catch { return null; }
}

// 장소 이름 아래 신호등 한 줄. 쉬는 날·붐빔·덜 붐비는 날을 이 카드 하나에 모아 같은 말이 두 번 나오지 않게 한다.
let lastVerdict = null; // 이용권 상태가 바뀌면 다시 그리려고 남겨 둔다
function renderVerdict(v) {
  lastVerdict = v;
  const ICON = { closed: "⛔", check: "❓", plan: "⚠️", good: "✅", open: "⚪" };
  const days = list => list.map(d => shortDate(d.date)).join(" · ");
  const reasons = [];
  let better = []; // 덜 붐비는 날 (유료로 잠글 수 있는 부분이라 따로 둔다)
  if (v.level === "closed") {
    better = v.better;
    if (!better.length && v.nextOpen) reasons.push(t("vNextOpen", shortDate(v.nextOpen)));
  } else if (v.level === "check") {
    reasons.push(t("vCheckWhy"));
  } else {
    // 한산한 날은 "앞으로 30일 중 한산한 편" 한 줄로 충분하다 ("한산할 듯"과 겹치므로)
    reasons.push(!v.crowd ? (v.level === "open" ? t("vNoCrowd") : "")
      : v.crowd.level === "calm" ? t("calmOf", v.crowd.n) : T.crowd[v.crowd.level]);
    if (v.rain) reasons.push(t("vRain"));
    else if (v.rain === null && v.crowd) reasons.push(t("vNoWeather"));
    if (v.crowd && v.crowd.level !== "calm") { better = v.crowd.better; if (!better.length) reasons.push(t("todayBest")); }
  }
  const parts = reasons.filter(Boolean).map(esc);
  if (better.length) {
    // 유료로 잠근 경우: 판정(무료)은 그대로 두고, 덜 붐비는 날 추천만 자물쇠 버튼으로 바꾼다
    parts.push(locked("quiet-days")
      ? `<button type="button" class="linklike" id="c-lock">🔒 ${esc(t("lockedDays"))}</button>`
      : esc(t("betterDays", days(better))));
  }
  $("v-icon").textContent = ICON[v.level];
  $("v-main").textContent = T.verdict[v.level];
  $("v-sub").innerHTML = parts.join(" · ");
  // 노랑(붐빔·비): "꼭 가야 하는 날" 모드로 이어 준다 (이미 켜져 있으면 숨김)
  $("v-plan").textContent = t("vPlanCta", t("mustgo"));
  $("v-plan").hidden = !(v.level === "plan" && !state.mustgo);
  $("verdict").dataset.level = v.level;
  $("verdict").hidden = false;
}
async function loadVerdict() {
  const today = kstToday();
  // 쉬는 날은 붐빔·날씨를 기다리지 않고 바로 보여준다
  if ((place.closedWeekdays ?? []).includes(weekdayOf(today))) renderVerdict(verdict(place, today, null, null));
  const [days, weather] = await Promise.all([loadCrowd(), loadWeather()]);
  renderVerdict(verdict(place, today, days, weather));
}

// ---------- 날씨 (서버 코드 /api/weather 가 기상청에 대신 물어봄) ----------
function weatherIcon(h) {
  if (h.rain) return h.rain.includes("눈") ? "🌨️" : "🌧️";
  return { "맑음": "☀️", "구름 많음": "⛅", "흐림": "☁️" }[h.sky] ?? "🌡️";
}
// 기상청 같은 외부 서비스는 가끔 일시적으로 실패하므로, 연결 문제일 때는 잠시 뒤 한 번 더 물어본다
async function fetchWithRetry(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const data = await (await fetch(url)).json();
      const temporary = !data.ok && ["api-error", "network"].includes(data.reason);
      if (!temporary || attempt >= 1) return data;
    } catch (e) {
      if (attempt >= 1) throw e;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function loadWeather() {
  const main = $("w-main"), sub = $("w-sub");
  if (place.lat === undefined) { main.textContent = t("wxNoLoc"); return null; }
  try {
    const w = await fetchWithRetry(`api/weather?lat=${place.lat}&lon=${place.lon}`);
    if (!w.ok) {
      main.textContent = T.wxFail[w.reason] ?? t("wxCantLoad");
      sub.textContent = foreign ? "" : w.message;
      return null;
    }
    const now = w.hours[0];
    main.textContent = `${now.temp}° ${now.rain ? word("rain", now.rain) : word("sky", now.sky)}`;
    const wet = w.hours.find(h => h.rain);
    sub.textContent = wet ? t("wxWet", wet.time, word("rain", wet.rain)) : t("wxDry");
    $("w-icon").textContent = weatherIcon(now);
    $("wx").classList.toggle("wet", Boolean(wet));
    return w;
  } catch {
    main.textContent = t("wxCantLoad");
    sub.textContent = t("wxNoServer");
    return null;
  }
}

// ---------- 그리기 ----------
function trustChip(label) {
  const cls = label.includes("엇갈") ? "mixed" : "check";
  return `<span class="chip ${cls}">${esc(word("trust", label))}</span>`;
}
function photoBase() {
  return `places/${encodeURIComponent(place.id)}/`;
}
// 메모 번역: i18n.json 에 이 메모가 있으면 번역, 없으면 한국어 그대로
function memoText(m) {
  const tr = placeT?.memos?.[m.id];
  return { title: tr?.title ?? m.title, body: tr?.body ?? m.body };
}
function memoHTML(m, open, num) {
  const { title, body } = memoText(m);
  const chips = (m.trust || []).map(trustChip);
  if (state.kid && m.conditions.includes("kid")) chips.unshift(`<span class="chip">${esc(t("chipKid"))}</span>`);
  if (state.mustgo && m.conditions.includes("mustgo")) chips.unshift(`<span class="chip">${esc(t("chipMustgo"))}</span>`);
  if (foreign && m.conditions.includes("foreign")) chips.unshift(`<span class="chip">${esc(t("chipForeign"))}</span>`);
  const photos = (m.photos || []).map(ph => `
      <button type="button" data-src="${esc(photoBase() + ph.file)}" data-cap="${esc(ph.caption)} · ${esc(ph.credit)}">
        <img src="${esc(photoBase() + ph.file)}" alt="${esc(ph.caption)}" loading="lazy">
        <span>${esc(ph.caption)}</span>
      </button>`).join("");
  // 접힌 상태에서도 보이는 표시: 필수(pin, 신분증처럼 출입에 꼭 필요한 것)·주의(warn)는 색만이 아니라 글자로도 알린다
  const tags = [
    m.pin ? `<span class="tag pin">${esc(t("pinTag"))}</span>` : "",
    m.warn ? `<span class="tag warn">${esc(t("warnTag"))}</span>` : "",
    `<span class="cat">${esc(word("memoCat", m.category))}</span>`
  ].join("");
  return `<li><details class="note${m.warn ? " warn" : ""}${m.pin ? " pin" : ""}"${open ? " open" : ""}>
    <summary${num ? ' class="numbered"' : ""}>${num ? `<span class="num" aria-hidden="true">${num}</span>` : ""}<h3>${esc(title)}</h3><span class="tags">${tags}</span><span class="chev" aria-hidden="true"></span></summary>
    <div class="inner">
      <p>${esc(body)}</p>
      ${photos ? `<div class="thumbs">${photos}</div>` : ""}
      ${chips.length ? `<div class="chips">${chips.join("")}</div>` : ""}
      ${m.source ? `<span class="src">${esc(t("source", m.source))}</span>` : ""}
    </div>
  </details></li>`;
}
function render() {
  $("t-kid").setAttribute("aria-pressed", String(state.kid));
  $("t-mustgo").setAttribute("aria-pressed", String(state.mustgo));
  $("t-mustgo").classList.toggle("locked", locked("mustgo"));
  $("t-mustgo").setAttribute("aria-label", locked("mustgo") ? `${t("mustgo")} ${t("locked")}` : t("mustgo"));
  renderMustgoLive();

  // "pin": true 인 메모(출입에 꼭 필요한 것 등)는 스위치와 상관없이 항상 맨 앞에 둔다
  const { top, more } = rankMemos(place.memos, { ...state, foreign });
  // 핵심 3가지는 제목만 보이고 누르면 그 자리에서 펼쳐진다
  $("brief-title").textContent = t("briefTitle", top.length); // 예: 2개면 "꼭 기억할 2가지"
  $("notes-top").innerHTML = top.map((m, i) => memoHTML(m, false, i + 1)).join("");
  $("notes-more").innerHTML = more.map(m => memoHTML(m, false)).join("");
  $("more-count").textContent = t("moreCount", more.length);
  $("more-wrap").hidden = more.length === 0;
}

// 걸어서 갈 이웃: 지하철 말고 걸어가도 되는 곳 / 가까워 보여도 오르막·계단이라 힘든 곳
function renderWalk() {
  const list = (place.walkTo ?? []).filter(w => allPlaces.some(p => p.id === w.to));
  $("walk-wrap").hidden = list.length === 0;
  if (!list.length) return;
  $("walk-count").textContent = t("moreCount", list.length);
  $("walk-list").innerHTML = list.map(w => {
    const to = allPlaces.find(p => p.id === w.to);
    const name = to.i18n?.[lang]?.name ?? to.name;
    const hard = w.kind === "hard";
    const note = placeT?.walkTo?.[w.to] ?? w.note;
    const tags = `<span class="tag walk-min">${esc(t("walkMin", w.minutes))}</span><span class="tag walk-${hard ? "hard" : "skip"}">${esc(t(hard ? "walkHard" : "walkSkip"))}</span>`;
    return `<li><details class="note${hard ? " warn" : ""}">
    <summary><h3>${esc(name)}</h3><span class="tags">${tags}</span><span class="chev" aria-hidden="true"></span></summary>
    <div class="inner">
      <p>${esc(note)}</p>
      ${hard ? `<p class="walk-tip">${esc(t("walkHardTip"))}</p>` : ""}
      ${w.trust?.length ? `<div class="chips">${w.trust.map(trustChip).join("")}</div>` : ""}
      <div class="kr-links"><a href="${esc(pageUrl(lang, w.to))}">${esc(t("walkOpen"))}</a><a href="https://map.naver.com/p/search/${encodeURIComponent(to.name)}" target="_blank" rel="noopener">${esc(t("naver"))}</a></div>
      <span class="src">${esc(t("source", `${w.source} (${w.checkedOn})`))}</span>
    </div>
  </details></li>`;
  }).join("");
}

function renderPlaceHeader() {
  const name = placeT?.name ?? place.name;
  if (!PAGE.place) document.title = `${name} · ${t("appName")}`; // 미리 만든 장소 페이지는 검색용 제목을 그대로 둔다
  $("p-name").textContent = name;
  $("p-meta").textContent = [placeT?.address ?? place.address, placeT?.hours ?? place.hours, placeT?.fee ?? place.fee]
    .filter(Boolean).join(" · ");
  // 외국어로 볼 때: 한국어 이름·주소(택시·지도 검색용)와 네이버 지도 링크, 관광통역안내전화
  // 네이버 지도 웹은 휴대폰 언어(영·중·일)로 자동 표시된다. 카카오맵 웹은 한국어만 있어서 넣지 않았다.
  if (foreign) {
    $("kr-title").textContent = t("krTitle");
    $("kr-name").textContent = place.name;
    $("kr-addr").textContent = place.address;
    $("kr-naver").textContent = t("naver");
    $("kr-naver").href = `https://map.naver.com/p/search/${encodeURIComponent(place.name)}`;
    $("kr-maps").textContent = `${t("krMaps")} ${t("krAppTip")}`;
    $("kr-hotline").textContent = t("hotline");
    $("kr-open-label").textContent = t("krOpen");
    $("kr-open").hidden = false;
    $("kr-open").onclick = () => $("kr-card").showModal(); // Esc 로 닫히고, 닫히면 칩으로 포커스가 돌아간다
    // 팝업 바깥(어두운 부분)을 눌러도 닫힌다
    $("kr-card").onclick = e => {
      const r = $("kr-card").getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $("kr-card").close();
    };
    $("ai-note").textContent = placeT?.memos ? t("aiNote") : t("notTranslated");
    $("ai-note").hidden = false;
  }
  // 예약 표시: 신호등 색과 별개. place.json 의 reservation("all"/"part")만 본다 (notice 글자는 읽지 않음)
  if (place.reservation) {
    $("v-book").textContent = `📅 ${T.vBook[place.reservation]}`;
    $("v-book").hidden = false;
  }
  // 대표 사진: 출처(촬영자·라이선스)를 사진 위에 함께 표시한다
  if (place.cover) {
    const url = photoBase() + place.cover.file;
    $("hero").classList.add("has-photo");
    $("hero").style.backgroundImage = `url("${encodeURI(url)}")`;
    if (place.cover.position) $("hero").style.backgroundPosition = place.cover.position;
    $("hero").setAttribute("role", "img");
    $("hero").setAttribute("aria-label", t("photoOf", name));
    $("hero-credit").textContent = t("photoCredit", credit(place.cover.credit), credit(place.cover.license));
    $("hero-credit").href = place.cover.link;
    $("hero-credit").hidden = false;
  }
  const folded = [
    place.sources?.length ? `<span>${esc(t("fSources", place.sources.join(", ")))}</span>` : "",
    `<span>${esc(t("fTrust"))}</span>`
  ].join("");
  $("footer").innerHTML = [
    place.cover ? `<span>${esc(t("fCover", credit(place.cover.credit), credit(place.cover.license)))} <a href="${esc(place.cover.link)}" target="_blank" rel="noopener">${esc(t("fOriginal"))}</a></span>` : "",
    place.updated ? `<span>${esc(t("fUpdated", place.updated))}</span>` : "",
    `<span id="f-license" hidden></span>`,
    `<details class="foot-more"><summary>${esc(t("footMore"))}</summary>${folded}</details>`
  ].join("");
}

// ---------- 방문자 한 줄 제보 ----------
// 서버(/api/reports)에 저장해서 모든 방문자와 나눈다.
// 서버 저장소가 연결 전이거나 연결이 안 되면 예전처럼 이 브라우저에만 저장한다.
const REPORT_FRESH = 3 * 3600 * 1000;   // 3시간 안 제보만 "지금" 정보로 본다
const REPORT_KEEP = 24 * 3600 * 1000;   // 24시간 지나면 지운다
const MINE_KEY = "first-visit-guide:my-reports"; // 내가 쓴 제보의 비밀 표시 { 제보id: 비밀값 }
const localKey = () => `first-visit-guide:reports:${place.id}`;
let shared = false; // true면 서버 공유 중

function readStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
function loadLocal() {
  const now = Date.now();
  const list = readStore(localKey(), []).filter(r => now - new Date(r.at).getTime() < REPORT_KEEP);
  writeStore(localKey(), list); // 24시간 지난 제보 정리
  return list;
}

async function loadReports() {
  try {
    const res = await fetch(`api/reports?place=${encodeURIComponent(place.id)}`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) { shared = true; return data.reports; }
  } catch { /* 서버 연결 실패 → 아래에서 내 브라우저 저장으로 */ }
  shared = false;
  return loadLocal();
}

async function sendReport(text) {
  if (!shared) {
    const list = loadLocal();
    list.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, at: new Date().toISOString() });
    if (!writeStore(localKey(), list)) return t("rStoreFail");
    return null;
  }
  const token = crypto.randomUUID();
  try {
    const res = await fetch("api/reports", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ place: place.id, text, token })
    });
    const data = await res.json();
    if (!data.ok) return data.message;
    writeStore(MINE_KEY, { ...readStore(MINE_KEY, {}), [data.report.id]: token });
    return null;
  } catch {
    return t("rSendFail");
  }
}

async function removeReport(id) {
  if (!shared) {
    writeStore(localKey(), loadLocal().filter(r => r.id !== id));
    return;
  }
  const mine = readStore(MINE_KEY, {});
  try {
    await fetch("api/reports", {
      method: "DELETE", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, token: mine[id] })
    });
    delete mine[id];
    writeStore(MINE_KEY, mine);
  } catch { /* 다음에 다시 시도 */ }
}

function ago(at) {
  const min = Math.floor((Date.now() - new Date(at).getTime()) / 60000);
  if (min < 1) return t("justNow");
  if (min < 60) return t("minAgo", min);
  return t("hourAgo", Math.floor(min / 60));
}

// 꼭 가야 하는 날 모드: "입구 줄 길어요" 같은 최근 3시간 제보를 메모보다 먼저 보여준다 (최대 3개)
let lastReports = [];
function renderMustgoLive() {
  $("mg-live").hidden = !state.mustgo;
  if (!state.mustgo) return;
  const fresh = lastReports.filter(r => Date.now() - new Date(r.at).getTime() < REPORT_FRESH).slice(0, 3);
  $("mg-list").innerHTML = fresh.length
    ? fresh.map(r => `<li><span class="txt">${esc(r.text)}</span><time datetime="${esc(r.at)}">${ago(r.at)}</time></li>`).join("")
    : `<li class="empty">${esc(t("mgEmpty"))}</li>`;
}

async function renderReports() {
  const list = (await loadReports()).sort((a, b) => b.at.localeCompare(a.at));
  lastReports = list;
  renderMustgoLive();
  const mine = readStore(MINE_KEY, {});
  $("r-note").textContent = shared ? t("rNoteShared") : t("rNoteLocal");
  const fresh = list.filter(r => Date.now() - new Date(r.at).getTime() < REPORT_FRESH);
  $("r-main").textContent = t("reportsN", fresh.length);
  $("r-sub").textContent = fresh.length ? `"${fresh[0].text}" · ${ago(fresh[0].at)}` : t("reportsSub");
  $("r-list").innerHTML = list.length
    ? list.map(r => {
        const old = Date.now() - new Date(r.at).getTime() >= REPORT_FRESH;
        return `<li${old ? ' class="old"' : ""}>
          <span class="txt">${esc(r.text)}</span>
          <time datetime="${esc(r.at)}">${ago(r.at)}${old ? t("old") : ""}</time>
          ${!shared || mine[r.id] ? `<button type="button" class="del" data-id="${esc(r.id)}" aria-label="${esc(t("delLabel"))}">${esc(t("del"))}</button>` : ""}
        </li>`;
      }).join("")
    : `<li class="empty">${esc(t("rEmpty"))}</li>`;
}

async function addReport(text) {
  text = text.trim().slice(0, 40);
  if (!text) return;
  $("r-send").disabled = true;
  const error = await sendReport(text);
  $("r-msg").textContent = error ?? "";
  if (!error) $("r-text").value = "";
  updateSendButton();
  await renderReports();
}
function updateSendButton() {
  $("r-send").disabled = !$("r-text").value.trim();
}

// ---------- $3 평생 이용권 (계정 없음) ----------
// 무엇을 잠글지는 premium.json 의 features 목록으로만 정한다. 목록이 비어 있으면 모든 기능이 무료로 동작하고,
// 구매 창·키 입력도 전혀 보이지 않는다. 출입·휴무·안전 정보는 목록에 넣지 않는다(항상 무료).
// 잠금은 화면에서만 한다(유료 메모도 공개 파일에 있다). $3 상품이라 지나친 보안보다 단순함을 골랐다.
// 서버가 키를 확인한 뒤에만 내용을 보내는 방식으로 바꾸려면 locked() 와 api/license.js 만 고치면 된다.
const LICENSE_KEY = "first-visit-guide:license"; // { key, instance, checked }
const RECHECK = 7 * 24 * 3600 * 1000;            // 환불·정지된 키를 걸러내려고 일주일에 한 번 다시 확인
let premium = { features: [], checkoutUrl: "" };
let license = readStore(LICENSE_KEY, null);
const locked = f => premium.features.includes(f) && !license;
const pwErr = reason => (T.pwErr ?? UI.en.pwErr)[reason] ?? (T.pwErr ?? UI.en.pwErr).invalid;

async function loadPremium() {
  try { premium = { ...premium, ...(await getJSON("premium.json")) }; } catch { /* 못 읽으면 모두 무료 */ }
}
async function licenseRequest(method, body) {
  try {
    const res = await fetch("api/license", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return await res.json();
  } catch {
    return { ok: false, reason: "network" };
  }
}
// 일주일에 한 번 키가 아직 유효한지 확인한다. 인터넷이 안 되거나 서버 문제일 때는 열린 상태를 유지한다
// (여행 중 데이터가 끊긴 사람이 산 기능을 못 쓰면 안 되므로). 키가 무효(환불·정지)로 확인될 때만 잠근다.
async function recheckLicense() {
  if (!license || Date.now() - (license.checked ?? 0) < RECHECK) return;
  const data = await licenseRequest("POST", { key: license.key, instance: license.instance });
  if (data.ok) {
    license.checked = Date.now();
    writeStore(LICENSE_KEY, license);
  } else if (data.reason === "invalid" || data.reason === "product") {
    license = null;
    try { localStorage.removeItem(LICENSE_KEY); } catch { /* 무시 */ }
    render(); if (lastVerdict) renderVerdict(lastVerdict); renderLicenseFooter();
  }
}
function openPaywall() {
  const names = T.pwFeat ?? UI.en.pwFeat;
  $("pw-feats").innerHTML = premium.features.map(f => `<li>${esc(names[f] ?? f)}</li>`).join("");
  // 결제 링크가 아직 없으면(연락처를 채우기 전 등) 구매 버튼을 숨기고 키 입력만 둔다
  $("pw-buy").hidden = $("pw-note").hidden = !premium.checkoutUrl;
  if (premium.checkoutUrl) $("pw-buy").href = premium.checkoutUrl;
  $("pw-msg").textContent = "";
  $("pw-send").disabled = false;
  $("paywall").showModal();
}
async function unlock(key) {
  key = key.trim();
  if (!key) return;
  $("pw-send").disabled = true;
  $("pw-msg").textContent = t("pwChecking");
  $("pw-msg").classList.remove("ok");
  const data = await licenseRequest("POST", { key });
  $("pw-send").disabled = false;
  if (!data.ok) { $("pw-msg").textContent = pwErr(data.reason); return; }
  license = { key, instance: data.instance, checked: Date.now() };
  writeStore(LICENSE_KEY, license);
  $("pw-msg").textContent = t("pwOk");
  $("pw-msg").classList.add("ok");
  $("pw-key").value = "";
  render(); if (lastVerdict) renderVerdict(lastVerdict); renderLicenseFooter();
}
// 하단: 잠긴 기능이 있을 때만 "라이선스 키 입력" 또는 "이 기기에서 해제"를 보여준다
function renderLicenseFooter() {
  const box = $("f-license");
  if (!box) return;
  box.hidden = !premium.features.length;
  box.innerHTML = license
    ? `${esc(t("fUnlocked"))} · <button type="button" class="linklike" id="f-remove">${esc(t("fRemove"))}</button>`
    : `<button type="button" class="linklike" id="f-key">${esc(t("fKey"))}</button>`;
}

// ---------- 장소 고르기 화면 ----------
// 사진 카드 하나: 사진 위에 "월 휴무"·"후원 예약 필요" 같은 꼭 알아야 할 표시를 얹는다
// sub: 카드 아래 작은 글 (테마별 보기에서는 지역 이름, 지역별 보기에서는 테마 이름).
// 행정구역(○○구)은 외국인에게 뜻이 없어 어느 보기에서도 쓰지 않는다
function placeCard(p, sub = "") {
  const tr = p.i18n?.[lang];
  const notice = tr?.notice ?? p.notice;
  const chips = [
    ...(p.closedWeekdays ?? []).map(d => t("closedDay", T.weekdays[d])),
    ...(notice ? [notice] : [])
  ].map(c => `<span class="pchip">${esc(c)}</span>`).join("");
  const img = p.cover
    ? `style="background-image:url('${encodeURI(`places/${p.id}/${p.cover.file}`)}');background-position:${esc(p.cover.position ?? "center")}"`
    : "";
  return `<a class="pcard" href="${esc(pageUrl(lang, p.id))}">
    <div class="pimg${p.cover ? "" : " noimg"}" ${img}>${chips ? `<div class="pchips">${chips}</div>` : ""}</div>
    <b>${esc(tr?.name ?? p.name)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}
  </a>`;
}

// 첫 화면 보기: "theme"(테마별) / "area"(지역별). 주소 ?view=area 가 있으면 그것, 없으면 이 브라우저에 기억한 것
const VIEW_KEY = "first-visit-guide:view";
function loadView() {
  const q = new URLSearchParams(location.search).get("view");
  if (q === "area" || q === "theme") return q;
  try { return localStorage.getItem(VIEW_KEY) === "area" ? "area" : "theme"; } catch { return "theme"; }
}
function saveView(view) {
  try { localStorage.setItem(VIEW_KEY, view); } catch { /* 무시 */ }
  const q = new URLSearchParams(location.search);
  if (view === "area") q.set("view", "area"); else q.delete("view");
  history.replaceState(null, "", location.pathname + (q.size ? "?" + q : "") + location.hash);
}

function showPicker(places, categories, areas) {
  $("picker").hidden = false;
  const areaName = id => { const a = areas.find(x => x.id === id); return a ? a.name[lang] ?? a.name.ko : ""; };
  const catNames = p => (p.categories ?? []).map(id => T.cats?.[id] ?? categories.find(c => c.id === id)?.name ?? id).join(" · ");

  // 테마마다 사진 카드 한 줄 (좌우로 넘김)
  const byTheme = () => categories.map(c => {
    const inCat = places.filter(p => p.categories?.includes(c.id));
    if (!inCat.length) return "";
    const catName = T.cats?.[c.id] ?? c.name;
    return `<section class="cat-row" aria-label="${esc(catName)}">
      <h2>${esc(catName)} <small>${esc(t("count", inCat.length))}</small></h2>
      <div class="row">${inCat.map(p => placeCard(p, areaName(p.area))).join("")}</div>
    </section>`;
  }).join("");

  // 지역마다 한 줄 + 오늘 상태. 상태는 오늘의 판정(verdict.js)을 붐빔·날씨 없이 돌린 것:
  // 빨강 = 휴무, 노랑 "쉬는 날 확인" = 확인 필요, 나머지 = 열림. 비어 있는 지역은 보여주지 않는다
  const byArea = () => {
    const today = kstToday();
    return ["seoul", "daytrip"].map(group => {
      const rows = areas.filter(a => a.group === group).sort((a, b) => a.order - b.order).map(a => {
        const inArea = places.filter(p => p.area === a.id);
        if (!inArea.length) return "";
        const levels = inArea.map(p => verdict(p, today, null, null).level);
        const closed = levels.filter(l => l === "closed").length, check = levels.filter(l => l === "check").length;
        const status = t("areaStatus", inArea.length - closed - check, closed, check);
        return `<section class="cat-row" aria-label="${esc(areaName(a.id))}">
          <h3>${esc(areaName(a.id))} <small>${esc(status)}</small></h3>
          <div class="row">${inArea.map(p => placeCard(p, catNames(p))).join("")}</div>
        </section>`;
      }).join("");
      return rows ? `<div class="area-group"><h2>${esc(T.areaGroups?.[group] ?? group)}</h2>${rows}</div>` : "";
    }).join("");
  };

  let view = loadView();
  const drawView = () => {
    $("sections").innerHTML = view === "area" ? byArea() : byTheme();
    $("view-toggle").textContent = t(view === "area" ? "viewTheme" : "viewArea");
  };

  // 검색어가 있으면 보기 선택과 상관없이 평평한 카드 목록
  const draw = () => {
    const q = $("search").value.trim();
    $("sections").hidden = Boolean(q);
    $("area-note").hidden = Boolean(q) || view !== "area";
    $("search-results").hidden = !q;
    if (!q) return;
    // 한국어 이름과 번역된 이름, 지역 이름 모두에서 찾는다
    const found = places.filter(p => {
      const tr = p.i18n?.[lang] ?? {};
      const a = areas.find(x => x.id === p.area);
      return `${p.name} ${p.region} ${p.address} ${tr.name ?? ""} ${tr.region ?? ""} ${a ? Object.values(a.name).join(" ") : ""}`
        .toLowerCase().includes(q.toLowerCase());
    });
    $("search-results").innerHTML = found.length
      ? `<div class="grid">${found.map(p => placeCard(p, areaName(p.area))).join("")}</div>`
      : `<p class="empty">${esc(t("searchEmpty", q))}</p>`;
  };
  const setView = v => { view = v; saveView(v); drawView(); draw(); };
  $("view-toggle").addEventListener("click", () => setView(view === "area" ? "theme" : "area"));
  $("search").addEventListener("input", draw);
  drawView();
  draw();
}

// ---------- 장소 화면 첫 방문 코치마크 ----------
// 글로 길게 설명하는 대신, 위쪽 버튼들을 강조 테두리와 화살표로 짚고 아주 짧은 말풍선만 단다.
// 버튼 자리는 언어·화면 너비에 따라 바뀌므로(좁으면 상단 바가 두 줄) 숫자로 박지 않고 매번 실제 자리를 잰다.
// 한 번 닫으면 이 브라우저에서는 다시 안 뜬다.
const COACH_KEY = "first-visit-guide:coach-seen";
const SVG_NS = "http://www.w3.org/2000/svg";

function setupCoach() {
  if (readStore(COACH_KEY, false)) return;
  const dlg = $("coach");
  const items = [
    { el: $("t-kid"), key: "coachKid", name: t("kid") },
    { el: $("t-mustgo"), key: "coachMustgo", name: t("mustgo") },
    { el: document.querySelector("#place .langs"), key: "coachLang", name: "Language" },
    // 메모 내용은 펼쳐야 보이므로 첫 메모의 펼치기(⌄)도 짚는다. 위쪽 버튼들과 떨어져 있어 따로 놓는다(below)
    { el: document.querySelector("#notes-top .chev"), key: "coachMore", name: document.querySelector("#notes-top h3")?.textContent ?? "", below: true }
  ];
  // 말풍선: 화면에는 짧은 말만, 화면 낭독기에는 어느 버튼 이야기인지 이름도 같이 읽어 준다
  $("coach-tips").innerHTML = items.map(it =>
    `<p class="coach-tip"><span class="coach-sr">${esc(it.name)}: </span>${esc(t(it.key))}</p>`).join("");
  items.forEach((it, i) => { it.tip = $("coach-tips").children[i]; });

  let frame = 0;
  const relayout = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => layoutCoach(items)); };
  const close = () => { if (dlg.open) dlg.close(); };
  // 화면 아무 곳이나 눌러도(알겠어요 버튼 포함) 닫힌다
  dlg.addEventListener("click", close);
  dlg.addEventListener("close", () => {
    writeStore(COACH_KEY, true);
    removeEventListener("resize", relayout);
    removeEventListener("scroll", relayout);
  }, { once: true });
  addEventListener("resize", relayout);
  // 안내가 떠 있는 동안 뒤 화면이 스크롤되어도 화살표가 버튼을 따라가게 한다 (스크롤을 막지 않는다)
  addEventListener("scroll", relayout, { passive: true });

  // 글꼴이 다 받아져야 버튼 너비가 정해지므로, 글꼴을 기다린 뒤 띄운다
  const show = () => {
    if (dlg.open || readStore(COACH_KEY, false)) return;
    dlg.showModal(); // 모달: Esc 로 닫히고, 닫히면 원래 자리로 포커스가 돌아간다
    layoutCoach(items);
  };
  (document.fonts?.ready ?? Promise.resolve()).then(show);
}

// 버튼 자리를 재서 어둡게 가리기(버튼 자리만 구멍)·강조 테두리·화살표·말풍선 위치를 정한다.
function layoutCoach(items) {
  const W = document.documentElement.clientWidth, H = innerHeight;
  const EDGE = 12;    // 말풍선이 화면 가장자리에서 떨어지는 거리
  const PAD = 4;      // 강조 테두리가 버튼보다 큰 정도
  const GAP = 10;     // 말풍선끼리 떨어지는 거리
  const svg = $("coach-svg");
  svg.setAttribute("width", W); svg.setAttribute("height", H);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  // 1) 화면에 보이는 버튼만 고른다 (스크롤로 화면 밖에 나간 버튼은 짚지 않는다)
  const shown = [];
  for (const it of items) {
    if (it.below) continue; // 첫 메모의 펼치기는 3-1)에서 따로 놓는다
    const r = it.el?.getBoundingClientRect();
    const visible = r && r.width > 0 && r.bottom > 0 && r.top < H;
    it.tip.hidden = !visible;
    if (!visible) continue;
    it.box = { left: r.left - PAD, top: r.top - PAD, right: r.right + PAD, bottom: r.bottom + PAD };
    shown.push(it);
  }
  const zoneTop = Math.max(0, ...shown.map(it => it.box.bottom)) + 24; // 말풍선은 버튼들 아래 빈 곳에 놓는다
  const hits = (a, b, gap = 0) => a.left < b.right + gap && b.left < a.right + gap && a.top < b.bottom + gap && b.top < a.bottom + gap;
  const others = it => shown.filter(o => o !== it).map(o => o.box);

  // 2) 화살표가 지나갈 길: 다른 버튼 위를 지나가면 안 된다.
  //    먼저 버튼 아래로 곧장 내려갈 수 있는지 보고, 막혀 있으면(좁은 화면에서 바로 아래에 다른 버튼이 있으면)
  //    버튼 아래 틈으로 잠깐 나와 옆으로 꺾은 뒤, 비어 있는 세로 줄(필요하면 화면 옆 여백)로 내려간다.
  //    lane = { tipX: 버튼을 짚는 x, gapY: 옆으로 꺾는 높이(곧장이면 null), x: 내려가는 세로 줄 }
  const taken = []; // 이미 정한 화살표 길 (화살표끼리 겹치거나 엇갈리지 않게)
  const free = (seg, it) => !others(it).some(o => hits(seg, o)) && !taken.some(o => hits(seg, o));
  const take = (L, b) => {
    taken.push({ left: L.x - 8, right: L.x + 8, top: L.gapY ?? b.bottom, bottom: H });
    if (L.gapY !== null) taken.push({ left: Math.min(L.x, L.tipX) - 8, right: Math.max(L.x, L.tipX) + 8, top: L.gapY - 8, bottom: L.gapY + 8 });
  };
  const near = (list, c) => list.sort((p, q) => Math.abs(p - c) - Math.abs(q - c));
  const columns = [];
  for (let x = 4; x <= W - 4; x += 2) columns.push(x); // 화면 옆 여백(16px)까지 길로 쓴다
  const tipsOf = it => {
    const b = it.box, tips = [];
    for (let x = b.left + 14; x <= b.right - 14; x += 2) tips.push(x);
    return near(tips, (b.left + b.right) / 2);
  };
  // 곧장 내려갈 수 있는 버튼부터 길을 정하고, 꺾어야 하는 버튼은 남은 자리에서 고른다
  for (const it of shown) {
    const b = it.box;
    const x = tipsOf(it).find(x => free({ left: x - 6, right: x + 6, top: b.bottom, bottom: zoneTop }, it));
    it.lane = x === undefined ? null : { tipX: x, gapY: null, x };
    if (it.lane) take(it.lane, b);
  }
  for (const it of shown.filter(it => !it.lane)) {
    const b = it.box, cx = (b.left + b.right) / 2, tips = tipsOf(it);
    let best = null;
    for (const tipX of tips) {
      // 이 x 바로 아래에서 처음 만나는 다른 버튼까지의 틈
      const floor = Math.min(zoneTop, ...others(it).filter(o => o.left < tipX + 6 && o.right > tipX - 6 && o.top >= b.bottom - 1).map(o => o.top));
      if (floor - b.bottom < 12) continue; // 틈이 너무 좁으면 이 자리로는 못 나온다
      const gapY = Math.min(b.bottom + 14, (b.bottom + floor) / 2);
      const x = near([...columns], tipX).find(x =>
        free({ left: Math.min(x, tipX) - 5, right: Math.max(x, tipX) + 5, top: gapY - 5, bottom: gapY + 5 }, it) &&
        free({ left: x - 3, right: x + 3, top: gapY, bottom: zoneTop }, it)); // 선 두께만큼만 비면 된다
      if (x !== undefined && (!best || Math.abs(x - tipX) < Math.abs(best.x - best.tipX))) best = { tipX, gapY, x };
    }
    it.lane = best ?? { tipX: cx, gapY: null, x: cx }; // 길이 전혀 없으면(거의 없음) 곧장 짚는다
    take(it.lane, b);
  }

  // 3) 말풍선 자리: 화살표 길 바로 아래, 화면 밖으로 나가지 않게. 겹치면 한 줄씩 아래로 내린다.
  const maxW = Math.min(220, W - EDGE * 2);
  const placed = [];
  // 세로 줄이 화면 옆 여백이면 말풍선 위로 들어갈 수 없으니, 말풍선 옆구리로 들어간다
  for (const it of shown) {
    const x = it.lane.x;
    it.lane.side = x < EDGE + 14 ? "left" : x > W - EDGE - 14 ? "right" : null;
  }
  const laneSeg = it => ({
    left: it.lane.x - 4, right: it.lane.x + 4, top: it.lane.gapY ?? it.box.bottom,
    bottom: it.lane.side ? it.at.top + it.at.h / 2 : it.at.top
  });
  // 말풍선의 가로 자리 후보: 화살표가 말풍선 가운데로 들어가는 자리를 먼저, 그다음 한쪽으로 치우친 자리
  const lefts = (it, w) => {
    const L = it.lane;
    if (L.side === "right") return [Math.max(EDGE, Math.min(W - EDGE - w, L.x - 10 - w))];
    if (L.side === "left") return [Math.max(EDGE, L.x + 10)];
    const out = [];
    const lo = Math.max(EDGE, L.x + 10 - w), hi = Math.min(W - EDGE - w, L.x - 10);
    for (let left = lo; left <= hi; left += 4) out.push(left);
    if (hi >= lo) out.push(hi);
    near(out, L.x - w / 2); // 가운데에 가까운 자리부터
    return out.length ? out : [Math.max(EDGE, Math.min(W - EDGE - w, L.x - w / 2))];
  };
  // 다른 화살표의 세로 줄을 가로막지 않는 자리인가
  const clearOfLanes = (it, left, w) => shown.every(o => o === it || o.lane.x < left - 8 || o.lane.x > left + w + 8);
  shown.forEach(it => {
    it.tip.style.maxWidth = `${maxW}px`;
    it.w = it.tip.offsetWidth; it.h = it.tip.offsetHeight;
    it.lefts = lefts(it, it.w);
    it.clear = it.lefts.filter(l => clearOfLanes(it, l, it.w));
  });
  // 놓는 순서에 따라 결과가 달라진다 (아주 좁은 화면에서는 먼저 놓은 말풍선이 뒤 화살표 길을 막기도 한다).
  // 버튼이 4개뿐이라 가능한 순서를 모두 시험해서, 겹침이 없고 가장 낮게 끝나는 배치를 고른다.
  const placeAll = order => {
    const done = [];
    let bad = 0;
    for (const it of order) {
      const { w, h } = it;
      const tries = [zoneTop, ...done.map(p => p.at.bottom + GAP)].sort((p, q) => p - q);
      const cands = [...it.clear, ...it.lefts.filter(l => !it.clear.includes(l))]; // 다른 길을 안 막는 자리 먼저
      // 아직 안 놓은 말풍선의 화살표는 이 말풍선보다 아래로 내려갈 수 있으니, 그 세로 줄을 덮지 않는 자리를 먼저 찾는다
      const rest = order.filter(o => o !== it && !done.includes(o));
      const keepsWay = left => rest.every(o => o.lane.x < left - 8 || o.lane.x > left + w + 8);
      let pick = null;
      for (const strict of [true, false]) {
        for (const top of tries) {
          for (const left of cands) {
            if (strict && !keepsWay(left)) continue;
            const at = { left, top, w, h, right: left + w, bottom: top + h };
            it.at = at;
            if (done.every(p => !hits(at, p.at, GAP - 1) && !hits(laneSeg(p), at) && !hits(laneSeg(it), p.at))) { pick = at; break; }
          }
          if (pick) break;
        }
        if (pick) break;
      }
      // 어디에도 깔끔히 안 들어가면 맨 아래 줄에 놓고 "겹침"으로 센다
      if (!pick) { bad++; const top = tries[tries.length - 1]; pick = { left: cands[0], top, w, h, right: cands[0] + w, bottom: top + h }; }
      it.at = pick;
      done.push(it);
    }
    return { bad, bottom: Math.max(...done.map(p => p.at.bottom)), at: new Map(done.map(p => [p, p.at])) };
  };
  const perms = list => list.length <= 1 ? [list] : list.flatMap((x, i) => perms([...list.slice(0, i), ...list.slice(i + 1)]).map(p => [x, ...p]));
  const startOrder = [...shown].sort((p, q) => (q.clear.length > 0) - (p.clear.length > 0) || p.lane.x - q.lane.x);
  let best = null;
  for (const [i, order] of perms(startOrder).entries()) {
    const res = placeAll(order);
    if (!best || res.bad < best.bad || (res.bad === best.bad && res.bottom < best.bottom)) best = res;
    if (i === 0 && best.bad === 0) break; // 기본 순서로 깔끔하면 더 볼 필요 없다
  }
  for (const it of shown) {
    it.at = best.at.get(it);
    placed.push(it);
    it.tip.style.left = `${it.at.left}px`; it.tip.style.top = `${it.at.top}px`;
  }

  // 3-1) 첫 메모의 펼치기(⌄): 바로 아래에 말풍선을 두고 위로 짚는다.
  //      위쪽 말풍선들보다 아래에 있고, 그 아래에 알겠어요 버튼 자리까지 남을 때만 보여 준다.
  const ok = $("coach-ok");
  const more = items.find(it => it.below);
  if (more) {
    const r = more.el?.getBoundingClientRect();
    more.tip.hidden = false;
    more.tip.style.maxWidth = `${maxW}px`;
    const w = more.tip.offsetWidth, h = more.tip.offsetHeight;
    const floor = Math.max(zoneTop, ...placed.map(p => p.at.bottom)) + GAP;
    const top = r ? r.bottom + PAD + 24 : 0;
    const fits = r && r.width > 0 && r.top - PAD >= floor && top + h + 20 + ok.offsetHeight + EDGE <= H;
    more.tip.hidden = !fits;
    if (fits) {
      const cx = (r.left + r.right) / 2;
      const left = Math.max(EDGE, Math.min(W - EDGE - w, cx - w + 28)); // 화살표가 말풍선 오른쪽 끝 가까이로 들어간다
      more.box = { left: r.left - PAD, top: r.top - PAD, right: r.right + PAD, bottom: r.bottom + PAD };
      more.at = { left, top, w, h, right: left + w, bottom: top + h };
      more.lane = { tipX: cx, gapY: null, x: cx, side: null };
      more.tip.style.left = `${left}px`; more.tip.style.top = `${top}px`;
      placed.push(more);
    }
  }

  // 4) 알겠어요 버튼: 말풍선들 아래 가운데. 화면이 아주 낮으면 아래 끝에 붙인다.
  const okTop = Math.max(zoneTop, ...placed.map(p => p.at.bottom)) + 20;
  ok.style.top = `${Math.min(okTop, H - ok.offsetHeight - EDGE)}px`;

  // 5) 그리기: 어두운 막(버튼 자리만 뚫림) → 강조 테두리 → 화살표
  const el = (tag, attrs) => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  svg.replaceChildren();
  const defs = el("defs", {});
  const mask = el("mask", { id: "coach-mask" });
  mask.append(el("rect", { width: W, height: H, fill: "#fff" }));
  const marker = el("marker", { id: "coach-arrow", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 10, markerHeight: 10, markerUnits: "userSpaceOnUse", orient: "auto" });
  marker.append(el("path", { d: "M0 0 L10 5 L0 10 z", class: "coach-head" }));
  defs.append(mask, marker);
  svg.append(defs, el("rect", { width: W, height: H, class: "coach-dim", mask: "url(#coach-mask)" }));
  for (const it of placed) {
    const b = it.box, rx = (b.bottom - b.top) / 2; // 짚는 버튼은 모두 알약 모양이라 끝을 둥글게
    const box = { x: b.left, y: b.top, width: b.right - b.left, height: b.bottom - b.top, rx };
    mask.append(el("rect", { ...box, fill: "#000" }));
    svg.append(el("rect", { ...box, class: "coach-ring" }));
    const a = it.at, L = it.lane;
    // 출발: 말풍선 위 가운데쪽(보통) 또는 말풍선 옆구리(세로 줄이 화면 옆 여백일 때)
    const start = L.side ? `M${L.side === "right" ? a.right : a.left} ${a.top + a.h / 2} H${L.x}` : `M${L.x} ${a.top - 2}`;
    // 곧장 올라가거나, 버튼 아래 틈에서 꺾어 버튼을 아래에서 짚는다
    const d = L.gapY === null ? `${start} V${b.bottom + 3}` : `${start} V${L.gapY} H${L.tipX} V${b.bottom + 3}`;
    svg.append(el("path", { d, class: "coach-line", "marker-end": "url(#coach-arrow)" }));
  }
}

// ---------- 시작 ----------
async function getJSON(url) {
  // 장소를 추가·수정해도 브라우저가 예전 파일을 쓰지 않도록 매번 바뀌었는지 확인한다
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function start() {
  applyStaticText();
  try {
    const places = await getJSON("places/index.json");
    const id = pagePlace();
    if (!id && places.length !== 1) {
      const [categories, areas] = await Promise.all([getJSON("places/categories.json"), getJSON("places/areas.json")]);
      showPicker(places, categories, areas);
      return;
    }

    const placeId = id || places[0].id;
    if (!places.some(p => p.id === placeId)) throw new Error(`목록에 없는 장소: ${placeId}`);
    allPlaces = places;
    place = await getJSON(`places/${encodeURIComponent(placeId)}/place.json`);
    if (foreign) {
      try { placeT = (await getJSON(`places/${encodeURIComponent(placeId)}/i18n.json`))[lang] ?? null; }
      catch { placeT = null; } // 아직 번역 안 된 장소 → 한국어 그대로
    }

    await loadPremium();
    loadState();
    if (locked("mustgo")) state.mustgo = false; // 주소에 mustgo=1 이 있어도 이용권이 없으면 켜지 않는다
    $("back").hidden = places.length <= 1;
    $("back").href = pageUrl(lang);
    $("place").hidden = false;
    renderPlaceHeader();
    render();
    renderWalk();
    loadVerdict(); // 날씨·붐빔을 불러와 판정 카드를 그린다
    renderReports();
    setInterval(renderReports, 60 * 1000); // "○분 전" 표시를 1분마다 새로 고침
    renderLicenseFooter();
    recheckLicense();
    setupCoach(); // 장소 화면에 처음 들어왔을 때만 버튼 안내를 한 번 띄운다 (첫 화면에는 띄우지 않음)
  } catch (e) {
    console.error(e);
    $("error").hidden = false;
  }
}

$("p-meta").addEventListener("click", e => {
  const btn = e.currentTarget;
  btn.setAttribute("aria-expanded", String(btn.getAttribute("aria-expanded") !== "true"));
});
$("t-kid").addEventListener("click", () => { state.kid = !state.kid; saveState(); render(); });
$("t-mustgo").addEventListener("click", () => {
  if (locked("mustgo") && !state.mustgo) { openPaywall(); return; }
  state.mustgo = !state.mustgo; saveState(); render();
  if (lastVerdict) renderVerdict(lastVerdict);
});
// 판정이 노랑일 때의 "꼭 가야 하는 날 모드 켜기" — 위쪽 스위치를 누른 것과 같다
$("v-plan").addEventListener("click", () => $("t-mustgo").click());
// 이용권: 키 입력, 하단의 키 입력·해제, 잠긴 "덜 붐비는 날" 버튼
$("pw-form").addEventListener("submit", e => { e.preventDefault(); unlock($("pw-key").value); });
document.addEventListener("click", async e => {
  if (e.target.closest("#f-key, #c-lock")) { openPaywall(); return; }
  if (e.target.closest("#f-remove") && license) {
    await licenseRequest("DELETE", { key: license.key, instance: license.instance }); // 기기 수 제한 자리를 비운다
    license = null;
    try { localStorage.removeItem(LICENSE_KEY); } catch { /* 무시 */ }
    if (locked("mustgo")) { state.mustgo = false; saveState(); }
    render(); if (lastVerdict) renderVerdict(lastVerdict); renderLicenseFooter();
  }
});
// 제보: 입력·등록·빠른 문장·지우기
$("r-text").addEventListener("input", updateSendButton);
$("r-form").addEventListener("submit", e => { e.preventDefault(); addReport($("r-text").value); });
$("r-quick").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  // 바로 등록하지 않고 입력칸에 채워서, 확인하거나 덧붙인 뒤 등록하게 한다
  $("r-text").value = btn.textContent;
  $("r-text").focus();
  updateSendButton();
});
$("r-list").addEventListener("click", e => {
  const btn = e.target.closest(".del");
  if (!btn) return;
  btn.disabled = true;
  removeReport(btn.dataset.id).then(renderReports);
});
updateSendButton();

// 사진 누르면 크게 보기
document.addEventListener("click", e => {
  const btn = e.target.closest(".thumbs button");
  if (!btn) return;
  $("viewer-img").src = btn.dataset.src;
  $("viewer-img").alt = btn.dataset.cap;
  $("viewer-cap").textContent = btn.dataset.cap;
  $("viewer").showModal();
});

start();
