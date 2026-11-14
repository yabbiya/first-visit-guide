// Upstash Redis 연결 (클릭 세기 api/event.js · 결과 보기 api/stats.js 가 함께 씀).
// 이름이 _ 로 시작하는 파일은 Vercel 이 주소(/api/…)로 열지 않는다 — 다른 함수가 가져다 쓰는 부품이라서.
// 연결 정보는 Vercel 이 넣어 주는 환경변수에서 읽는다 (코드에 쓰지 않음). 찾는 규칙은 api/reports.js 와 같다.
function findEnv(exact, suffix) {
  for (const name of exact) if (process.env[name]) return process.env[name];
  const name = Object.keys(process.env).find(k => k.endsWith(suffix) && !k.includes("READ_ONLY"));
  return name ? process.env[name] : undefined;
}
const REDIS_URL = findEnv(["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"], "_REST_API_URL");
const REDIS_TOKEN = findEnv(["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"], "_REST_API_TOKEN");

// 저장소(daily-ai 프로젝트와 함께 씀) 안에서 이 앱 데이터는 모두 "fvg:"로 시작한다
export const NS = "fvg:";
export const redisReady = () => Boolean(REDIS_URL && REDIS_TOKEN);

// 명령 여러 개를 한 번에 보낸다 (Upstash REST pipeline)
export async function redis(...commands) {
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

// 한국 날짜 (YYYY-MM-DD). 하루 단위로 묶어 세므로 서버 시간대(UTC)가 아니라 한국 시간으로 자른다
export const kstDate = (ms = Date.now()) => new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
