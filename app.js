// 먼저 다녀온 메모 — 화면 동작
// 장소 데이터는 places/<장소id>/place.json 에 있고, 이 파일에는 장소 전용 코드가 없다.

const TOP_COUNT = 4; // "꼭 봐야 할 메모"로 펼쳐 보여줄 카드 수
const STORE_KEY = "first-visit-guide:state";

const $ = id => document.getElementById(id);
const state = { lost: false, kid: false, mode: "transit" };
let place = null;

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

// ---------- 시험판 로직 (score / visible / briefText) ----------
function score(m) {
  let s = m.importance;
  if (state.lost && m.conditions.includes("lost")) s += 10;
  if (state.kid && m.conditions.includes("kid")) s += 8;
  if (m.conditions.includes(state.mode)) s += 6;
  return s;
}
function visible(m) {
  return !m.onlyMode || m.onlyMode === state.mode;
}
function matches(when) {
  if (when === "basic") return !state.lost && !state.kid;
  if (when === "car" || when === "transit") return state.mode === when;
  return state[when];
}
let weatherLine = ""; // 곧 비·눈 소식이 있으면 요약 맨 앞에 붙는 문장
function briefText() {
  const lines = place.summary.filter(s => matches(s.when)).map(s => s.text);
  if (weatherLine) lines.unshift(weatherLine);
  return lines.join(" ");
}

// ---------- 날씨 (서버 코드 /api/weather 가 기상청에 대신 물어봄) ----------
const WEATHER_FAIL = {
  "no-key": "인증키 설정 전",
  "key-not-ready": "키 등록 대기 중",
  "bad-location": "위치 정보 없음"
};
async function loadWeather() {
  const main = $("w-main"), sub = $("w-sub");
  if (place.lat === undefined) { main.textContent = "위치 정보 없음"; return; }
  try {
    const res = await fetch(`api/weather?lat=${place.lat}&lon=${place.lon}`);
    const w = await res.json();
    if (!w.ok) {
      main.textContent = WEATHER_FAIL[w.reason] ?? "불러오지 못함";
      sub.textContent = w.message;
      return;
    }
    const now = w.hours[0];
    main.textContent = `${now.temp}° ${now.rain ?? now.sky}`;
    const wet = w.hours.find(h => h.rain);
    sub.textContent = wet ? `${wet.time}쯤 ${wet.rain} 예보` : "6시간 안에 비 소식 없음";
    const soon = w.hours.slice(0, 3).find(h => h.rain);
    weatherLine = soon ? `${soon.time}쯤 ${soon.rain} 예보가 있어요. 우산을 챙기세요.` : "";
    if (weatherLine) render();
  } catch {
    main.textContent = "불러오지 못함";
    sub.textContent = "날씨 서버에 연결하지 못했어요.";
  }
}

// ---------- 그리기 ----------
function trustChip(label) {
  const cls = label.includes("엇갈") ? "mixed" : "check";
  return `<span class="chip ${cls}">${esc(label)}</span>`;
}
function photoBase() {
  return `places/${encodeURIComponent(place.id)}/`;
}
function memoHTML(m, open) {
  const chips = (m.trust || []).map(trustChip);
  if (state.lost && m.conditions.includes("lost")) chips.unshift('<span class="chip">길치 맞춤</span>');
  if (state.kid && m.conditions.includes("kid")) chips.unshift('<span class="chip">아이 동반</span>');
  const photos = (m.photos || []).map(ph => `
      <button type="button" data-src="${esc(photoBase() + ph.file)}" data-cap="${esc(ph.caption)} · ${esc(ph.credit)}">
        <img src="${esc(photoBase() + ph.file)}" alt="${esc(ph.caption)}" loading="lazy">
        <span>${esc(ph.caption)}</span>
      </button>`).join("");
  return `<li><details class="note${m.warn ? " warn" : ""}"${open ? " open" : ""}>
    <summary><h3>${esc(m.title)}</h3><span class="cat">${esc(m.category)}</span></summary>
    <div class="inner">
      <p>${esc(m.body)}</p>
      ${photos ? `<div class="thumbs">${photos}</div>` : ""}
      ${chips.length ? `<div class="chips">${chips.join("")}</div>` : ""}
      ${m.source ? `<span class="src">출처: ${esc(m.source)}</span>` : ""}
    </div>
  </details></li>`;
}
function render() {
  $("t-lost").setAttribute("aria-pressed", String(state.lost));
  $("t-kid").setAttribute("aria-pressed", String(state.kid));
  document.querySelectorAll("#t-mode button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode)));

  $("brief").textContent = briefText();
  const list = place.memos.filter(visible).sort((a, b) => score(b) - score(a));
  const top = list.slice(0, TOP_COUNT);
  const more = list.slice(TOP_COUNT);
  $("notes-top").innerHTML = top.map(m => memoHTML(m, true)).join("");
  $("notes-more").innerHTML = more.map(m => memoHTML(m, false)).join("");
  $("more-count").textContent = `${more.length}개 · 눌러서 펼치기`;
  $("more-wrap").hidden = more.length === 0;
}

function renderPlaceHeader() {
  document.title = `${place.name} · 먼저 다녀온 메모`;
  $("p-name").textContent = place.name;
  $("p-meta").textContent = [place.address, place.hours, place.fee].filter(Boolean).join(" · ");
  $("footer").innerHTML = [
    place.sources?.length ? `<span>메모 출처: ${esc(place.sources.join(", "))}.</span>` : "",
    `<span>'확인 필요' 표시는 후기가 오래됐거나 확인이 덜 된 정보, '후기 엇갈림'은 후기끼리 서로 다른 정보예요.</span>`,
    place.updated ? `<span>마지막 정리: ${esc(place.updated)}</span>` : ""
  ].join("");
}

// ---------- 방문자 한 줄 제보 ----------
// 저장소를 바꿀 때(브라우저 → 서버) 이 두 함수만 고치면 되도록 묶어 둔다.
const REPORT_FRESH = 3 * 3600 * 1000;   // 3시간 안 제보만 "지금" 정보로 본다
const REPORT_KEEP = 24 * 3600 * 1000;   // 24시간 지나면 지운다
const reportKey = () => `first-visit-guide:reports:${place.id}`;

function loadReports() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(reportKey())) || []; } catch { /* 저장소를 못 쓰면 빈 목록 */ }
  const now = Date.now();
  return list.filter(r => now - new Date(r.at).getTime() < REPORT_KEEP);
}
function saveReports(list) {
  try { localStorage.setItem(reportKey(), JSON.stringify(list)); return true; } catch { return false; }
}

function ago(at) {
  const min = Math.floor((Date.now() - new Date(at).getTime()) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}

function renderReports() {
  const list = loadReports().sort((a, b) => b.at.localeCompare(a.at));
  saveReports(list); // 24시간 지난 제보 정리
  const fresh = list.filter(r => Date.now() - new Date(r.at).getTime() < REPORT_FRESH);
  $("r-main").textContent = `제보 ${fresh.length}건`;
  $("r-sub").textContent = fresh.length ? `"${fresh[0].text}" · ${ago(fresh[0].at)}` : "최근 3시간 방문자 제보";
  $("r-list").innerHTML = list.length
    ? list.map(r => {
        const old = Date.now() - new Date(r.at).getTime() >= REPORT_FRESH;
        return `<li${old ? ' class="old"' : ""}>
          <span class="txt">${esc(r.text)}</span>
          <time datetime="${esc(r.at)}">${ago(r.at)}${old ? " · 오래됨" : ""}</time>
          <button type="button" class="del" data-id="${esc(r.id)}" aria-label="이 제보 지우기">지우기</button>
        </li>`;
      }).join("")
    : `<li class="empty">아직 제보가 없어요. 도착하면 지금 상황을 한 줄로 남겨 주세요.</li>`;
}

function addReport(text) {
  text = text.trim().slice(0, 40);
  if (!text) return;
  const list = loadReports();
  list.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, placeId: place.id, text, at: new Date().toISOString() });
  if (!saveReports(list)) alert("이 브라우저에서는 제보를 저장할 수 없어요. (사생활 보호 모드인지 확인해 주세요)");
  $("r-text").value = "";
  updateSendButton();
  renderReports();
}
function updateSendButton() {
  $("r-send").disabled = !$("r-text").value.trim();
}

// ---------- 장소 고르기 화면 ----------
function showPicker(places) {
  $("picker").hidden = false;
  const draw = () => {
    const word = $("search").value.trim();
    const found = places.filter(p => !word || `${p.name} ${p.region} ${p.address}`.includes(word));
    $("place-list").innerHTML = found.length
      ? found.map(p => `<li><a href="?place=${encodeURIComponent(p.id)}"><b>${esc(p.name)}</b><span>${esc(p.address)}</span></a></li>`).join("")
      : `<li class="empty">'${esc(word)}'에 맞는 장소가 아직 없어요.</li>`;
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
  try {
    const places = await getJSON("places/index.json");
    const id = new URLSearchParams(location.search).get("place");
    if (!id && places.length !== 1) { showPicker(places); return; }

    const placeId = id || places[0].id;
    if (!places.some(p => p.id === placeId)) throw new Error(`목록에 없는 장소: ${placeId}`);
    place = await getJSON(`places/${encodeURIComponent(placeId)}/place.json`);

    loadState();
    $("back").hidden = places.length <= 1;
    $("place").hidden = false;
    renderPlaceHeader();
    render();
    loadWeather();
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
  saveReports(loadReports().filter(r => r.id !== btn.dataset.id));
  renderReports();
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
