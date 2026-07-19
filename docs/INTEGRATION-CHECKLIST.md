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

## 3. 식단

### GET /api/food-items?keyword=
- [ ] **비로그인(토큰 없음) 요청 시 어떻게 응답하는지 결정 필요**
      현재 프론트는 로그인 후에만 호출하지만, 401 이면 로그인으로 튕기는 동작이 맞는지 확인
- [ ] 한글 keyword 는 URL 인코딩되어 옴 (`%EB%8B%AD...`) — 디코딩 확인
- [ ] 2글자 미만은 프론트가 안 보내지만, 서버도 방어 검증 권장

### POST /api/diet/log
- [ ] 요청: `{ petId, date, items: [{ foodItemId, amountG }] }`
- [ ] 응답: `{ "items": [...서버 계산 칼로리 포함...], "analysis": {...} }`
      → 응답의 items 로 화면을 다시 그리므로 **요청 items 를 그대로 돌려주면 안 되고 칼로리 계산 포함**해야 함
- [ ] 성공 시 프론트가 "식단이 기록됐어요" 토스트를 띄움 — 200 이 아닌 201 을 줘도 동작하는지 확인 (프론트는 2xx 전부 성공 처리)

### GET /api/users/me/pets
- [ ] 0마리면 빈 배열 — 프론트가 "아이 등록하기" 빈 상태를 띄움

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
게시글    GET/POST/PUT/DELETE /api/posts
          POST /api/posts/:postId/like
댓글      GET/POST/DELETE /api/posts/:postId/comments
반려견    GET/POST/PUT/DELETE /api/pets
건강기록  GET/POST /api/pets/:petId/health/records
          GET /api/pets/:petId/health/alerts
AI 채팅   GET/POST /api/chats, /api/chats/:chatId/messages
사용자    GET /api/users/me
          PUT /api/users/me/password
          DELETE /api/users/me
```

## 부록. 소셜 로그인 (가장 마지막 순서)

1. 카카오 / 구글 / 네이버 개발자 콘솔에 앱 등록, Redirect URI 등록
2. `GET /api/auth/oauth/:provider` 로 인가 페이지 리다이렉트
3. `GET /api/auth/oauth/:provider/callback` 에서 토큰 교환
4. 최초 로그인 시 계정 생성, 기존 이메일과 동일하면 연결 처리
5. `accessToken` 을 프론트로 전달
