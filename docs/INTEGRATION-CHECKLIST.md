# 백엔드 연동 검증 체크리스트

프론트(v16 기준)가 기대하는 규약입니다.
하나라도 어긋나면 화면이 **에러 없이 빈 상태로** 빠질 수 있으므로
백엔드 구현 후 아래를 순서대로 확인하세요.

---

## 0. 공통 규약 (모든 API 에 해당)

- [ ] **CORS**: GitHub Pages 도메인(`https://<계정>.github.io`)을 허용 origin 에 등록
      로컬 개발용 `http://localhost:5500` 등도 함께 등록
      → 이거 안 되면 모든 요청이 브라우저에서 차단됨 (가장 흔한 첫 연동 실패 원인)
- [ ] **인증 헤더**: 프론트는 `Authorization: Bearer <accessToken>` 으로 보냄
- [ ] **에러 본문 형식**: `{ "message": "사용자에게 보여줄 문구", "field": "email" }`
      - `message` 는 프론트가 그대로 화면에 노출함 (없으면 기본 문구 사용)
      - `field` 는 409 중복 시 어떤 항목인지 구분용
- [ ] **목록 응답**: 배열 그대로 `[...]` 또는 `{ "items": [...] }` 둘 다 허용 (프론트가 정규화함)
- [ ] **401 처리 (중요 - 프론트 가드 없음)**: 프론트는 페이지 진입을 막지 않기로
      결정했으므로, **로그인 필수 API 전부**가 비인증/만료 요청에 401 을 반환해야 함
      → 401 을 받으면 프론트가 세션 지우고 로그인으로 보내며, 재로그인 후 하던 페이지로 복귀
      → 401 대신 200+빈값이나 500 을 주면 비로그인 사용자가 깨진 화면에 머물게 됨

## 1. 인증

### POST /api/auth/login
- [ ] 요청: `{ "username": "...", "password": "..." }` — **email 이 아니라 username**
- [ ] 성공: `{ "accessToken": "...", "user": { "nickname": "..." } }`
- [ ] 실패(401): message 에 "아이디 또는 비밀번호..." 류 문구

### POST /api/auth/signup
- [ ] 성공 201
- [ ] 중복 409 + `{ "field": "email" | "nickname" | "username", "message": "..." }`
- [ ] **이메일 인증 미완료 상태로 signup 요청이 오면 거부** (프론트 우회 방지)

### 이메일 인증 (서버가 만료의 최종 판정자)
- [ ] `POST /api/auth/email/send` `{ email }` → 200 / **409 = 이미 가입된 이메일**
- [ ] `POST /api/auth/email/verify` `{ email, code }` → 200 / **400 = 불일치** / **410 = 만료**
      (400 과 410 을 구분해야 프론트가 "다시 입력" vs "재발송" 안내를 다르게 함)
- [ ] 유효시간 **60초** — 프론트 `EMAIL_CODE_TTL_SECONDS` 와 동일해야 함
- [ ] 재발송 시 이전 코드 즉시 무효화
- [ ] (권장) 같은 이메일 1분 내 발송 1회, 검증 5회 초과 시 코드 폐기

### 비밀번호 재설정
- [ ] `verify-token` → 200 / 400 / **410(만료)** 구분
- [ ] `reset` 성공 시 **해당 계정의 기존 세션(토큰) 전부 무효화**
      (프론트도 clearSession 을 호출하지만 다른 기기 세션은 서버만 끊을 수 있음)

## 2. 홈

### GET /api/stats
- [ ] `{ "recipeCount": n, "memberCount": n, "petCount": n }` — **키 이름 정확히**
      키가 다르면 스켈레톤이 사라진 자리에 undefined 가 뜸

### GET /api/posts?sort=popular&limit=3
- [ ] 카드가 쓰는 필드: `postId`, `title`, `category`, `authorNickname`, `likeCount`, `thumbnailUrl`
- [ ] `thumbnailUrl` 없으면 프론트가 플레이스홀더 처리 (null 허용)
- [ ] 0건일 때 빈 배열 `[]` — null 이나 404 를 주지 말 것

## 3. 식단 달력 (daily-log.html)

diet.html(식단분석) + health-record.html(건강기록)이 daily-log.html 하나로
통합되면서 `POST /api/diet/log`, `GET/POST /api/pets/:petId/health/records` 는
**더 이상 쓰지 않습니다.** 아래 5개로 대체되었습니다.
설계 근거는 `docs/DAILY-LOG-SPEC.md` 참고.

### GET /api/food-items?keyword= (기존, 변경 없음)
- [ ] **비로그인(토큰 없음) 요청 시 어떻게 응답하는지 결정 필요**
      현재 프론트는 로그인 후에만 호출하지만, 401 이면 로그인으로 튕기는 동작이 맞는지 확인
- [ ] 한글 keyword 는 URL 인코딩되어 옴 (`%EB%8B%AD...`) — 디코딩 확인
- [ ] 2글자 미만은 프론트가 안 보내지만, 서버도 방어 검증 권장

### GET /api/pets/:petId/daily-log?date=YYYY-MM-DD (신규)
- [ ] 그날 기록이 없으면 **404** (프론트가 "기록 없음"으로 처리, 에러 아님)
- [ ] 응답:
      ```json
      {
        "weight": 5.4,
        "poop": "normal",
        "poopMemo": "",
        "note": "",
        "meals": [
          { "time": "08:30", "items": [
              { "foodItemId": 12, "name": "닭가슴살", "amountG": 100, "calories": 165, "isToxic": false }
            ], "photos": [{ "url": "https://..." }] }
        ],
        "walks": [{ "time": "19:00", "memo": "동네 한 바퀴" }]
      }
      ```
      `poop` 은 `"normal" | "hard" | "soft" | "diarrhea" | null` 넷 중 하나

### POST /api/pets/:petId/daily-log (신규)
- [ ] 요청:
      ```json
      {
        "petId": 3, "date": "2026-08-20",
        "weight": 5.4, "poop": "normal", "poopMemo": "", "note": "",
        "meals": [{ "time": "08:30", "items": [{ "foodItemId": 12, "amountG": 100 }] }],
        "walks": [{ "time": "19:00", "memo": "동네 한 바퀴" }]
      }
      ```
- [ ] 응답: 저장된 하루 기록을 GET 과 같은 형태로 반환 (meals.items 에 **서버 계산 칼로리 포함**)
      → 사진은 아직 파일 업로드가 없어 `photos` 는 프론트가 보내지 않음 (로컬 미리보기만, [확인 필요] 업로드 연동 시 `Api.upload` 로 별도 처리)
- [ ] 프론트는 이 API 를 식사/산책 추가·삭제, 체중/배변/특이사항 저장 때마다 매번 **하루 전체를 통째로** 보냄 (부분 업데이트 아님)

### GET /api/pets/:petId/daily-log/summary?month=YYYY-MM (신규)
- [ ] 달력 점 표시 전용. 그 달에 기록이 있는 날짜만 내려줘도 됨 (없는 날짜는 프론트가 점 없음으로 처리)
- [ ] 응답: `[{ "date": "2026-08-03", "diet": true, "walk": false, "poopAbnormal": true, "note": false }, ...]`
      또는 `{ "items": [...] }` (프론트가 `Api.toList` 로 정규화)
- [ ] `poopAbnormal` 은 그날 `poop` 이 `hard`/`soft`/`diarrhea` 중 하나면 true

### GET /api/pets/:petId/daily-log/calorie-stats?days=7 (신규)
- [ ] 최근 N일(기본 7일) 평균 섭취 열량. 응답: `{ "avgKcal": 342, "days": 7 }`
- [ ] 기록이 하나도 없으면 `avgKcal: 0` 또는 `null` — 프론트가 "기록이 쌓이면 표시돼요"로 처리

### GET /api/pets/:petId/weight?range=week|month|year (신규)
- [ ] 응답: `[{ "date": "2026-08-13", "weight": 5.4 }, ...]` (오래된 순 → 최신 순 정렬, 마지막 항목을 "최신 체중"으로 씀)
- [ ] 기록이 없으면 빈 배열 `[]`

### GET /api/breeds/standards (신규, [확인 필요])
- [ ] 품종별 표준체중. 지금은 `scripts/breed-standards.js` 의 프론트 mock 표를 그대로 씀
- [ ] 연동 시점에 이 API 로 교체 예정 — **RER/MER 계산 공식은 프론트와 반드시 동일해야 함**
      (`RER = 70 × 체중^0.75`, `MER = RER × 활동계수`, 기본 활동계수 1.6)

### GET /api/users/me/pets
- [ ] 0마리면 빈 배열 — 프론트가 "아이 등록하기" 빈 상태를 띄움
- [ ] `breed`, `weight` 필드가 있어야 daily-log 의 비만도/급여평균 카드가 동작함 (없으면 "표준 없음"/"-"로 표시)

## 3-2. 커뮤니티 (community / post-detail / post-write)

프론트 구현이 끝나 실제로 호출하는 엔드포인트입니다.

### GET /api/posts?page=&size=&category=&keyword=&tag=
- [ ] `page` 는 **1부터** 시작 (0 기반이면 첫 페이지가 비어 보임)
- [ ] `size` 기본 12 — 프론트가 항상 명시해서 보냄
- [ ] `category` 는 `"free" | "gallery" | "recipe"`, 전체 조회 시 **파라미터 자체를 생략**함
- [ ] `keyword` 는 글 제목 부분 일치
- [ ] **`tag` 는 `#` 을 뗀 순수 태그명**으로 옴 (`#산책` → `tag=산책`)
- [ ] 응답: `{ "items": [...], "totalCount": 25, "totalPages": 3 }`
      → `totalPages` 가 없으면 프론트가 `totalCount` 로 계산하고, 둘 다 없으면 추정함.
        **`totalCount` 만이라도 주는 것을 권장** (없으면 결과 개수 표시가 부정확해짐)
- [ ] 카드가 쓰는 필드: `postId`, `title`, `category`, `authorNickname`, `likeCount`, `thumbnailUrl`
- [ ] 0건일 때 빈 배열 — null 이나 404 를 주지 말 것

### GET /api/posts/:postId
- [ ] 상세가 쓰는 필드:
      `postId`, `title`, `content`, `category`, `authorId`, `authorNickname`,
      `createdAt`(ISO 8601), `likeCount`, `liked`(boolean), `tags`(배열),
      `imageUrls`(배열) 또는 `imageUrl`(단일) — 프론트가 둘 다 받아 배열로 통일함
- [ ] **`authorId` 필수** — 없으면 본인 글이어도 수정/삭제 버튼이 안 뜸
      (프론트가 `me.userId === post.authorId` 로 판정)
- [ ] `liked` 는 **요청한 사용자 기준**의 좋아요 여부
- [ ] 없는 글은 404 — 프론트가 오류 배너를 띄우고 댓글 요청은 보내지 않음

### POST /api/posts/:postId/like
- [ ] 토글 방식 (같은 API 로 누르면 좋아요, 다시 누르면 취소)
- [ ] 응답: `{ "liked": true, "likeCount": 13 }`
      → 프론트는 먼저 화면을 바꾼 뒤 이 값으로 다시 맞춤.
        **응답을 주지 않아도 동작하지만**, 여러 기기에서 누르면 화면과 서버가 어긋남
- [ ] 실패 시 프론트가 이전 상태로 되돌리므로 오류를 삼키지 말 것

### GET / POST /api/posts/:postId/comments
- [ ] 목록 응답 필드: `commentId`, `authorId`, `authorNickname`, `content`, `createdAt`
- [ ] **`authorId` 필수** — 없으면 본인 댓글에도 삭제 버튼이 안 뜸
- [ ] 작성 요청: `{ "content": "..." }` — 작성자는 토큰에서 판단
- [ ] 작성 성공 후 프론트가 목록을 **다시 조회**하므로, 응답 본문 형식은 자유
- [ ] 0건일 때 빈 배열

### DELETE /api/posts/:postId/comments/:commentId
- [ ] 남의 댓글 삭제 요청은 403 (프론트가 버튼을 숨기지만 우회 가능)

### POST /api/posts · PUT /api/posts/:postId  (둘 다 multipart/form-data)
- [ ] 필드: `category`, `title`, `content`, `tags`(같은 이름으로 여러 번), `images`(파일, 최대 3장)
- [ ] **`tags` 는 같은 키로 반복 전송됨** — `tags=산책&tags=간식` 형태로 받아야 함
- [ ] 이미지 제한: 장당 5MB · 최대 3장 · JPG/PNG/WEBP
      → **서버에서도 반드시 검증**할 것. 클라이언트 검증은 우회됨
- [ ] `PUT` 에서 `images` 가 비어 있으면 **기존 이미지를 유지**해야 함
      (프론트는 새로 고르지 않으면 파일을 아예 보내지 않음)
- [ ] `POST` 응답에 **`postId` 를 포함**할 것
      → 프론트가 등록 직후 `post-detail.html?postId=` 로 이동함.
        없으면 목록으로 보내지므로 방금 쓴 글을 못 봄

## 4. 연동 시나리오 테스트 (수동, 순서대로)

1. [ ] 비로그인 → 홈에서 "닭가슴살" 검색 → 로그인 화면 → 로그인 → **식단 페이지로 복귀 + 모달에 검색 결과**
2. [ ] 회원가입: 인증번호 발송 → 메일 실제 수신(60초 안에 오는지!) → 인증 → 가입 → 로그인
3. [ ] 인증번호 받고 61초 뒤 입력 → 서버 410 → 프론트 "만료" 표시 확인
4. [ ] 잘못된 코드 5회 입력 → 서버 정책대로 폐기되는지
5. [ ] 식단 기록 저장 → 토스트 + 칼로리 표시 → 새로고침 후에도 유지
6. [ ] 토큰을 임의로 지우고 API 호출 → 로그인으로 이동 → 재로그인 → 원래 페이지 복귀
7. [ ] 백엔드 꺼진 상태에서 홈 → 스켈레톤 → "-" / 빈 상태로 전환 (무한 깜빡임 없어야 함)

## 5. 주의: 60초 유효시간의 현실성

메일 서버 상황에 따라 **수신 자체가 1분을 넘기는 경우**가 실제로 발생합니다.
2번 시나리오에서 메일이 자꾸 늦게 오면 유효시간 연장을 논의할 것.
연장 시 반드시 두 곳을 같이 변경:
- 백엔드 만료 설정
- 프론트 `scripts/login.js` 의 `EMAIL_CODE_TTL_SECONDS`

---

## 6. 응답 필드 이름 (프론트와 정확히 일치해야 함)

```
게시글  postId, title, thumbnailUrl, authorNickname, likeCount, category
        category 는 "gallery" | "recipe" | "free" 셋 중 하나
통계    recipeCount, memberCount, petCount
```

## 7. 비밀번호 재설정 보안 요구사항

1. **계정 열거 방지** — 미가입 이메일에도 항상 `200` 반환
   ("가입되지 않은 이메일입니다"를 노출하면 가입 여부가 새어나감)
2. **토큰은 30분 1회용** — 사용 즉시 폐기, 재사용 시 `410`
3. **변경 후 기존 세션 전부 무효화**
4. **재발송 쿨다운** — 프론트의 60초 제한을 서버에서도 강제

## 8. 아직 프론트가 호출하지 않는 엔드포인트 (구현 예정 순서는 ROADMAP 참고)

```
반려견    GET/POST/PUT/DELETE /api/pets
          GET /api/breeds
AI 채팅   GET/POST /api/chats, /api/chats/:chatId/messages
사용자    GET /api/users/me
          PUT /api/users/me/password
          DELETE /api/users/me
```

게시글·댓글 엔드포인트는 **프론트 구현이 끝나 이제 실제로 호출합니다.**
규약은 3-2 섹션에 정리했습니다.
식단 달력(daily-log) 엔드포인트 5종은 3번 섹션에 있습니다.

(예전 건강기록 전용 API `/api/pets/:petId/health/records`, `/health/alerts` 와
식단 전용 `POST /api/diet/log` 는 daily-log 통합으로 폐기되었습니다. 구현하지 마세요.)

## 부록. 소셜 로그인 (가장 마지막 순서)

1. 카카오 / 구글 / 네이버 개발자 콘솔에 앱 등록, Redirect URI 등록
2. `GET /api/auth/oauth/:provider` 로 인가 페이지 리다이렉트
3. `GET /api/auth/oauth/:provider/callback` 에서 토큰 교환
4. 최초 로그인 시 계정 생성, 기존 이메일과 동일하면 연결 처리
5. `accessToken` 을 프론트로 전달
