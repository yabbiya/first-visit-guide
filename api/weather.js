// 기상청 초단기예보(앞으로 6시간)를 가져와 화면에 필요한 값만 돌려주는 서버 코드.
// 인증키는 브라우저에 보내지 않고 서버에서만 쓴다 (.env 의 KMA_SERVICE_KEY).
// Vercel 함수 형식: /api/weather?lat=37.54&lon=127.03

const API = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";

const SKY = { 1: "맑음", 3: "구름 많음", 4: "흐림" };
const PTY = { 1: "비", 2: "비/눈", 3: "눈", 5: "빗방울", 6: "빗방울·눈날림", 7: "눈날림" };

// 위도·경도 → 기상청 5km 격자 번호 (기상청 공개 변환식, 람베르트 정각원추도법)
export function toGrid(lat, lon) {
  const RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0, OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136;
  const D = Math.PI / 180;
  const re = RE / GRID;
  const slat1 = SLAT1 * D, slat2 = SLAT2 * D, olon = OLON * D, olat = OLAT * D;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * D * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = lon * D - olon;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;
  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)
  };
}

// 초단기예보는 매시 30분에 만들어져 45분쯤부터 받을 수 있다 → 그 이전이면 한 시간 전 것을 쓴다
export function baseDateTime(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000); // 한국 시간
  if (kst.getUTCMinutes() < 45) kst.setUTCHours(kst.getUTCHours() - 1);
  const p = n => String(n).padStart(2, "0");
  return {
    base_date: `${kst.getUTCFullYear()}${p(kst.getUTCMonth() + 1)}${p(kst.getUTCDate())}`,
    base_time: `${p(kst.getUTCHours())}30`
  };
}

function reply(body, status = 200, cache = false) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // 같은 날씨를 10분 동안 재사용해서 기상청 호출 횟수(하루 한도)를 아낀다
      "cache-control": cache ? "public, s-maxage=600, max-age=300" : "no-store"
    }
  });
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const lat = Number(q.get("lat")), lon = Number(q.get("lon"));
  // 한반도 범위 밖 좌표는 거절 (엉뚱한 호출 방지)
  if (!(lat >= 32 && lat <= 39.5 && lon >= 124 && lon <= 132)) {
    return reply({ ok: false, reason: "bad-location", message: "위치 정보가 올바르지 않아요." }, 400);
  }
  const key = process.env.KMA_SERVICE_KEY;
  if (!key) {
    return reply({ ok: false, reason: "no-key", message: "날씨 인증키가 아직 설정되지 않았어요." }, 503);
  }

  const { nx, ny } = toGrid(lat, lon);
  const params = new URLSearchParams({
    serviceKey: key, pageNo: "1", numOfRows: "60", dataType: "JSON",
    ...baseDateTime(), nx: String(nx), ny: String(ny)
  });

  let text;
  try {
    const res = await fetch(`${API}?${params}`);
    text = await res.text();
  } catch {
    return reply({ ok: false, reason: "network", message: "기상청에 연결하지 못했어요." }, 502);
  }

  // 인증키 문제가 있으면 기상청은 JSON 대신 XML 오류를 돌려준다
  if (!text.trim().startsWith("{")) {
    const notReady = text.includes("SERVICE_KEY_IS_NOT_REGISTERED");
    return reply({
      ok: false,
      reason: notReady ? "key-not-ready" : "api-error",
      message: notReady
        ? "인증키가 아직 등록 중이거나 올바르지 않아요. 발급 직후라면 1~2시간 뒤 다시 확인해 주세요."
        : "기상청 응답을 읽지 못했어요."
    }, 502);
  }

  const data = JSON.parse(text);
  const header = data?.response?.header;
  if (header?.resultCode !== "00") {
    return reply({ ok: false, reason: "api-error", message: `기상청 오류: ${header?.resultMsg ?? "알 수 없음"}` }, 502);
  }

  // 시간별로 묶기: { "1400": { T1H, SKY, PTY, RN1 } }
  const byTime = {};
  for (const it of data.response.body.items.item) {
    const k = it.fcstDate + it.fcstTime;
    (byTime[k] ??= { date: it.fcstDate, time: it.fcstTime })[it.category] = it.fcstValue;
  }
  const hours = Object.keys(byTime).sort().map(k => {
    const h = byTime[k];
    const pty = Number(h.PTY);
    return {
      time: `${h.time.slice(0, 2)}:${h.time.slice(2)}`,
      temp: Number(h.T1H),
      sky: SKY[Number(h.SKY)] ?? "",
      rain: PTY[pty] ?? null, // null 이면 비·눈 없음
      rainAmount: h.RN1
    };
  });

  return reply({ ok: true, grid: { nx, ny }, hours }, 200, true);
}
