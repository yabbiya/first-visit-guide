// 장소 주변 도로의 실시간 소통 상황 (국가교통정보센터 ITS 오픈API).
// 인증키는 서버에만 둔다 (.env / Vercel 환경변수의 ITS_API_KEY).
// /api/traffic?lat=37.54&lon=127.03

const API = "https://openapi.its.go.kr:9443/trafficInfo";
const BOX_LAT = 0.009;  // 위아래 약 1km
const BOX_LON = 0.0115; // 좌우 약 1km

// 도심 도로 기준으로 정한 이 앱의 판단 기준 (km/h)
export function level(speed) {
  if (speed >= 25) return "원활";
  if (speed >= 15) return "서행";
  return "정체";
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// 링크(도로 조각)별 속도 → 전체 상황 + 도로 이름별 평균 속도
export function summarize(items) {
  const links = items
    .map(it => ({ road: String(it.roadName ?? "").trim(), speed: Number(it.speed) }))
    .filter(l => Number.isFinite(l.speed) && l.speed > 0);
  if (!links.length) return null;

  const byRoad = {};
  for (const l of links) {
    if (!l.road || l.road === "-") continue;
    (byRoad[l.road] ??= []).push(l.speed);
  }
  const roads = Object.entries(byRoad)
    .map(([name, s]) => ({ name, speed: Math.round(s.reduce((a, b) => a + b, 0) / s.length) }))
    .sort((a, b) => a.speed - b.speed);

  const speed = Math.round(median(links.map(l => l.speed)));
  return { speed, level: level(speed), slowest: roads.slice(0, 2).map(r => ({ ...r, level: level(r.speed) })), links: links.length };
}

function reply(body, status = 200, cache = false) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // 도로 상황은 5분 단위로 바뀌므로 5분간 재사용해 호출 횟수를 아낀다
      "cache-control": cache ? "public, s-maxage=300, max-age=120" : "no-store"
    }
  });
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const lat = Number(q.get("lat")), lon = Number(q.get("lon"));
  if (!(lat >= 32 && lat <= 39.5 && lon >= 124 && lon <= 132)) {
    return reply({ ok: false, reason: "bad-location", message: "위치 정보가 올바르지 않아요." }, 400);
  }
  const key = process.env.ITS_API_KEY;
  if (!key) return reply({ ok: false, reason: "no-key", message: "도로 정보 인증키가 아직 설정되지 않았어요." }, 503);

  const params = new URLSearchParams({
    apiKey: key, type: "all", drcType: "all", getType: "json",
    minX: (lon - BOX_LON).toFixed(5), maxX: (lon + BOX_LON).toFixed(5),
    minY: (lat - BOX_LAT).toFixed(5), maxY: (lat + BOX_LAT).toFixed(5)
  });

  let data;
  try {
    const res = await fetch(`${API}?${params}`);
    const text = await res.text();
    data = JSON.parse(text);
  } catch {
    return reply({ ok: false, reason: "api-error", message: "교통정보센터 응답을 읽지 못했어요." }, 502);
  }

  const header = data.header ?? {};
  const code = String(header.resultCode ?? "0");
  if (code !== "0" && code !== "SUCCESS") {
    const keyProblem = code === "4005" || /인증/.test(header.resultMsg ?? "");
    return reply({
      ok: false,
      reason: keyProblem ? "key-not-ready" : "api-error",
      message: keyProblem ? "도로 정보 인증키가 아직 등록 중이거나 올바르지 않아요." : `교통정보센터 오류: ${header.resultMsg ?? code}`
    }, 502);
  }

  const items = data.body?.items ?? data.items ?? [];
  const summary = summarize(Array.isArray(items) ? items : [items]);
  if (!summary) return reply({ ok: true, empty: true }, 200, true);
  return reply({ ok: true, ...summary }, 200, true);
}
