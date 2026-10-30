// 관광지 붐빔 예측 (한국관광공사 관광지 집중률 방문자 추이 예측, 앞으로 30일).
// 공공데이터포털 인증키는 계정당 하나라서 날씨와 같은 키를 쓴다.
// /api/crowd?area=11&signgu=11110&name=광화문광장

const API = "https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList";

function reply(body, status = 200, cache = false) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // 예측은 하루 단위로 바뀌므로 6시간 동안 재사용해 호출 횟수를 아낀다
      "cache-control": cache ? "public, s-maxage=21600, max-age=3600" : "no-store"
    }
  });
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const area = q.get("area") ?? "", signgu = q.get("signgu") ?? "", name = (q.get("name") ?? "").trim();
  if (!/^\d{2}$/.test(area) || !/^\d{5}$/.test(signgu) || !name || name.length > 40) {
    return reply({ ok: false, reason: "bad-request", message: "장소 정보가 올바르지 않아요." }, 400);
  }
  const key = process.env.DATA_GO_KR_KEY || process.env.KMA_SERVICE_KEY;
  if (!key) return reply({ ok: false, reason: "no-key", message: "공공데이터 인증키가 설정되지 않았어요." }, 503);

  const params = new URLSearchParams({
    serviceKey: key, pageNo: "1", numOfRows: "40", MobileOS: "WEB", MobileApp: "FirstVisitGuide",
    areaCd: area, signguCd: signgu, tAtsNm: name, _type: "json"
  });

  let data;
  try {
    const res = await fetch(`${API}?${params}`);
    data = JSON.parse(await res.text());
  } catch {
    return reply({ ok: false, reason: "api-error", message: "한국관광공사 응답을 읽지 못했어요." }, 502);
  }
  const header = data?.response?.header;
  if (header?.resultCode !== "0000") {
    return reply({ ok: false, reason: "api-error", message: `한국관광공사 오류: ${header?.resultMsg ?? "알 수 없음"}` }, 502);
  }

  const items = [].concat(data.response.body?.items?.item ?? []).filter(i => i.tAtsNm === name);
  const days = items
    .map(i => ({ date: `${i.baseYmd.slice(0, 4)}-${i.baseYmd.slice(4, 6)}-${i.baseYmd.slice(6, 8)}`, rate: Number(i.cnctrRate) }))
    .filter(d => Number.isFinite(d.rate))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length) return reply({ ok: true, empty: true }, 200, true);
  return reply({ ok: true, days }, 200, true);
}
