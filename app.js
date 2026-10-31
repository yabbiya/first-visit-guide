// 먼저 다녀온 메모 — 화면 동작
// 장소 데이터는 places/<장소id>/place.json 에 있고, 이 파일에는 장소 전용 코드가 없다.

const TOP_COUNT = 3; // "꼭 기억할 3가지"로 보여줄 메모 수 (아래 목록에는 다시 나오지 않음)
const STORE_KEY = "first-visit-guide:state";

const $ = id => document.getElementById(id);
const state = { lost: false, kid: false, mode: "transit" };
let place = null;

// ---------- 언어: 주소의 ?lang= > 전에 고른 언어 > 휴대폰 언어 > 영어 ----------
// 글자는 ui-text.js(화면)와 places/<장소>/i18n.json(장소 메모)에 있다. 번역이 없으면 한국어를 그대로 보여준다.
const LANG_KEY = "first-visit-guide:lang";
function pickLang() {
  const ids = LANGS.map(l => l.id);
  const q = new URLSearchParams(location.search).get("lang");
  if (ids.includes(q)) {
    try { localStorage.setItem(LANG_KEY, q); } catch { /* 무시 */ }
    return q;
  }
  try { const saved = localStorage.getItem(LANG_KEY); if (ids.includes(saved)) return saved; } catch { /* 무시 */ }
  for (const l of navigator.languages ?? [navigator.language]) {
    const two = String(l).slice(0, 2).toLowerCase();
    if (ids.includes(two)) return two;
  }
  return "en";
}
const lang = pickLang();
const T = UI[lang];
const foreign = lang !== "ko";
let placeT = null; // 이 장소의 번역 (i18n.json 에서 고른 언어 부분, 없으면 null)

function t(key, ...args) {
  const v = T[key] ?? UI.ko[key];
  return typeof v === "function" ? v(...args) : v;
}
// 한국어 낱말 → 번역 (메모 분류, 확인 필요 표시, 날씨 등). 없으면 한국어 그대로
const word = (group, k) => T[group]?.[k] ?? k;
// 사진 출처 글자 안의 기관·라이선스 이름만 번역 (촬영자 이름은 그대로)
const credit = c => Object.entries(T.credits ?? {}).reduce((out, [ko, tr]) => out.replaceAll(ko, tr), c);

function applyStaticText() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  document.title = t("appName");
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const [key, i] = el.dataset.i18n.split(".");
    el.textContent = i === undefined ? t(key) : t(key)[Number(i)];
  });
  document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  // 언어 버튼: 지금 주소를 그대로 두고 lang 만 바꾼 링크
  document.querySelectorAll("[data-langs]").forEach(nav => {
    nav.innerHTML = LANGS.map(l => {
      const q = new URLSearchParams(location.search);
      q.set("lang", l.id);
      return `<a href="?${esc(q.toString())}" hreflang="${l.id}"${l.id === lang ? ' aria-current="true"' : ""}>${esc(l.label)}</a>`;
    }).join("");
  });
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
  if (q.has("lost")) state.lost = q.get("lost") === "1";
  if (q.has("kid")) state.kid = q.get("kid") === "1";
  if (q.get("mode") === "car" || q.get("mode") === "transit") state.mode = q.get("mode");
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* 무시 */ }
  const q = new URLSearchParams(location.search);
  q.set("lost", state.lost ? "1" : "0");
  q.set("kid", state.kid ? "1" : "0");
  q.set("mode", state.mode);
  history.replaceState(null, "", "?" + q.toString());
}

// ---------- 시험판 로직 (score / visible) ----------
function score(m) {
  let s = m.importance;
  if (state.lost && m.conditions.includes("lost")) s += 10;
  if (state.kid && m.conditions.includes("kid")) s += 8;
  if (m.conditions.includes(state.mode)) s += 6;
  if (foreign && m.conditions.includes("foreign")) s += 10; // 외국어로 볼 때는 외국인에게 필요한 메모를 앞으로
  return s;
}
function visible(m) {
  if (m.audience === "foreign" && !foreign) return false; // 외국인 전용 메모는 한국어 화면에서 숨김
  return !m.onlyMode || m.onlyMode === state.mode;
}
// ---------- 오늘 붐빔 예측 (서버 코드 /api/crowd 가 한국관광공사에 대신 물어봄) ----------
// 점수는 "그 장소가 가장 붐빌 때 = 100"인 상대 점수라 숫자만으로는 감이 안 온다.
// 그래서 그 장소의 앞으로 30일과 비교해 오늘이 어느 쪽인지 보여주고, 일주일 안의 덜 붐비는 날을 알려준다.
function kstToday() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
function shortDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return t("shortDate", d.getUTCMonth() + 1, d.getUTCDate(), T.weekdays[d.getUTCDay()]);
}
// 쉬는 요일은 사람이 없어서 예측 점수가 낮게 나온다.
// 그대로 두면 "문 닫는 날에 가세요"라고 추천하게 되므로, 쉬는 요일은 비교와 추천에서 뺀다.
function weekdayOf(iso) {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}
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
async function loadCrowd() {
  if (!place.crowd) return; // 관광공사 목록에 없는 장소는 표시하지 않음
  const { area, signgu, name } = place.crowd;
  try {
    const c = await fetchWithRetry(`api/crowd?area=${area}&signgu=${signgu}&name=${encodeURIComponent(name)}`);
    if (!c.ok || c.empty) return;
    const j = judgeCrowd(c.days, kstToday(), place.closedWeekdays ?? []);
    if (!j) return;
    $("c-main").textContent = T.crowd[j.level];
    const better = t("betterDays", j.better.map(d => shortDate(d.date)).join(" · "));
    $("c-sub").textContent = j.level === "closed"
      ? (j.better.length ? better : "")
      : j.level === "calm"
      ? t("calmOf", j.n)
      : j.better.length ? better : t("todayBest");
    $("crowd").classList.toggle("busy", j.level === "busy" || j.level === "closed");
    $("crowd").hidden = false;
  } catch { /* 예측을 못 불러오면 줄을 숨긴 채로 둔다 */ }
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
  if (place.lat === undefined) { main.textContent = t("wxNoLoc"); return; }
  try {
    const w = await fetchWithRetry(`api/weather?lat=${place.lat}&lon=${place.lon}`);
    if (!w.ok) {
      main.textContent = T.wxFail[w.reason] ?? t("wxCantLoad");
      sub.textContent = foreign ? "" : w.message;
      return;
    }
    const now = w.hours[0];
    main.textContent = `${now.temp}° ${now.rain ? word("rain", now.rain) : word("sky", now.sky)}`;
    const wet = w.hours.find(h => h.rain);
    sub.textContent = wet ? t("wxWet", wet.time, word("rain", wet.rain)) : t("wxDry");
    $("w-icon").textContent = weatherIcon(now);
    $("wx").classList.toggle("wet", Boolean(wet));
  } catch {
    main.textContent = t("wxCantLoad");
    sub.textContent = t("wxNoServer");
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
  if (state.lost && m.conditions.includes("lost")) chips.unshift(`<span class="chip">${esc(t("chipLost"))}</span>`);
  if (state.kid && m.conditions.includes("kid")) chips.unshift(`<span class="chip">${esc(t("chipKid"))}</span>`);
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
  $("t-lost").setAttribute("aria-pressed", String(state.lost));
  $("t-kid").setAttribute("aria-pressed", String(state.kid));
  document.querySelectorAll("#t-mode button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode)));

  // "pin": true 인 메모(출입에 꼭 필요한 것 등)는 스위치와 상관없이 항상 맨 앞에 둔다
  const ranked = place.memos.filter(visible).sort((a, b) => score(b) - score(a));
  const list = [...ranked.filter(m => m.pin), ...ranked.filter(m => !m.pin)];
  const topCount = Math.max(TOP_COUNT, ranked.filter(m => m.pin).length);
  const top = list.slice(0, topCount);
  const more = list.slice(topCount);
  // 핵심 3가지는 제목만 보이고 누르면 그 자리에서 펼쳐진다
  $("brief-title").textContent = t("briefTitle", top.length); // 예: 2개면 "꼭 기억할 2가지"
  $("notes-top").innerHTML = top.map((m, i) => memoHTML(m, false, i + 1)).join("");
  $("notes-more").innerHTML = more.map(m => memoHTML(m, false)).join("");
  $("more-count").textContent = t("moreCount", more.length);
  $("more-wrap").hidden = more.length === 0;
}

function renderPlaceHeader() {
  const name = placeT?.name ?? place.name;
  document.title = `${name} · ${t("appName")}`;
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
    $("kr-card").hidden = false;
    $("ai-note").textContent = placeT?.memos ? t("aiNote") : t("notTranslated");
    $("ai-note").hidden = false;
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

async function renderReports() {
  const list = (await loadReports()).sort((a, b) => b.at.localeCompare(a.at));
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

// ---------- 장소 고르기 화면 ----------
// 사진 카드 하나: 사진 위에 "월 휴무"·"후원 예약 필요" 같은 꼭 알아야 할 표시를 얹는다
function placeCard(p) {
  const tr = p.i18n?.[lang];
  const notice = tr?.notice ?? p.notice;
  const chips = [
    ...(p.closedWeekdays ?? []).map(d => t("closedDay", T.weekdays[d])),
    ...(notice ? [notice] : [])
  ].map(c => `<span class="pchip">${esc(c)}</span>`).join("");
  const img = p.cover
    ? `style="background-image:url('${encodeURI(`places/${p.id}/${p.cover.file}`)}');background-position:${esc(p.cover.position ?? "center")}"`
    : "";
  return `<a class="pcard" href="?place=${encodeURIComponent(p.id)}&lang=${lang}">
    <div class="pimg${p.cover ? "" : " noimg"}" ${img}>${chips ? `<div class="pchips">${chips}</div>` : ""}</div>
    <b>${esc(tr?.name ?? p.name)}</b><span>${esc(tr?.region ?? p.region)}</span>
  </a>`;
}

function showPicker(places, categories) {
  $("picker").hidden = false;
  // 카테고리마다 사진 카드 한 줄 (좌우로 넘김)
  $("sections").innerHTML = categories.map(c => {
    const inCat = places.filter(p => p.categories?.includes(c.id));
    if (!inCat.length) return "";
    const catName = T.cats?.[c.id] ?? c.name;
    return `<section class="cat-row" aria-label="${esc(catName)}">
      <h2>${esc(catName)} <small>${esc(t("count", inCat.length))}</small></h2>
      <div class="row">${inCat.map(placeCard).join("")}</div>
    </section>`;
  }).join("");

  const draw = () => {
    const q = $("search").value.trim();
    $("sections").hidden = Boolean(q);
    $("search-results").hidden = !q;
    if (!q) return;
    // 한국어 이름과 번역된 이름 모두에서 찾는다
    const found = places.filter(p => {
      const tr = p.i18n?.[lang] ?? {};
      return `${p.name} ${p.region} ${p.address} ${tr.name ?? ""} ${tr.region ?? ""}`.toLowerCase().includes(q.toLowerCase());
    });
    $("search-results").innerHTML = found.length
      ? `<div class="grid">${found.map(placeCard).join("")}</div>`
      : `<p class="empty">${esc(t("searchEmpty", q))}</p>`;
  };
  $("search").addEventListener("input", draw);
  draw();
}

// ---------- 장소 화면 첫 방문 코치마크 ----------
// 글로 길게 설명하는 대신, 위쪽 버튼 4개를 강조 테두리와 화살표로 짚고 아주 짧은 말풍선만 단다.
// 버튼 자리는 언어·화면 너비에 따라 바뀌므로(좁으면 상단 바가 두 줄) 숫자로 박지 않고 매번 실제 자리를 잰다.
// 한 번 닫으면 이 브라우저에서는 다시 안 뜬다.
const COACH_KEY = "first-visit-guide:coach-seen";
const SVG_NS = "http://www.w3.org/2000/svg";

function setupCoach() {
  if (readStore(COACH_KEY, false)) return;
  const dlg = $("coach");
  const items = [
    { el: $("t-lost"), key: "coachLost", name: t("lost") },
    { el: $("t-kid"), key: "coachKid", name: t("kid") },
    { el: $("t-mode"), key: "coachMode", name: t("modeLabel") },
    { el: document.querySelector("#place .langs"), key: "coachLang", name: "Language" }
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

  // 4) 알겠어요 버튼: 말풍선들 아래 가운데. 화면이 아주 낮으면 아래 끝에 붙인다.
  const ok = $("coach-ok");
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
    const id = new URLSearchParams(location.search).get("place");
    if (!id && places.length !== 1) {
      showPicker(places, await getJSON("places/categories.json"));
      return;
    }

    const placeId = id || places[0].id;
    if (!places.some(p => p.id === placeId)) throw new Error(`목록에 없는 장소: ${placeId}`);
    place = await getJSON(`places/${encodeURIComponent(placeId)}/place.json`);
    if (foreign) {
      try { placeT = (await getJSON(`places/${encodeURIComponent(placeId)}/i18n.json`))[lang] ?? null; }
      catch { placeT = null; } // 아직 번역 안 된 장소 → 한국어 그대로
    }

    loadState();
    $("back").hidden = places.length <= 1;
    $("place").hidden = false;
    renderPlaceHeader();
    render();
    loadWeather();
    loadCrowd();
    renderReports();
    setInterval(renderReports, 60 * 1000); // "○분 전" 표시를 1분마다 새로 고침
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
$("t-lost").addEventListener("click", () => { state.lost = !state.lost; saveState(); render(); });
$("t-kid").addEventListener("click", () => { state.kid = !state.kid; saveState(); render(); });
document.querySelectorAll("#t-mode button").forEach(b => b.addEventListener("click", () => {
  state.mode = b.dataset.mode; saveState(); render();
}));
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
