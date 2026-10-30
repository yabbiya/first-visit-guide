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
  return `<li><details class="note${m.warn ? " warn" : ""}"${open ? " open" : ""}>
    <summary>${num ? `<span class="num" aria-hidden="true">${num}</span>` : ""}<h3>${esc(title)}</h3><span class="cat">${esc(word("memoCat", m.category))}</span><span class="chev" aria-hidden="true"></span></summary>
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
  $("footer").innerHTML = [
    place.sources?.length ? `<span>${esc(t("fSources", place.sources.join(", ")))}</span>` : "",
    `<span>${esc(t("fTrust"))}</span>`,
    place.cover ? `<span>${esc(t("fCover", credit(place.cover.credit), credit(place.cover.license)))} <a href="${esc(place.cover.link)}" target="_blank" rel="noopener">${esc(t("fOriginal"))}</a></span>` : "",
    place.updated ? `<span>${esc(t("fUpdated", place.updated))}</span>` : ""
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
  } catch (e) {
    console.error(e);
    $("error").hidden = false;
  }
}

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
