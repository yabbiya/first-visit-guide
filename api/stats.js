// 클릭 결과 보기 (운영자 전용): https://first-visit-korea-guide.vercel.app/api/stats
//   브라우저가 아이디·비밀번호 창을 띄운다 → 아이디는 아무거나, 비밀번호 = Vercel 환경변수 STATS_KEY
//   ?days=7 처럼 기간(1~120일, 기본 30일), ?format=json 이면 숫자만 JSON 으로
// 비밀번호를 주소(?key=…)에 넣지 않은 까닭: 주소는 방문 기록·서버 기록에 그대로 남기 때문.
// 보여 주는 것: 큐브 면별 클릭, 결제 버튼 클릭(어디서 눌렀는지), Klook 링크 클릭, 그리고
// "지도팩 면을 누른 사람 중 결제 버튼까지 누른 비율". 실제 결제 건수는 Lemon Squeezy 주문 화면에서 본다
// (결제 링크에 utm_content·checkout[custom][source] 로 어디서 왔는지가 붙어 간다).
import { createHash, timingSafeEqual } from "node:crypto";
import { redis, redisReady, NS, kstDate } from "./_redis.js";

const sha = s => createHash("sha256").update(String(s)).digest();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const NAMES = {
  cube_click: "상단 큐브 클릭", checkout_click: "결제 버튼 클릭", klook_click: "Klook 링크 클릭",
  map_pack: "네이버 지도팩", arex: "공항철도", esim: "eSIM", wowpass: "WOWPASS", hanbok: "한복 대여", nseoul: "N서울타워", lotte: "롯데월드",
  top_cube: "상단 큐브 → 안내 창", bottom_card: "장소 화면 카드", paywall: "이용권 창",
  ess_tab: "준비물 탭", place_card: "장소 화면 카드", place_memo: "장소 메모 안"
};
const name = k => NAMES[k] ?? k;

function text(body, status, headers = {}) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...headers } });
}
function authorized(request) {
  const want = process.env.STATS_KEY;
  const h = request.headers.get("authorization") || "";
  if (!want || !h.startsWith("Basic ")) return false;
  let pass = "";
  try { pass = atob(h.slice(6)).split(":").slice(1).join(":"); } catch { return false; }
  return timingSafeEqual(sha(pass), sha(want)); // 글자 수·내용에 따라 걸리는 시간이 달라지지 않게
}

export async function GET(request) {
  if (!process.env.STATS_KEY) return text("STATS_KEY 환경변수가 아직 없어요. Vercel > Settings > Environment Variables 에 넣은 뒤 다시 배포하세요.", 503);
  if (!authorized(request)) return text("비밀번호가 필요해요.", 401, { "www-authenticate": 'Basic realm="First Visit Korea stats", charset="UTF-8"' });
  if (!redisReady()) return text("저장소(Upstash Redis)가 연결되지 않았어요.", 503);

  const q = new URL(request.url).searchParams;
  const days = Math.min(120, Math.max(1, Number.parseInt(q.get("days") ?? "30", 10) || 30));
  const dates = Array.from({ length: days }, (_, i) => kstDate(Date.now() - i * 86400 * 1000));
  let raw;
  try { raw = await redis(...dates.map(d => ["HGETALL", `${NS}ev:${d}`])); }
  catch (e) { console.error(e); return text("저장소를 읽지 못했어요.", 502); }

  // HGETALL 결과는 [이름, 값, 이름, 값 …] 모양
  const rows = [];
  raw.forEach((flat, i) => {
    for (let k = 0; k + 1 < (flat?.length ?? 0); k += 2) {
      const [ev, item, from, place, lang] = String(flat[k]).split("|");
      rows.push({ date: dates[i], ev, item, from, place, lang, n: Number(flat[k + 1]) || 0 });
    }
  });
  const sum = (pick, keyOf) => {
    const m = new Map();
    for (const r of rows.filter(pick)) m.set(keyOf(r), (m.get(keyOf(r)) ?? 0) + r.n);
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const total = pick => rows.filter(pick).reduce((a, r) => a + r.n, 0);
  const cube = sum(r => r.ev === "cube_click", r => r.item);
  const checkout = sum(r => r.ev === "checkout_click", r => r.from);
  const klook = sum(r => r.ev === "klook_click", r => `${r.item}|${r.from}`);
  const byLang = sum(() => true, r => `${r.ev}|${r.lang}`);
  const mapClicks = total(r => r.ev === "cube_click" && r.item === "map_pack");
  const topCheckout = total(r => r.ev === "checkout_click" && r.from === "top_cube");
  const rate = mapClicks ? `${((topCheckout / mapClicks) * 100).toFixed(1)}%` : "—";
  const summary = { days, from: dates.at(-1), to: dates[0], mapPack: { cubeClicks: mapClicks, checkoutClicks: topCheckout, rate },
    cube: Object.fromEntries(cube), checkout: Object.fromEntries(checkout), klook: Object.fromEntries(klook), byLang: Object.fromEntries(byLang) };

  if (q.get("format") === "json") {
    return new Response(JSON.stringify(summary, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  }
  const table = (title, list, label) => `<h2>${esc(title)}</h2>${list.length
    ? `<table>${list.map(([k, n]) => `<tr><td>${esc(label(k))}</td><td>${n}</td></tr>`).join("")}</table>`
    : "<p class=muted>아직 기록이 없어요.</p>"}`;
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>클릭 통계 | First Visit Korea</title>
<style>body{font:15px/1.6 system-ui,sans-serif;max-width:560px;margin:0 auto;padding:20px 16px;color:#111;background:#fff}h1{font-size:22px;margin:0}h2{font-size:16px;margin:28px 0 8px}table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #eee}td:last-child{text-align:right;font-weight:700}.muted{color:#666;font-size:13px}.big{font-size:28px;font-weight:800;color:#2563EB;margin:4px 0}.links a{margin-right:12px}</style>
<h1>클릭 통계</h1>
<p class=muted>${esc(summary.from)} ~ ${esc(summary.to)} (한국 날짜, ${days}일) · <span class=links><a href="?days=7">7일</a><a href="?days=30">30일</a><a href="?days=120">120일</a><a href="?days=${days}&format=json">JSON</a></span></p>
<h2>네이버 지도팩: 큐브 → 결제 버튼</h2>
<p class=big>${esc(rate)}</p>
<p class=muted>큐브의 지도팩 면 ${mapClicks}번 → 안내 창의 결제 버튼 ${topCheckout}번. 실제 결제 건수는 Lemon Squeezy 주문 화면에서 확인 (utm_content 로 경로 구분).</p>
${table("상단 큐브 (면별)", cube, name)}
${table("결제 버튼 (어디서 눌렀나)", checkout, name)}
${table("Klook 링크 (상품 · 어디서)", klook, k => { const [i, f] = k.split("|"); return `${name(i)} · ${name(f)}`; })}
${table("언어별", byLang, k => { const [e, l] = k.split("|"); return `${name(e)} · ${l === "-" ? "언어 모름" : l}`; })}
<p class=muted>누가 눌렀는지는 저장하지 않고 횟수만 셉니다. 같은 사람이 여러 번 누르면 여러 번으로 셉니다.</p>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
