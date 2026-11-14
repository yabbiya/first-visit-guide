// 클릭 세기: 화면의 track.js 가 보내는 한 줄을 받아 "날짜별 횟수"만 1 더한다.
//   POST /api/event { ev, item, from, place, lang }  → 204 (응답 내용 없음)
// 저장 모양: 해시 fvg:ev:2026-11-14 안에 "cube_click|arex|-|-|en" → 3 처럼 숫자만. 400일 뒤 저절로 지워진다.
// 누가 눌렀는지(IP·쿠키·기기)는 저장하지 않는다. 장난으로 숫자를 부풀리는 것만 막으려고
// IP 의 한 방향 해시(되돌릴 수 없는 값)로 1분에 120번까지만 받는다 — 이 해시도 1분 뒤 지워진다.
import { createHash } from "node:crypto";
import places from "../places/index.json" with { type: "json" };
import { redis, redisReady, NS, kstDate } from "./_redis.js";

const PLACE_IDS = new Set(places.map(p => p.id));
const LANGS = new Set(["en", "zh", "ja", "ko"]);
const KEEP_SEC = 400 * 24 * 3600;
const RATE_MAX = 120;
// 받아 주는 값만 정해 둔다 (아무 글자나 저장소에 쌓이지 않게)
const RULES = {
  cube_click: { item: new Set(["map_pack", "arex", "esim", "wowpass"]), from: new Set([""]) },
  checkout_click: { item: new Set([""]), from: new Set(["top_cube", "bottom_card", "paywall"]) },
  klook_click: { item: /^[a-z0-9_]{1,20}$/, from: new Set(["ess_tab", "place_card", "place_memo"]) }
};
const allowed = (rule, v) => (rule instanceof RegExp ? rule.test(v) : rule.has(v));
const str = v => (typeof v === "string" ? v : "");
const done = (status = 204) => new Response(null, { status, headers: { "cache-control": "no-store" } });

export async function POST(request) {
  if (!redisReady()) return done(503);
  let b;
  try { b = JSON.parse(await request.text()); } catch { return done(400); }
  const ev = str(b?.ev), item = str(b?.item), from = str(b?.from);
  const rule = RULES[ev];
  if (!rule || !allowed(rule.item, item) || !allowed(rule.from, from)) return done(400);
  const place = PLACE_IDS.has(b.place) ? b.place : "-";
  const lang = LANGS.has(b.lang) ? b.lang : "-";

  const ip = (request.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = `${NS}evrl:${createHash("sha256").update(`ev:${ip}`).digest("hex").slice(0, 32)}`;
  try {
    const [count] = await redis(["INCR", rl], ["EXPIRE", rl, 60, "NX"]);
    if (count > RATE_MAX) return done(429);
    const key = `${NS}ev:${kstDate()}`;
    await redis(["HINCRBY", key, [ev, item || "-", from || "-", place, lang].join("|"), 1], ["EXPIRE", key, KEEP_SEC]);
  } catch (e) {
    console.error(e);
    return done(502);
  }
  return done();
}
