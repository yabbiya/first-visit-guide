// $3 평생 이용권의 라이선스 키 확인 (계정 없음: 키를 이 브라우저에 저장해 두고 쓴다).
// 결제 서비스(Lemon Squeezy)와 이야기하는 코드는 이 파일에만 둔다. 서비스를 바꾸면 이 파일만 고치면 된다.
//
//  POST   /api/license  { key }            → 이 기기를 등록(활성화)하고 { ok, instance } 를 돌려준다
//  POST   /api/license  { key, instance }  → 이미 등록한 기기의 키가 아직 유효한지 확인 (환불·정지 반영)
//  DELETE /api/license  { key, instance }  → 이 기기 등록 해제 (기기 수 제한 안에서 다른 기기로 옮길 때)
//
// 라이선스 API 는 비밀 키 없이 쓰는 공개 창구라서, 남의 상품 키를 넣어도 "유효"로 나올 수 있다.
// 그래서 응답의 가게 번호·상품 번호가 우리 것인지 반드시 확인한다 (Vercel 환경변수에 넣는다).

const API = "https://api.lemonsqueezy.com/v1/licenses";

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
const fail = (reason, status = 400) => reply({ ok: false, reason }, status);

async function callApi(action, fields) {
  const res = await fetch(`${API}/${action}`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields)
  });
  return { status: res.status, data: await res.json() };
}

function config() {
  const store = process.env.LEMONSQUEEZY_STORE_ID, product = process.env.LEMONSQUEEZY_PRODUCT_ID;
  return store && product ? { store: String(store), product: String(product) } : null;
}
const ours = (meta, cfg) => String(meta?.store_id) === cfg.store && String(meta?.product_id) === cfg.product;

async function readBody(request) {
  try {
    const b = await request.json();
    const key = typeof b.key === "string" ? b.key.trim() : "";
    const instance = typeof b.instance === "string" ? b.instance.trim() : "";
    if (!key || key.length > 100 || instance.length > 100) return null;
    return { key, instance };
  } catch { return null; }
}

export async function POST(request) {
  const cfg = config();
  if (!cfg) return fail("setup", 503);
  const body = await readBody(request);
  if (!body) return fail("invalid");

  try {
    if (body.instance) {
      const { data } = await callApi("validate", { license_key: body.key, instance_id: body.instance });
      if (!data.valid || !ours(data.meta, cfg)) return fail(data.meta && !ours(data.meta, cfg) ? "product" : "invalid");
      return reply({ ok: true, instance: body.instance });
    }
    // 처음 넣은 키: 먼저 우리 상품 키인지 확인한 뒤에 기기를 등록한다 (남의 키로 활성화 횟수를 쓰지 않게)
    const check = await callApi("validate", { license_key: body.key });
    if (!check.data.valid) return fail("invalid");
    if (!ours(check.data.meta, cfg)) return fail("product");
    const { data } = await callApi("activate", { license_key: body.key, instance_name: "web" });
    if (!data.activated) return fail(/limit/i.test(data.error ?? "") ? "limit" : "invalid");
    return reply({ ok: true, instance: data.instance.id });
  } catch {
    return fail("network", 502);
  }
}

export async function DELETE(request) {
  const cfg = config();
  if (!cfg) return fail("setup", 503);
  const body = await readBody(request);
  if (!body?.instance) return fail("invalid");
  try {
    const { data } = await callApi("deactivate", { license_key: body.key, instance_id: body.instance });
    return data.deactivated ? reply({ ok: true }) : fail("invalid");
  } catch {
    return fail("network", 502);
  }
}
