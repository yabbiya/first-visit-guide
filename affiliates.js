// Klook 제휴(어필리에이트) 예약 링크: 링크는 이 파일 한 곳에서만 고친다.
// - 버튼·카드 글자는 ui-text.js 의 aff (4개 언어). 화면에 그리는 일은 app.js 의 affButton()·renderAffiliate()·essentialsHTML() 이 한다.
// - 모든 링크는 새 창으로 열고 rel="sponsored noopener noreferrer" 를 붙인다 (검색엔진에 광고 링크임을 알리고, 열린 창이 이 페이지를 건드리지 못하게).
// - 글자에는 가격·할인율·소요 시간처럼 자주 바뀌거나 공식 자료로 확인하지 못한 숫자를 넣지 않는다 (2026-11-14 결정).
// - 링크를 하나 빼고 싶으면 그 줄을 지우면 된다. 해당 버튼·카드가 화면에서 사라진다.
const AFFILIATES = {
  // 장소 화면의 예약 버튼. memo 가 있으면 그 메모 카드 안(펼쳤을 때)에, 없으면 "꼭 기억할 3가지" 바로 아래 작은 카드로
  places: {
    gyeongbokgung: {
      key: "hanbok", memo: "free-entry", // "한복을 입으면 무료" 메모를 읽은 바로 그 자리에
      url: "https://affiliate.klook.com/redirect?aid=143122&aff_adid=1566801&k_site=https%3A%2F%2Fwww.klook.com%2Fen-US%2Factivity%2F7955-hanbok-rental-voucher-at-kyeonbokgung-store-in-hanboknam-seoul%2F"
    },
    "n-seoul-tower": {
      key: "nseoul",
      url: "https://affiliate.klook.com/redirect?aid=143122&aff_adid=1566802&k_site=https%3A%2F%2Fwww.klook.com%2Fen-US%2Factivity%2F412-n-seoul-tower-seoul%2F"
    },
    "lotte-world-adventure": {
      key: "lotte",
      url: "https://affiliate.klook.com/redirect?aid=143122&aff_adid=1566803&k_site=https%3A%2F%2Fwww.klook.com%2Fen-US%2Factivity%2F251-lotte-world-seoul%2F"
    }
  },
  // 첫 화면 장소 목록 아래 "도착 전에 준비할 것" 카드 3장
  essentials: [
    { key: "arex", url: "https://affiliate.klook.com/redirect?aid=143122&aff_adid=1566805&k_site=https%3A%2F%2Fwww.klook.com%2Fen-US%2Factivity%2F1163-airport-to-seoul-city-center-arex-train-incheon%2F" },
    { key: "esim", url: "https://affiliate.klook.com/redirect?aid=143122&aff_adid=1566806&k_site=https%3A%2F%2Fwww.klook.com%2Fen-US%2Factivity%2F109354-south-korea-esim-high-speed-internet-qr-code-voucher%2F" },
    { key: "wowpass", url: "https://affiliate.klook.com/redirect?aid=143122&aff_adid=1566809&k_site=https%3A%2F%2Fwww.klook.com%2Fen-US%2Factivity%2F86208-wowpass-card-seoul%2F" }
  ]
};
