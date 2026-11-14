# 걸어서 갈 수 있는 이웃 — 후보 목록 (자동 생성, 손으로 고치지 않음)

`npm run build`가 장소 좌표로 직선거리 2km 이내인 쌍을 뽑은 목록이다. **화면에는 나오지 않는다.**
지도 앱의 보행 경로로 걷는 시간·오르막·계단을 확인한 뒤 place.json의 `walkTo`에 적어야 화면에 나온다.
직선거리는 실제 걷는 거리보다 짧다(길이 꺾이고, 큰길·언덕이 있다). 직선거리만 보고 분을 계산해 넣지 않는다.

| 직선거리 | 장소 A | 장소 B | 상태 |
|---|---|---|---|
| 0.00km | 씨라이프 코엑스 아쿠아리움 (`coex-aquarium`) | 코엑스 별마당도서관 (`coex-starfield-library`) | 확인 못함 |
| 0.18km | 인사동 (`insadong`) | 조계사 (`jogyesa`) | 확인 못함 |
| 0.28km | 덕수궁 (`deoksugung`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 0.29km | 청계천 (`cheonggyecheon`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 0.30km | 롯데월드 어드벤처 (`lotte-world-adventure`) | 석촌호수 (`seokchon-lake`) | 확인 못함 |
| 0.31km | 국립현대미술관 서울 (`mmca-seoul`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 0.34km | 청계천 (`cheonggyecheon`) | 광화문광장 (`gwanghwamun-square`) | 확인 못함 |
| 0.37km | 창경궁 (`changgyeonggung`) | 종묘 (`jongmyo`) | 확인 못함 |
| 0.37km | 북촌한옥마을 (`bukchon-hanok-village`) | 창덕궁 (`changdeokgung`) | 확인 못함 |
| 0.39km | 창덕궁 (`changdeokgung`) | 종묘 (`jongmyo`) | 확인 못함 |
| 0.42km | 롯데월드 어드벤처 (`lotte-world-adventure`) | 롯데월드타워 서울스카이 (`lotte-world-tower-seoul-sky`) | 확인 못함 |
| 0.42km | 더현대 서울 (`the-hyundai-seoul`) | 여의도 한강공원 (`yeouido-hangang-park`) | 확인 못함 |
| 0.45km | 광화문광장 (`gwanghwamun-square`) | 경복궁 (`gyeongbokgung`) | 확인 못함 |
| 0.46km | 봉은사 (`bongeunsa`) | 씨라이프 코엑스 아쿠아리움 (`coex-aquarium`) | 확인 못함 |
| 0.46km | 봉은사 (`bongeunsa`) | 코엑스 별마당도서관 (`coex-starfield-library`) | 확인 못함 |
| 0.47km | 경복궁 (`gyeongbokgung`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 0.48km | 청계천 (`cheonggyecheon`) | 덕수궁 (`deoksugung`) | 확인 못함 |
| 0.49km | 인사동 (`insadong`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 0.49km | 남대문시장 (`namdaemun-market`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 0.50km | 국립중앙박물관 (`national-museum-of-korea`) | 용산가족공원 (`yongsan-family-park`) | 확인 못함 |
| 0.50km | 롯데월드타워 서울스카이 (`lotte-world-tower-seoul-sky`) | 석촌호수 (`seokchon-lake`) | 확인 못함 |
| 0.50km | 북촌한옥마을 (`bukchon-hanok-village`) | 인사동 (`insadong`) | 확인 못함 |
| 0.53km | 경희궁 (`gyeonghuigung`) | 인왕산 (`inwangsan`) | 확인 못함 |
| 0.53km | 북촌한옥마을 (`bukchon-hanok-village`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 0.55km | 덕수궁 (`deoksugung`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 0.55km | 광화문광장 (`gwanghwamun-square`) | 조계사 (`jogyesa`) | 확인 못함 |
| 0.56km | 광화문광장 (`gwanghwamun-square`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 0.56km | 창덕궁 (`changdeokgung`) | 창경궁 (`changgyeonggung`) | 확인 못함 |
| 0.58km | 경복궁 (`gyeongbokgung`) | 조계사 (`jogyesa`) | 확인 못함 |
| 0.59km | 덕수궁 (`deoksugung`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 0.59km | 경복궁 (`gyeongbokgung`) | 인사동 (`insadong`) | 확인 못함 |
| 0.60km | 하이커 그라운드 (`hikr-ground`) | 조계사 (`jogyesa`) | 확인 못함 |
| 0.61km | 조계사 (`jogyesa`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 0.65km | 청계천 (`cheonggyecheon`) | 조계사 (`jogyesa`) | 확인 못함 |
| 0.65km | 창덕궁 (`changdeokgung`) | 인사동 (`insadong`) | 확인 못함 |
| 0.65km | 경복궁 (`gyeongbokgung`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 0.67km | 북촌한옥마을 (`bukchon-hanok-village`) | 조계사 (`jogyesa`) | 확인 못함 |
| 0.69km | 광화문광장 (`gwanghwamun-square`) | 인사동 (`insadong`) | 확인 못함 |
| 0.70km | 청계천 (`cheonggyecheon`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 0.71km | 북촌한옥마을 (`bukchon-hanok-village`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 0.75km | 명동대성당 (`myeongdong-cathedral`) | 남산골한옥마을 (`namsangol-hanok-village`) | 확인 못함 |
| 0.76km | 국립과천과학관 (`gwacheon-science-museum`) | 서울대공원 (`seoul-grand-park`) | 확인 못함 |
| 0.76km | 광화문광장 (`gwanghwamun-square`) | 경희궁 (`gyeonghuigung`) | 확인 못함 |
| 0.76km | 인왕산 (`inwangsan`) | 서대문형무소역사관 (`seodaemun-prison`) | 확인 못함 |
| 0.77km | 덕수궁 (`deoksugung`) | 광화문광장 (`gwanghwamun-square`) | 확인 못함 |
| 0.77km | 북촌한옥마을 (`bukchon-hanok-village`) | 종묘 (`jongmyo`) | 확인 못함 |
| 0.77km | 청계천 (`cheonggyecheon`) | 경복궁 (`gyeongbokgung`) | 확인 못함 |
| 0.77km | 하이커 그라운드 (`hikr-ground`) | 인사동 (`insadong`) | 확인 못함 |
| 0.77km | 하이커 그라운드 (`hikr-ground`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 0.78km | 창덕궁 (`changdeokgung`) | 조계사 (`jogyesa`) | 확인 못함 |
| 0.80km | 인사동 (`insadong`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 0.80km | 국립민속박물관 (`national-folk-museum`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 0.80km | 경복궁 (`gyeongbokgung`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 0.81km | 남대문시장 (`namdaemun-market`) | 서울로7017 (`seoullo-7017`) | 확인 못함 |
| 0.82km | 청계천 (`cheonggyecheon`) | 인사동 (`insadong`) | 확인 못함 |
| 0.82km | 광장시장 (`gwangjang-market`) | 종묘 (`jongmyo`) | 확인 못함 |
| 0.84km | 경희궁 (`gyeonghuigung`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 0.85km | 광화문광장 (`gwanghwamun-square`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 0.86km | 하이커 그라운드 (`hikr-ground`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 0.88km | 창덕궁 (`changdeokgung`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 0.88km | 서울대공원 (`seoul-grand-park`) | 서울랜드 (`seoulland`) | 확인 못함 |
| 0.88km | 북촌한옥마을 (`bukchon-hanok-village`) | 창경궁 (`changgyeonggung`) | 확인 못함 |
| 0.88km | 청계천 (`cheonggyecheon`) | 경희궁 (`gyeonghuigung`) | 확인 못함 |
| 0.91km | 창경궁 (`changgyeonggung`) | 낙산공원 (`naksan-park`) | 확인 못함 |
| 0.92km | 조계사 (`jogyesa`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 0.92km | 광화문광장 (`gwanghwamun-square`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 0.93km | 덕수궁 (`deoksugung`) | 경희궁 (`gyeonghuigung`) | 확인 못함 |
| 0.93km | 북촌한옥마을 (`bukchon-hanok-village`) | 경복궁 (`gyeongbokgung`) | 확인 못함 |
| 0.93km | 경복궁 (`gyeongbokgung`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 0.94km | 동대문디자인플라자(DDP) (`ddp`) | 광장시장 (`gwangjang-market`) | 확인 못함 |
| 0.94km | 국립현대미술관 서울 (`mmca-seoul`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 0.95km | 인왕산 (`inwangsan`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 0.95km | 경복궁 (`gyeongbokgung`) | 경희궁 (`gyeonghuigung`) | 확인 못함 |
| 0.95km | 인사동 (`insadong`) | 종묘 (`jongmyo`) | 확인 못함 |
| 0.96km | 덕수궁 (`deoksugung`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.02km | 청계천 (`cheonggyecheon`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.02km | 창경궁 (`changgyeonggung`) | 광장시장 (`gwangjang-market`) | 확인 못함 |
| 1.02km | 청계천 (`cheonggyecheon`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.03km | 명동대성당 (`myeongdong-cathedral`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.04km | 남산서울타워 (`n-seoul-tower`) | 남산골한옥마을 (`namsangol-hanok-village`) | 확인 못함 |
| 1.04km | 조계사 (`jogyesa`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.04km | 하이커 그라운드 (`hikr-ground`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.08km | 광화문광장 (`gwanghwamun-square`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 1.09km | 창덕궁 (`changdeokgung`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 1.10km | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 서울로7017 (`seoullo-7017`) | 확인 못함 |
| 1.11km | 청계천 (`cheonggyecheon`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.12km | 덕수궁 (`deoksugung`) | 조계사 (`jogyesa`) | 확인 못함 |
| 1.14km | 광화문광장 (`gwanghwamun-square`) | 인왕산 (`inwangsan`) | 확인 못함 |
| 1.14km | 경복궁 (`gyeongbokgung`) | 인왕산 (`inwangsan`) | 확인 못함 |
| 1.16km | 광화문광장 (`gwanghwamun-square`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 1.16km | 씨라이프 코엑스 아쿠아리움 (`coex-aquarium`) | 선릉과 정릉 (`seolleung-jeongneung`) | 확인 못함 |
| 1.16km | 코엑스 별마당도서관 (`coex-starfield-library`) | 선릉과 정릉 (`seolleung-jeongneung`) | 확인 못함 |
| 1.16km | 북촌한옥마을 (`bukchon-hanok-village`) | 광화문광장 (`gwanghwamun-square`) | 확인 못함 |
| 1.16km | 경희궁 (`gyeonghuigung`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 1.17km | 경희궁 (`gyeonghuigung`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 1.17km | 하이커 그라운드 (`hikr-ground`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.19km | 종묘 (`jongmyo`) | 낙산공원 (`naksan-park`) | 확인 못함 |
| 1.19km | 창덕궁 (`changdeokgung`) | 광장시장 (`gwangjang-market`) | 확인 못함 |
| 1.20km | 명동대성당 (`myeongdong-cathedral`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 1.20km | 창덕궁 (`changdeokgung`) | 경복궁 (`gyeongbokgung`) | 확인 못함 |
| 1.21km | 창경궁 (`changgyeonggung`) | 인사동 (`insadong`) | 확인 못함 |
| 1.21km | 덕수궁 (`deoksugung`) | 경복궁 (`gyeongbokgung`) | 확인 못함 |
| 1.23km | 경희궁 (`gyeonghuigung`) | 서대문형무소역사관 (`seodaemun-prison`) | 확인 못함 |
| 1.25km | 조계사 (`jogyesa`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.25km | 북촌한옥마을 (`bukchon-hanok-village`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 1.26km | 종묘 (`jongmyo`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.26km | 창덕궁 (`changdeokgung`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 1.29km | 덕수궁 (`deoksugung`) | 서울로7017 (`seoullo-7017`) | 확인 못함 |
| 1.29km | 덕수궁 (`deoksugung`) | 인사동 (`insadong`) | 확인 못함 |
| 1.30km | 광장시장 (`gwangjang-market`) | 낙산공원 (`naksan-park`) | 확인 못함 |
| 1.31km | 노량진수산시장 (`noryangjin-fish-market`) | 여의도 한강공원 (`yeouido-hangang-park`) | 확인 못함 |
| 1.31km | 경희궁 (`gyeonghuigung`) | 조계사 (`jogyesa`) | 확인 못함 |
| 1.31km | 광화문광장 (`gwanghwamun-square`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.32km | 봉은사 (`bongeunsa`) | 선릉과 정릉 (`seolleung-jeongneung`) | 확인 못함 |
| 1.32km | 북촌한옥마을 (`bukchon-hanok-village`) | 청계천 (`cheonggyecheon`) | 확인 못함 |
| 1.32km | 광장시장 (`gwangjang-market`) | 남산골한옥마을 (`namsangol-hanok-village`) | 확인 못함 |
| 1.33km | 경희궁 (`gyeonghuigung`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.33km | 광장시장 (`gwangjang-market`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.33km | 창경궁 (`changgyeonggung`) | 조계사 (`jogyesa`) | 확인 못함 |
| 1.33km | 창덕궁 (`changdeokgung`) | 광화문광장 (`gwanghwamun-square`) | 확인 못함 |
| 1.33km | 인사동 (`insadong`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 1.33km | 광화문광장 (`gwanghwamun-square`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.34km | 노량진수산시장 (`noryangjin-fish-market`) | 더현대 서울 (`the-hyundai-seoul`) | 확인 못함 |
| 1.35km | 조계사 (`jogyesa`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 1.35km | 경복궁 (`gyeongbokgung`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 1.35km | 청계천 (`cheonggyecheon`) | 인왕산 (`inwangsan`) | 확인 못함 |
| 1.35km | 인왕산 (`inwangsan`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 1.36km | 명동대성당 (`myeongdong-cathedral`) | 남산서울타워 (`n-seoul-tower`) | 확인 못함 |
| 1.36km | 조계사 (`jogyesa`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 1.38km | 청계천 (`cheonggyecheon`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 1.39km | 인사동 (`insadong`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.39km | 하이커 그라운드 (`hikr-ground`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.41km | 창덕궁 (`changdeokgung`) | 청계천 (`cheonggyecheon`) | 확인 못함 |
| 1.41km | 창경궁 (`changgyeonggung`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.43km | 경희궁 (`gyeonghuigung`) | 인사동 (`insadong`) | 확인 못함 |
| 1.43km | 경희궁 (`gyeonghuigung`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.44km | 남산서울타워 (`n-seoul-tower`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.45km | 덕수궁 (`deoksugung`) | 인왕산 (`inwangsan`) | 확인 못함 |
| 1.46km | 서대문형무소역사관 (`seodaemun-prison`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 1.46km | 북촌한옥마을 (`bukchon-hanok-village`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 1.46km | 하이커 그라운드 (`hikr-ground`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 1.47km | 동대문디자인플라자(DDP) (`ddp`) | 낙산공원 (`naksan-park`) | 확인 못함 |
| 1.47km | 창덕궁 (`changdeokgung`) | 낙산공원 (`naksan-park`) | 확인 못함 |
| 1.48km | 종묘 (`jongmyo`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 1.49km | 청계천 (`cheonggyecheon`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 1.52km | 인사동 (`insadong`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 1.52km | 하이커 그라운드 (`hikr-ground`) | 남산골한옥마을 (`namsangol-hanok-village`) | 확인 못함 |
| 1.54km | 경복궁 (`gyeongbokgung`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.55km | 경희궁 (`gyeonghuigung`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 1.55km | 종묘 (`jongmyo`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.55km | 북촌한옥마을 (`bukchon-hanok-village`) | 광장시장 (`gwangjang-market`) | 확인 못함 |
| 1.55km | 광장시장 (`gwangjang-market`) | 인사동 (`insadong`) | 확인 못함 |
| 1.56km | 광장시장 (`gwangjang-market`) | 조계사 (`jogyesa`) | 확인 못함 |
| 1.56km | 반포한강공원 (`banpo-hangang-park`) | 용산가족공원 (`yongsan-family-park`) | 확인 못함 |
| 1.56km | 인왕산 (`inwangsan`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.56km | 남대문시장 (`namdaemun-market`) | 남산골한옥마을 (`namsangol-hanok-village`) | 확인 못함 |
| 1.57km | 창경궁 (`changgyeonggung`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 1.57km | 남산서울타워 (`n-seoul-tower`) | 서울로7017 (`seoullo-7017`) | 확인 못함 |
| 1.58km | 인왕산 (`inwangsan`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 1.59km | 청계천 (`cheonggyecheon`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.59km | 광화문광장 (`gwanghwamun-square`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.59km | 덕수궁 (`deoksugung`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.60km | 광장시장 (`gwangjang-market`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 1.62km | 창덕궁 (`changdeokgung`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.62km | 조계사 (`jogyesa`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.63km | 국립과천과학관 (`gwacheon-science-museum`) | 서울랜드 (`seoulland`) | 확인 못함 |
| 1.64km | 하이커 그라운드 (`hikr-ground`) | 인왕산 (`inwangsan`) | 확인 못함 |
| 1.64km | 인왕산 (`inwangsan`) | 조계사 (`jogyesa`) | 확인 못함 |
| 1.67km | 덕수궁 (`deoksugung`) | 남산골한옥마을 (`namsangol-hanok-village`) | 확인 못함 |
| 1.68km | 동대문디자인플라자(DDP) (`ddp`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.69km | 동대문디자인플라자(DDP) (`ddp`) | 남산골한옥마을 (`namsangol-hanok-village`) | 확인 못함 |
| 1.69km | 경복궁 (`gyeongbokgung`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.70km | 리움미술관 (`leeum`) | 남산서울타워 (`n-seoul-tower`) | 확인 못함 |
| 1.70km | 하이커 그라운드 (`hikr-ground`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 1.71km | 인사동 (`insadong`) | 인왕산 (`inwangsan`) | 확인 못함 |
| 1.73km | 창경궁 (`changgyeonggung`) | 동대문디자인플라자(DDP) (`ddp`) | 확인 못함 |
| 1.74km | 창경궁 (`changgyeonggung`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 1.75km | 남산서울타워 (`n-seoul-tower`) | 전쟁기념관 (`war-memorial-of-korea`) | 확인 못함 |
| 1.76km | 경복궁 (`gyeongbokgung`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.77km | 창경궁 (`changgyeonggung`) | 경복궁 (`gyeongbokgung`) | 확인 못함 |
| 1.77km | 명동대성당 (`myeongdong-cathedral`) | 서울로7017 (`seoullo-7017`) | 확인 못함 |
| 1.77km | 국립현대미술관 서울 (`mmca-seoul`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 1.77km | 북촌한옥마을 (`bukchon-hanok-village`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.77km | 청계천 (`cheonggyecheon`) | 서울로7017 (`seoullo-7017`) | 확인 못함 |
| 1.78km | 청계천 (`cheonggyecheon`) | 남산골한옥마을 (`namsangol-hanok-village`) | 확인 못함 |
| 1.78km | 북촌한옥마을 (`bukchon-hanok-village`) | 낙산공원 (`naksan-park`) | 확인 못함 |
| 1.78km | 경희궁 (`gyeonghuigung`) | 서울로7017 (`seoullo-7017`) | 확인 못함 |
| 1.79km | 북촌한옥마을 (`bukchon-hanok-village`) | 덕수궁 (`deoksugung`) | 확인 못함 |
| 1.80km | 인사동 (`insadong`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.80km | 국립중앙박물관 (`national-museum-of-korea`) | 전쟁기념관 (`war-memorial-of-korea`) | 확인 못함 |
| 1.80km | 리움미술관 (`leeum`) | 전쟁기념관 (`war-memorial-of-korea`) | 확인 못함 |
| 1.82km | 창덕궁 (`changdeokgung`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 1.84km | 경희궁 (`gyeonghuigung`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.84km | 인왕산 (`inwangsan`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.84km | 덕수궁 (`deoksugung`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 1.84km | 하이커 그라운드 (`hikr-ground`) | 서울로7017 (`seoullo-7017`) | 확인 못함 |
| 1.84km | 창덕궁 (`changdeokgung`) | 덕수궁 (`deoksugung`) | 확인 못함 |
| 1.85km | 덕수궁 (`deoksugung`) | 국립민속박물관 (`national-folk-museum`) | 확인 못함 |
| 1.85km | 덕수궁 (`deoksugung`) | 남산서울타워 (`n-seoul-tower`) | 확인 못함 |
| 1.86km | 북촌한옥마을 (`bukchon-hanok-village`) | 경희궁 (`gyeonghuigung`) | 확인 못함 |
| 1.86km | 국립현대미술관 서울 (`mmca-seoul`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.87km | 남산골한옥마을 (`namsangol-hanok-village`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 1.88km | 경복궁 (`gyeongbokgung`) | 서대문형무소역사관 (`seodaemun-prison`) | 확인 못함 |
| 1.88km | 청계천 (`cheonggyecheon`) | 광장시장 (`gwangjang-market`) | 확인 못함 |
| 1.88km | 창경궁 (`changgyeonggung`) | 광화문광장 (`gwanghwamun-square`) | 확인 못함 |
| 1.89km | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 통인시장 (`tongin-market`) | 확인 못함 |
| 1.89km | 종묘 (`jongmyo`) | 남산골한옥마을 (`namsangol-hanok-village`) | 확인 못함 |
| 1.90km | 광화문광장 (`gwanghwamun-square`) | 서대문형무소역사관 (`seodaemun-prison`) | 확인 못함 |
| 1.91km | 창경궁 (`changgyeonggung`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.91km | 남산서울타워 (`n-seoul-tower`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 1.92km | 창경궁 (`changgyeonggung`) | 청계천 (`cheonggyecheon`) | 확인 못함 |
| 1.92km | 반포한강공원 (`banpo-hangang-park`) | 국립중앙박물관 (`national-museum-of-korea`) | 확인 못함 |
| 1.92km | 조계사 (`jogyesa`) | 남산골한옥마을 (`namsangol-hanok-village`) | 확인 못함 |
| 1.93km | 롯데월드타워 서울스카이 (`lotte-world-tower-seoul-sky`) | 올림픽공원 (`olympic-park`) | 확인 못함 |
| 1.96km | 서대문형무소역사관 (`seodaemun-prison`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
| 1.97km | 광장시장 (`gwangjang-market`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.98km | 덕수궁 (`deoksugung`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.99km | 전쟁기념관 (`war-memorial-of-korea`) | 용산가족공원 (`yongsan-family-park`) | 확인 못함 |
| 2.00km | 국립민속박물관 (`national-folk-museum`) | 서울시립미술관 서소문본관 (`seoul-museum-of-art`) | 확인 못함 |
