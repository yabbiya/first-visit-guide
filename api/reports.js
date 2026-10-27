// 방문자 한 줄 제보를 모든 방문자와 나누는 서버 코드 (Upstash Redis 사용).
//   GET    /api/reports?place=seoul-forest          → 최근 24시간 제보 목록
//   POST   /api/reports  { place, text, token }      → 제보 등록
//   DELETE /api/reports  { place, id, token }        → 내가 쓴 제보 지우기
// 저장소 연결 정보는 Vercel이 넣어주는 환경변수에서 읽는다 (코드에 쓰지 않음).
import { createHash } from "node:crypto";
import places from "../places/index.json" with { type: "json" };

const KEEP_MS = 24 * 3600 * 1000; // 24시간 지나면 지운다
const MAX_LEN = 40;
const RATE_SEC = 60;              // 같은 사람은 1분에 한 번만
const MAX_LIST = 50;
const PLACE_IDS = new Set(places.map(p => p.id));

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// 명령 여러 개를 한 번에 보낸다 (Upstash REST pipeline)
async function redis(...commands) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const out = await res.json();
  const failed = out.find(r => r.error);
  if (failed) throw new Error(`Redis: ${failed.error}`);
  return out.map(r => r.result);
}

const sha = s => createHash("sha256").update(s).digest("hex");

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
const fail = (status, reason, message) => reply({ ok: false, reason, message }, status);

// 글 다듬기: 줄바꿈·제어문자 제거, 공백 정리, 40자 제한
function cleanText(raw) {
  return String(raw ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

function checkSetup() {
  if (!REDIS_URL || !REDIS_TOKEN) return fail(503, "no-store", "제보 저장소가 아직 연결되지 않았어요.");
  return null;
}

export async function GET(request) {
  const notReady = checkSetup();
  if (notReady) return notReady;
  const place = new URL(request.url).searchParams.get("place");
  if (!PLACE_IDS.has(place)) return fail(400, "bad-place", "없는 장소예요.");

  const key = `reports:${place}`;
  const [, list] = await redis(
    ["ZREMRANGEBYSCORE", key, "-inf", String(Date.now() - KEEP_MS)], // 오래된 제보 정리
    ["ZRANGE", key, String(-MAX_LIST), "-1"]
  );
  const reports = list.map(s => JSON.parse(s)).reverse(); // 최신순
  return reply({ ok: true, reports });
}

export async function POST(request) {
  const notReady = checkSetup();
  if (notReady) return notReady;
  const { place, text: raw, token } = await readBody(request);
  if (!PLACE_IDS.has(place)) return fail(400, "bad-place", "없는 장소예요.");
  const text = cleanText(raw);
  if (!text) return fail(400, "empty", "제보 내용을 적어 주세요.");
  if (text.length > MAX_LEN) return fail(400, "too-long", `${MAX_LEN}자까지 쓸 수 있어요.`);
  if (/https?:|www\.|\.com|\.kr/i.test(text)) return fail(400, "link", "링크는 제보에 넣을 수 없어요.");
  if (typeof token !== "string" || token.length < 16) return fail(400, "bad-token", "다시 시도해 주세요.");

  // 도배 방지: 접속 주소(IP)는 그대로 저장하지 않고 알아볼 수 없게 바꾼 값으로 1분만 기억한다
  const ip = (request.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const [allowed] = await redis(["SET", `rate:${sha("fvg:" + ip)}`, "1", "NX", "EX", String(RATE_SEC)]);
  if (allowed !== "OK") return fail(429, "too-fast", "제보는 1분에 한 번만 남길 수 있어요. 잠시 뒤 다시 해 주세요.");

  const now = Date.now();
  const report = { id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`, text, at: new Date(now).toISOString() };
  const member = JSON.stringify(report);
  const key = `reports:${place}`;
  const ttl = String(KEEP_MS / 1000);
  await redis(
    ["ZADD", key, String(now), member],
    ["EXPIRE", key, ttl],
    // 지우기용: 누가 썼는지 대신 "비밀 표시의 지문"만 저장
    ["SET", `report:${report.id}`, JSON.stringify({ owner: sha(token), member, key }), "EX", ttl]
  );
  return reply({ ok: true, report }, 201);
}

export async function DELETE(request) {
  const notReady = checkSetup();
  if (notReady) return notReady;
  const { id, token } = await readBody(request);
  if (typeof id !== "string" || typeof token !== "string") return fail(400, "bad-request", "잘못된 요청이에요.");

  const [saved] = await redis(["GET", `report:${id}`]);
  if (!saved) return reply({ ok: true }); // 이미 지워졌거나 24시간이 지남
  const { owner, member, key } = JSON.parse(saved);
  if (owner !== sha(token)) return fail(403, "not-owner", "내가 쓴 제보만 지울 수 있어요.");
  await redis(["ZREM", key, member], ["DEL", `report:${id}`]);
  return reply({ ok: true });
}
