// 검색엔진용 페이지 만들기 (npm run build 의 두 번째 단계, build-index.mjs 다음에 실행)
//
// 장소 화면은 자바스크립트가 나중에 그려서, 검색엔진(특히 구글 외)은 내용을 거의 못 읽는다.
// 그래서 장소 × 언어마다 내용이 미리 들어간 HTML 을 만든다. 화면은 그 위에서 app.js 가 평소처럼 다시 그린다.
//   /en/                  언어별 첫 화면 (en·zh·ja·ko)
//   /en/gyeongbokgung/    장소 페이지 (제목·설명은 장소 데이터에서 자동)
//   /sitemap.xml          페이지 목록 (언어별 짝 표시 포함)
// 만든 파일은 깃허브에 올리지 않는다(.gitignore). Vercel 이 배포할 때마다 새로 만든다.
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://first-visit-korea-guide.vercel.app";
const read = f => readFile(join(ROOT, f), "utf8").then(s => s.replace(/^﻿/, ""));

// 화면과 같은 글자 사전·메모 순서 규칙을 그대로 쓴다 (규칙을 두 번 쓰지 않으려고)
const { UI, LANGS } = vm.runInNewContext(`${await read("ui-text.js")}\n;({ UI, LANGS })`);
const { rankMemos } = vm.runInNewContext(`${await read("memo-rank.js")}\n;({ rankMemos })`);
const LANG_IDS = LANGS.map(l => l.id);
const HTML_LANG = { en: "en", zh: "zh-CN", ja: "ja", ko: "ko" };
const OG_LOCALE = { en: "en_US", zh: "zh_CN", ja: "ja_JP", ko: "ko_KR" };
const SEP = { en: ". ", zh: "。", ja: "。", ko: ". " };

const template = await read("index.html");
const places = JSON.parse(await read("places/index.json"));
const categories = JSON.parse(await read("places/categories.json"));

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const url = (lang, id) => `${SITE}/${lang}/${id ? id + "/" : ""}`;
const tr = (lang, key, ...args) => {
  const v = UI[lang][key] ?? UI.en[key] ?? UI.ko[key];
  return typeof v === "function" ? v(...args) : v;
};
function cut(text, max) {
  return text.length <= max ? text : text.slice(0, max - 1).replace(/[\s,.·。、]+\S*$/, "") + "…";
}

// <head> 의 제목·설명·미리보기 태그를 페이지마다 바꾼다 (index.html 의 <title> ~ 글꼴 주석 사이)
function head({ lang, id, title, description }) {
  const alternates = [...LANG_IDS.map(l => `<link rel="alternate" hreflang="${HTML_LANG[l]}" href="${url(l, id)}">`),
    `<link rel="alternate" hreflang="x-default" href="${id ? url("en", id) : SITE + "/"}">`].join("\n");
  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url(lang, id)}">
${alternates}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(tr(lang, "appName"))}">
<meta property="og:locale" content="${OG_LOCALE[lang]}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url(lang, id)}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
`;
}

// index.html 을 바탕으로 한 페이지를 만든다: 언어, 기본 주소(/), 머리말, 화면 글자 번역, 미리 채운 내용
function page({ lang, id, title, description, fill }) {
  let html = template
    .replace(/<html lang="[^"]*">/, `<html lang="${HTML_LANG[lang]}">`)
    // /en/gyeongbokgung/ 에서도 style.css·places/… 같은 상대 주소가 사이트 맨 위를 기준으로 열리게
    .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">')
    .replace(/<title>[\s\S]*?(?=<!-- 글꼴)/, head({ lang, id, title, description }))
    .replace('<script src="ui-text.js"></script>',
      `<script>window.FVG_PAGE = ${JSON.stringify(id ? { lang, place: id } : { lang })};</script>\n<script src="ui-text.js"></script>`);
  // 화면 글자(data-i18n)를 그 언어로 미리 바꿔 둔다 (검색엔진이 영어 버튼 글자를 읽지 않게)
  html = html
    .replace(/(data-i18n="([\w.]+)"[^>]*>)[^<]*</g, (m, open, key) => {
      const [k, i] = key.split(".");
      const v = i === undefined ? tr(lang, k) : tr(lang, k)?.[Number(i)];
      return typeof v === "string" ? `${open}${esc(v)}<` : m;
    })
    .replace(/(data-i18n-html="(\w+)">)[\s\S]*?(<\/p>)/g, (m, open, k, close) => open + tr(lang, k) + close)
    .replace(/<[^>]*data-i18n-(ph|aria)="(\w+)"[^>]*>/g, tag => tag
      .replace(/placeholder="[^"]*"(?=[^>]*data-i18n-ph="(\w+)")/, (m, k) => `placeholder="${esc(tr(lang, k))}"`)
      .replace(/aria-label="[^"]*"(?=[^>]*data-i18n-aria="(\w+)")/, (m, k) => `aria-label="${esc(tr(lang, k))}"`));
  for (const [sel, value] of Object.entries(fill)) {
    const [from, to] = sel.split("|");
    if (!html.includes(from)) throw new Error(`index.html 에서 "${from}" 자리를 찾지 못했어요.`);
    html = html.replace(from, to.replace("$", () => value));
  }
  return html;
}

const memoText = (m, t) => ({ title: t?.memos?.[m.id]?.title ?? m.title, body: t?.memos?.[m.id]?.body ?? m.body });
const memoLi = (m, t) => {
  const { title, body } = memoText(m, t);
  return `<li><details class="note${m.warn ? " warn" : ""}${m.pin ? " pin" : ""}"><summary><h3>${esc(title)}</h3></summary><div class="inner"><p>${esc(body)}</p></div></details></li>`;
};

const out = [];   // { lang, id, updated }
for (const lang of LANG_IDS) await rm(join(ROOT, lang), { recursive: true, force: true });

for (const lang of LANG_IDS) {
  const foreign = lang !== "ko";
  // 언어별 첫 화면: 카테고리마다 장소 링크 (app.js 가 사진 카드로 다시 그린다)
  const sections = categories.map(c => {
    const list = places.filter(p => p.categories.includes(c.id));
    if (!list.length) return "";
    return `<section><h2>${esc(UI[lang].cats?.[c.id] ?? c.name)}</h2><ul>${list.map(p =>
      `<li><a href="/${lang}/${p.id}/">${esc(p.i18n?.[lang]?.name ?? p.name)}</a></li>`).join("")}</ul></section>`;
  }).join("");
  const homeTitle = `${tr(lang, "appName")} · ${tr(lang, "h1")}`;
  await mkdir(join(ROOT, lang), { recursive: true });
  await writeFile(join(ROOT, lang, "index.html"), page({
    lang, title: homeTitle, description: tr(lang, "sub"),
    fill: {
      '<div class="wrap" id="picker" hidden>|<div class="wrap" id="picker">': "",
      '<div id="sections"></div>|<div id="sections">$</div>': sections
    }
  }));
  out.push({ lang });

  for (const { id } of places) {
    const place = JSON.parse(await read(`places/${id}/place.json`));
    const t = foreign ? JSON.parse(await read(`places/${id}/i18n.json`))[lang] : null;
    const name = t?.name ?? place.name;
    const { top, more } = rankMemos(place.memos, { kid: false, mustgo: false, foreign });
    // 제목·설명: "확인 필요" 표시가 있으면서 제목에 숫자가 든 메모는 뺀다 (확인 안 된 숫자가 검색 제목에 나가지 않게).
    // 처음엔 표시가 있는 메모를 모두 뺐더니, "예약 오픈 시각 확인 필요"가 붙은 "어린이박물관은 예약해야 들어가요"까지 빠졌다.
    // 그 메모에서 불확실한 건 시각뿐이고 "예약 필요"는 확실하므로, 숫자가 든 제목만 걸러낸다.
    const sure = [...top, ...more].filter(m => !((m.trust ?? []).length && /\d/.test(memoText(m, t).title)));
    const key = sure.find(m => m.pin) ?? sure[0];
    const colon = lang === "zh" || lang === "ja" ? "：" : ": ";
    const title = key ? `${name}${colon}${memoText(key, t).title} · ${tr(lang, "appName")}` : `${name} · ${tr(lang, "appName")}`;
    const description = cut(sure.slice(0, 3).map(m => memoText(m, t).title.replace(/[.。!！?？]$/, "")).join(SEP[lang]) + SEP[lang].trim(), foreign && lang !== "en" ? 90 : 160);
    const meta = [t?.address ?? place.address, t?.hours ?? place.hours, t?.fee ?? place.fee].filter(Boolean).join(" · ");
    const fill = {
      '<div id="place" hidden>|<div id="place">': "",
      '<h1 id="p-name"></h1>|<h1 id="p-name">$</h1>': esc(name),
      'id="p-meta" aria-expanded="false"></button>|id="p-meta" aria-expanded="false">$</button>': esc(meta),
      '<h2 id="brief-title"></h2>|<h2 id="brief-title">$</h2>': esc(tr(lang, "briefTitle", top.length)),
      '<ol class="brief-list" id="notes-top" aria-live="polite"></ol>|<ol class="brief-list" id="notes-top" aria-live="polite">$</ol>': top.map(m => memoLi(m, t)).join(""),
      '<ul class="notes" id="notes-more"></ul>|<ul class="notes" id="notes-more">$</ul>': more.map(m => memoLi(m, t)).join(""),
      '<footer id="footer"></footer>|<footer id="footer">$</footer>': [
        place.sources?.length ? `<span>${esc(tr(lang, "fSources", place.sources.join(", ")))}</span>` : "",
        place.updated ? `<span>${esc(tr(lang, "fUpdated", place.updated))}</span>` : ""
      ].join("")
    };
    // 외국어 페이지: 택시용 한국어 이름·주소도 미리 넣는다 (한국어 이름으로 검색하는 사람도 찾게)
    if (foreign) Object.assign(fill, {
      '<small id="kr-title"></small>|<small id="kr-title">$</small>': esc(tr(lang, "krTitle")),
      '<b id="kr-name" lang="ko"></b>|<b id="kr-name" lang="ko">$</b>': esc(place.name),
      '<span id="kr-addr" lang="ko"></span>|<span id="kr-addr" lang="ko">$</span>': esc(place.address)
    });
    await mkdir(join(ROOT, lang, id), { recursive: true });
    await writeFile(join(ROOT, lang, id, "index.html"), page({ lang, id, title, description, fill }));
    out.push({ lang, id, updated: place.updated });
  }
}

// 사이트맵: 같은 장소의 언어별 페이지를 서로 짝지어 알려준다
const entry = ({ lang, id, updated }) => `  <url>
    <loc>${url(lang, id)}</loc>${updated ? `\n    <lastmod>${updated}</lastmod>` : ""}
${[...LANG_IDS.map(l => `    <xhtml:link rel="alternate" hreflang="${HTML_LANG[l]}" href="${url(l, id)}"/>`),
  `    <xhtml:link rel="alternate" hreflang="x-default" href="${id ? url("en", id) : SITE + "/"}"/>`].join("\n")}
  </url>`;
await writeFile(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${out.map(entry).join("\n")}
</urlset>
`);
console.log(`검색용 페이지 ${out.length}개(${LANG_IDS.length}개 언어) + sitemap.xml 만들었어요.`);
