// 내 컴퓨터에서만 쓰는 작은 서버.
// - 화면 파일(index.html, places/...)을 보여주고
// - /api/... 요청은 api 폴더의 Vercel 함수를 그대로 실행한다.
// 실행: npm start  (인증키는 .env 에서 읽음)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname, dirname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8000;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"
};

async function runApi(req, res, url) {
  const name = url.pathname.slice("/api/".length).replace(/[^a-z0-9-]/gi, "");
  let mod;
  try {
    mod = await import(pathToFileURL(join(ROOT, "api", `${name}.js`)).href + `?t=${Date.now()}`);
  } catch {
    res.writeHead(404).end("없는 API예요.");
    return;
  }
  const handler = mod[req.method];
  if (!handler) { res.writeHead(405).end(); return; }
  const response = await handler(new Request(url, { method: req.method }));
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function serveFile(res, url) {
  let path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  if (!path.startsWith(ROOT + sep) && path !== ROOT) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(path)).isDirectory()) path = join(path, "index.html");
    const body = await readFile(path);
    res.writeHead(200, {
      "content-type": TYPES[extname(path)] ?? "application/octet-stream",
      // 개발 중엔 고친 파일이 바로 보이도록 브라우저가 예전 파일을 재사용하지 않게 한다
      "cache-control": "no-cache"
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("파일이 없어요.");
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith("/api/")) await runApi(req, res, url);
    else await serveFile(res, url);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500);
    res.end("서버 오류가 났어요.");
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`http://localhost:${PORT} 에서 열렸어요. (끄려면 Ctrl + C)`);
  console.log(process.env.KMA_SERVICE_KEY ? "날씨 인증키: 설정됨" : "날씨 인증키: 없음 (.env 파일을 확인하세요)");
});
