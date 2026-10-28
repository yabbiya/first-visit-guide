// 먼저 다녀온 메모 — 화면 동작
// 장소 데이터는 places/<장소id>/place.json 에 있고, 이 파일에는 장소 전용 코드가 없다.

const TOP_COUNT = 3; // "꼭 기억할 3가지"로 보여줄 메모 수 (아래 목록에는 다시 나오지 않음)
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

// ---------- 시험판 로직 (score / visible) ----------
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
// 자차일 때 주변 도로가 막히면 "꼭 기억할 3가지" 위에 붙는 안내
// (비 소식은 날씨 줄에서 이미 강조하므로 여기서 반복하지 않는다)
let trafficLine = "";

// ---------- 주변 도로 (서버 코드 /api/traffic 이 국가교통정보센터에 대신 물어봄) ----------
const TRAFFIC_FAIL = {
  "no-key": "인증키 설정 전",
  "key-not-ready": "키 등록 대기 중",
  "bad-location": "위치 정보 없음"
};
async function loadTraffic() {
  const main = $("t-main"), sub = $("t-sub");
  if (place.lat === undefined) { main.textContent = "위치 정보 없음"; return; }
  try {
    const t = await fetchWithRetry(`api/traffic?lat=${place.lat}&lon=${place.lon}`);
    if (!t.ok) {
      main.textContent = TRAFFIC_FAIL[t.reason] ?? "불러오지 못함";
      sub.textContent = t.message;
      return;
    }
    if (t.empty) { main.textContent = "정보 없음"; sub.textContent = "주변에 수집되는 도로가 없어요"; return; }
    main.textContent = `${t.level} · ${t.speed}km/h`;
    const slow = t.slowest[0];
    sub.textContent = slow ? `가장 느린 길: ${slow.name} ${slow.speed}km/h` : "주변 도로 중간 속도";
    trafficLine = t.level === "정체"
      ? `지금 주변 도로가 막혀요(${slow ? slow.name + " " : ""}${slow ? slow.speed : t.speed}km/h). 시간을 넉넉히 잡으세요.`
      : "";
    if (trafficLine) render();
  } catch {
    main.textContent = "불러오지 못함";
    sub.textContent = "도로 정보 서버에 연결하지 못했어요.";
  }
}

// ---------- 날씨 (서버 코드 /api/weather 가 기상청에 대신 물어봄) ----------
const WEATHER_FAIL = {
  "no-key": "인증키 설정 전",
  "key-not-ready": "키 등록 대기 중",
  "bad-location": "위치 정보 없음"
};
function weatherIcon(h) {
  if (h.rain) return h.rain.includes("눈") ? "🌨️" : "🌧️";
  return { "맑음": "☀️", "구름 많음": "⛅", "흐림": "☁️" }[h.sky] ?? "🌡️";
}
// 기상청·교통정보센터는 가끔 일시적으로 실패하므로, 연결 문제일 때는 잠시 뒤 한 번 더 물어본다
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
  if (place.lat === undefined) { main.textContent = "위치 정보 없음"; return; }
  try {
    const w = await fetchWithRetry(`api/weather?lat=${place.lat}&lon=${place.lon}`);
    if (!w.ok) {
      main.textContent = WEATHER_FAIL[w.reason] ?? "불러오지 못함";
      sub.textContent = w.message;
      return;
    }
    const now = w.hours[0];
    main.textContent = `${now.temp}° ${now.rain ?? now.sky}`;
    const wet = w.hours.find(h => h.rain);
    sub.textContent = wet ? `${wet.time}쯤 ${wet.rain} 예보 · 우산 챙기세요` : "6시간 안에 비 소식 없음";
    $("w-icon").textContent = weatherIcon(now);
    $("wx").classList.toggle("wet", Boolean(wet));
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
function memoHTML(m, open, num) {
  const chips = (m.trust || []).map(trustChip);
  if (state.lost && m.conditions.includes("lost")) chips.unshift('<span class="chip">길치 맞춤</span>');
  if (state.kid && m.conditions.includes("kid")) chips.unshift('<span class="chip">아이 동반</span>');
  const photos = (m.photos || []).map(ph => `
      <button type="button" data-src="${esc(photoBase() + ph.file)}" data-cap="${esc(ph.caption)} · ${esc(ph.credit)}">
        <img src="${esc(photoBase() + ph.file)}" alt="${esc(ph.caption)}" loading="lazy">
        <span>${esc(ph.caption)}</span>
      </button>`).join("");
  return `<li><details class="note${m.warn ? " warn" : ""}"${open ? " open" : ""}>
    <summary>${num ? `<span class="num" aria-hidden="true">${num}</span>` : ""}<h3>${esc(m.title)}</h3><span class="cat">${esc(m.category)}</span></summary>
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

  const showAlert = Boolean(trafficLine) && state.mode === "car";
  $("brief-alert").hidden = !showAlert;
  $("brief-alert").textContent = showAlert ? `🚗 ${trafficLine}` : "";

  const list = place.memos.filter(visible).sort((a, b) => score(b) - score(a));
  const top = list.slice(0, TOP_COUNT);
  const more = list.slice(TOP_COUNT);
  // 핵심 3가지는 제목만 보이고 누르면 그 자리에서 펼쳐진다
  $("notes-top").innerHTML = top.map((m, i) => memoHTML(m, false, i + 1)).join("");
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
    if (!writeStore(localKey(), list)) return "이 브라우저에서는 제보를 저장할 수 없어요. (사생활 보호 모드인지 확인해 주세요)";
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
    return "제보를 보내지 못했어요. 인터넷 연결을 확인해 주세요.";
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
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}

async function renderReports() {
  const list = (await loadReports()).sort((a, b) => b.at.localeCompare(a.at));
  const mine = readStore(MINE_KEY, {});
  $("r-note").textContent = shared
    ? "모든 방문자에게 보이고 24시간 뒤 사라져요. 전화번호 같은 개인정보는 쓰지 마세요."
    : "지금은 이 휴대폰(브라우저)에만 저장돼요. 다른 사람에게는 보이지 않아요.";
  const fresh = list.filter(r => Date.now() - new Date(r.at).getTime() < REPORT_FRESH);
  $("r-main").textContent = `제보 ${fresh.length}건`;
  $("r-sub").textContent = fresh.length ? `"${fresh[0].text}" · ${ago(fresh[0].at)}` : "최근 3시간 방문자 제보";
  $("r-list").innerHTML = list.length
    ? list.map(r => {
        const old = Date.now() - new Date(r.at).getTime() >= REPORT_FRESH;
        return `<li${old ? ' class="old"' : ""}>
          <span class="txt">${esc(r.text)}</span>
          <time datetime="${esc(r.at)}">${ago(r.at)}${old ? " · 오래됨" : ""}</time>
          ${!shared || mine[r.id] ? `<button type="button" class="del" data-id="${esc(r.id)}" aria-label="이 제보 지우기">지우기</button>` : ""}
        </li>`;
      }).join("")
    : `<li class="empty">아직 제보가 없어요. 도착하면 지금 상황을 한 줄로 남겨 주세요.</li>`;
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
    loadTraffic();
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
