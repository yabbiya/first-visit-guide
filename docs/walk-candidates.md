# 걸어서 갈 수 있는 이웃 — 후보 목록 (자동 생성, 손으로 고치지 않음)

`npm run build`가 장소 좌표로 직선거리 2km 이내인 쌍을 뽑은 목록이다. **화면에는 나오지 않는다.**
지도 앱의 보행 경로로 걷는 시간·오르막·계단을 확인한 뒤 place.json의 `walkTo`에 적어야 화면에 나온다.
직선거리는 실제 걷는 거리보다 짧다(길이 꺾이고, 큰길·언덕이 있다). 직선거리만 보고 분을 계산해 넣지 않는다.

| 직선거리 | 장소 A | 장소 B | 상태 |
|---|---|---|---|
| 0.29km | 청계천 (`cheonggyecheon`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 0.34km | 청계천 (`cheonggyecheon`) | 광화문광장 (`gwanghwamun-square`) | 확인 못함 |
| 0.37km | 북촌한옥마을 (`bukchon-hanok-village`) | 창덕궁 (`changdeokgung`) | 확인 못함 |
| 0.39km | 창덕궁 (`changdeokgung`) | 종묘 (`jongmyo`) | 확인 못함 |
| 0.42km | 롯데월드 어드벤처 (`lotte-world-adventure`) | 롯데월드타워 서울스카이 (`lotte-world-tower-seoul-sky`) | 확인 못함 |
| 0.45km | 광화문광장 (`gwanghwamun-square`) | 경복궁 (`gyeongbokgung`) | 확인 못함 |
| 0.47km | 경복궁 (`gyeongbokgung`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 0.48km | 청계천 (`cheonggyecheon`) | 덕수궁 (`deoksugung`) | 확인 못함 |
| 0.49km | 인사동 (`insadong`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 0.50km | 국립중앙박물관 (`national-museum-of-korea`) | 용산가족공원 (`yongsan-family-park`) | 확인 못함 |
| 0.50km | 북촌한옥마을 (`bukchon-hanok-village`) | 인사동 (`insadong`) | 확인 못함 |
| 0.53km | 북촌한옥마을 (`bukchon-hanok-village`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 0.55km | 덕수궁 (`deoksugung`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 0.56km | 광화문광장 (`gwanghwamun-square`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 0.59km | 덕수궁 (`deoksugung`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 0.59km | 경복궁 (`gyeongbokgung`) | 인사동 (`insadong`) | 확인 못함 |
| 0.65km | 창덕궁 (`changdeokgung`) | 인사동 (`insadong`) | 확인 못함 |
| 0.69km | 광화문광장 (`gwanghwamun-square`) | 인사동 (`insadong`) | 확인 못함 |
| 0.76km | 국립과천과학관 (`gwacheon-science-museum`) | 서울대공원 (`seoul-grand-park`) | 확인 못함 |
| 0.77km | 덕수궁 (`deoksugung`) | 광화문광장 (`gwanghwamun-square`) | 확인 못함 |
| 0.77km | 북촌한옥마을 (`bukchon-hanok-village`) | 종묘 (`jongmyo`) | 확인 못함 |
| 0.77km | 청계천 (`cheonggyecheon`) | 경복궁 (`gyeongbokgung`) | 확인 못함 |
| 0.77km | 하이커 그라운드 (`hikr-ground`) | 인사동 (`insadong`) | 확인 못함 |
| 0.77km | 하이커 그라운드 (`hikr-ground`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 0.82km | 청계천 (`cheonggyecheon`) | 인사동 (`insadong`) | 확인 못함 |
| 0.82km | 광장시장 (`gwangjang-market`) | 종묘 (`jongmyo`) | 확인 못함 |
| 0.85km | 광화문광장 (`gwanghwamun-square`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 0.88km | 창덕궁 (`changdeokgung`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 0.93km | 북촌한옥마을 (`bukchon-hanok-village`) | 경복궁 (`gyeongbokgung`) | 확인 못함 |
| 0.93km | 경복궁 (`gyeongbokgung`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 0.94km | 동대문디자인플라자(DDP) (`ddp`) | 광장시장 (`gwangjang-market`) | 확인 못함 |
| 0.95km | 인사동 (`insadong`) | 종묘 (`jongmyo`) | 확인 못함 |
| 0.96km | 덕수궁 (`deoksugung`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.02km | 청계천 (`cheonggyecheon`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.02km | 청계천 (`cheonggyecheon`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.03km | 명동대성당 (`myeongdong-cathedral`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.04km | 하이커 그라운드 (`hikr-ground`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.11km | 청계천 (`cheonggyecheon`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.16km | 북촌한옥마을 (`bukchon-hanok-village`) | 광화문광장 (`gwanghwamun-square`) | 확인 못함 |
| 1.17km | 하이커 그라운드 (`hikr-ground`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.19km | 창덕궁 (`changdeokgung`) | 광장시장 (`gwangjang-market`) | 확인 못함 |
| 1.20km | 창덕궁 (`changdeokgung`) | 경복궁 (`gyeongbokgung`) | 확인 못함 |
| 1.21km | 덕수궁 (`deoksugung`) | 경복궁 (`gyeongbokgung`) | 확인 못함 |
| 1.25km | 북촌한옥마을 (`bukchon-hanok-village`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 1.26km | 종묘 (`jongmyo`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.26km | 창덕궁 (`changdeokgung`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 1.29km | 덕수궁 (`deoksugung`) | 인사동 (`insadong`) | 확인 못함 |
| 1.31km | 광화문광장 (`gwanghwamun-square`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.32km | 북촌한옥마을 (`bukchon-hanok-village`) | 청계천 (`cheonggyecheon`) | 확인 못함 |
| 1.33km | 광장시장 (`gwangjang-market`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.33km | 창덕궁 (`changdeokgung`) | 광화문광장 (`gwanghwamun-square`) | 확인 못함 |
| 1.33km | 광화문광장 (`gwanghwamun-square`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.36km | 명동대성당 (`myeongdong-cathedral`) | 남산서울타워 (`n-seoul-tower`) | 확인 못함 |
| 1.39km | 인사동 (`insadong`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.39km | 하이커 그라운드 (`hikr-ground`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.41km | 창덕궁 (`changdeokgung`) | 청계천 (`cheonggyecheon`) | 확인 못함 |
| 1.44km | 남산서울타워 (`n-seoul-tower`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.54km | 경복궁 (`gyeongbokgung`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.55km | 종묘 (`jongmyo`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.55km | 북촌한옥마을 (`bukchon-hanok-village`) | 광장시장 (`gwangjang-market`) | 확인 못함 |
| 1.55km | 광장시장 (`gwangjang-market`) | 인사동 (`insadong`) | 확인 못함 |
| 1.59km | 청계천 (`cheonggyecheon`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.59km | 광화문광장 (`gwanghwamun-square`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.59km | 덕수궁 (`deoksugung`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.60km | 광장시장 (`gwangjang-market`) | 하이커 그라운드 (`hikr-ground`) | 확인 못함 |
| 1.62km | 창덕궁 (`changdeokgung`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.68km | 동대문디자인플라자(DDP) (`ddp`) | 종묘 (`jongmyo`) | 확인 못함 |
| 1.69km | 경복궁 (`gyeongbokgung`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.76km | 경복궁 (`gyeongbokgung`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.77km | 북촌한옥마을 (`bukchon-hanok-village`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.79km | 북촌한옥마을 (`bukchon-hanok-village`) | 덕수궁 (`deoksugung`) | 확인 못함 |
| 1.80km | 인사동 (`insadong`) | 남대문시장 (`namdaemun-market`) | 확인 못함 |
| 1.84km | 창덕궁 (`changdeokgung`) | 덕수궁 (`deoksugung`) | 확인 못함 |
| 1.85km | 덕수궁 (`deoksugung`) | 남산서울타워 (`n-seoul-tower`) | 확인 못함 |
| 1.86km | 국립현대미술관 서울 (`mmca-seoul`) | 명동대성당 (`myeongdong-cathedral`) | 확인 못함 |
| 1.88km | 청계천 (`cheonggyecheon`) | 광장시장 (`gwangjang-market`) | 확인 못함 |
| 1.97km | 광장시장 (`gwangjang-market`) | 국립현대미술관 서울 (`mmca-seoul`) | 확인 못함 |
| 1.98km | 덕수궁 (`deoksugung`) | 종묘 (`jongmyo`) | 확인 못함 |
