# Frontend 개발

> 토모펫 서비스 프론트엔드 저장소입니다. 
> 본 저장소는 **HTML5, CSS3, Vanilla JavaScript**를 사용하여 개발을 진행합니다.

**데스크톱 전용** — 최소 지원 폭 1024px, 미디어 쿼리 미사용

> 협업 규칙 상세는 [CONTRIBUTING.md](./CONTRIBUTING.md)
> 남은 작업과 페이지별 주의점은 [ROADMAP.md](./ROADMAP.md)
> 담당 분량은 [분량배분.md](./분량배분.md)
> 색상·타이포·간격 등 디자인 토큰은 [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)

---

## 1. 프론트엔드 핵심 개발 일정표 (2026.07.09 ~ 2026.09.30)

지속 가능한 개발을 위해 기능별 퍼블리싱 직후 백엔드 API 연동을 주차별로 즉시 진행합니다.

| 주차 | 기간 (날짜) | 목표 작업 | 프론트엔드(FE) 세부 액션 플랜 |
|---|---|---|---|
| 기획 | **~ 07.09 (목)** | 디자인 확정 | 와이어프레임 및 디자인 시안 최종 확정 🏁 |
| 1~2주차 | 07.10 (금) ~ 07.23 (목) | UI 레이아웃 기초 | 공통 UI 레이아웃(헤더, 푸터, 사이드바 등) 마크업 및 CSS 퍼블리싱 |
| 3~4주차 | 07.24 (금) ~ 08.06 (목) | 인증 및 회원 | 로그인 및 회원가입 화면 퍼블리싱 완료 ➡️ 백엔드 JWT 로그인 API 연동 |
| 5~6주차 | 08.07 (금) ~ 08.20 (목) | 반려견 관리 | 마이페이지 및 반려견 등록/수정 화면 퍼블리싱 ➡️ 반려견 CRUD API 연동 |
| 7~8주차 | 08.21 (금) ~ 09.03 (목) | 커뮤니티 | 커뮤니티(목록, 상세, 글쓰기) 화면 퍼블리싱 ➡️ 게시글/댓글/사진 업로드 API 연동 |
| 9~10주차 | 09.04 (금) ~ 09.17 (목) | 건강기록 & AI | 대시보드(차트 라이브러리) 및 AI 채팅창 퍼블리싱 ➡️ 통계 및 챗봇 API 연동 |
| 11~12주차 | 09.18 (금) ~ 09.30 (수) | 종합 테스트 | 전체 UI/UX 디테일 수정, 프론트-백엔드 간 통합 에러 핸들링 및 최종 마감 |

### 현재 진행 상황

| 주차 | 목표 | 상태 |
|---|---|---|
| 1~2주차 | 공통 UI 레이아웃 | 완료 (헤더 · 푸터 · 사이드바) |
| 3~4주차 | 인증 및 회원 | 완료 (JWT 세션 · 비밀번호 재설정 포함) |
| 5~6주차 | 반려견 관리 | 퍼블리싱 완료, JS 미구현 |
| 7~8주차 | 커뮤니티 | 퍼블리싱 완료, JS 미구현 |
| 9~10주차 | 건강기록 & AI | 퍼블리싱 완료, JS 미구현 |

일정표에 없던 **비밀번호 재설정 2단계**, **이용약관 · 개인정보처리방침** 도 함께 완료했습니다.

---

## 2. 실행 방법

헤더/푸터를 `fetch` 로 불러오는 구조라 **로컬 서버가 필요**합니다.
`file://` 로 열면 CORS 정책에 막혀 헤더와 푸터가 표시되지 않습니다.

### VSCode Live Server

1. 확장 프로그램에서 `Live Server` 설치
2. `index.html` 우클릭 → `Open with Live Server`

### 또는 파이썬

```
python -m http.server 8000
```

live server로 열지 않을 시 헤더/푸터가 표시되지않음(주의)

---

## 3. 폴더 구조

`(ㅇ)` 완료 · `(X)` 미착수

```
tomopet/
├── index.html                    홈 / 진입점 (ㅇ)
├── login.html                    로그인 / 회원가입 (ㅇ)
├── password-reset.html           비밀번호 찾기 1단계 (ㅇ)
├── password-reset-confirm.html   비밀번호 재설정 2단계 (ㅇ)
├── terms.html                    이용약관 (ㅇ, 법률 검토 필요)
├── privacy.html                  개인정보처리방침 (ㅇ, 법률 검토 필요)
├── my-page.html                  마이페이지 + 모달 6종 (ㅇ)
├── diet.html                     식단 균형 분석 (ㅇ)
│
├── _example-page.html            협업자용 복사 견본 (ㅇ)
├── favicon.svg                   (ㅇ)
├── .gitignore                    Git 전용, 실행에 불필요
├── .nojekyll                     GitHub Pages 전용, 실행에 불필요
│
├── assets/
│   └── hero-bowl.svg             홈 히어로 임시 일러스트 (ㅇ)
│
├── components/                   전 페이지 공통 UI (ㅇ)
│   ├── header.html
│   └── footer.html
│
├── styles/
│   ├── variables.css             전역 디자인 토큰 (ㅇ)
│   ├── common.css                리셋 + 기반 스타일 (ㅇ)
│   ├── components.css            공통 컴포넌트 (ㅇ)
│   ├── index.css                 홈 전용 (ㅇ)
│   ├── login.css                 로그인 전용 (ㅇ)
│   ├── password-reset.css        재설정 2개 페이지 공용 (ㅇ)
│   ├── my-page.css               마이페이지 전용 (ㅇ)
│   ├── diet.css                  식단 분석 전용 (ㅇ)
│   └── policy.css                terms + privacy 공용 (ㅇ)
│
└── scripts/
    ├── theme.js                  테마 적용 (head 에서 먼저 실행) (ㅇ)
    ├── layout.js                 헤더/푸터 로더 + 인증 (필수) (ㅇ)
    ├── api.js                    HTTP 통신 공통 모듈 (필수) (ㅇ)
    ├── ui.js                     DOM/포맷 공통 모듈 (필수) (ㅇ)
    ├── index.js                  홈 전용 (ㅇ)
    ├── login.js                  로그인 전용 (ㅇ)
    ├── password-reset.js         1단계 전용 (ㅇ)
    ├── password-reset-confirm.js 2단계 전용 (ㅇ)
    ├── my-page.js                마이페이지 전용 (ㅇ)
    ├── diet.js                   식단 분석 전용 (ㅇ)
    └── _example-page.js          협업자용 복사 견본 (ㅇ)
```

`styles/_example-page.css` 도 함께 있습니다.
협업자는 `_example-*` 3종을 복사해 새 페이지를 만듭니다. (CONTRIBUTING 섹션 3)

이 저장소는 SG 담당 범위입니다.
`community` `post-write` `post-detail` `health-record` `feed-recommend`
`feed-detail` `ai-chat` `my-page` 는 협업자 담당이며 여기 포함되지 않습니다.
헤더 메뉴에서 해당 링크를 클릭하면 404 가 발생합니다.

**협업자는 시작 전에 [CONTRIBUTING.md 섹션 0](./CONTRIBUTING.md) 을 읽으세요.**
같은 저장소에서 브랜치를 나눠 작업하고, 각자 페이지 파일 3종
(`페이지.html` → 루트, `페이지.css` → `styles/`, `페이지.js` → `scripts/`)을 추가한 뒤
PR 로 `main` 에 합칩니다.

---

## 4. 프론트엔드 코드 규칙 (Convention)

코드가 꼬이거나 스타일이 깨지는 것을 방지하기 위해 반드시 아래 규칙을 준수해 주세요.

### 파일 및 함수 네이밍 규칙

**HTML/CSS/JS 파일명**: 전체 소문자와 하이픈(`-`)을 사용하는 **케밥 케이스(kebab-case)**

```
login.html, index.html, index.css, community.js, password-reset-confirm.js
```

> 진입점 파일은 반드시 `index.html` 이어야 합니다.
> GitHub Pages 는 저장소 루트의 `index.html` 을 찾습니다.

**자바스크립트 변수 및 함수명**: 소문자로 시작하는 **카멜 케이스(camelCase)**

```js
const petList = [];
function fetchPetData() {}
```

**CSS 클래스명**: 구조 파악이 쉬운 **BEM 방법론** 지향

```
.auth-panel, .form-field__input, .btn--primary
```

**DB 컬럼**: `snake_case` (`poop_status`)
**API 경로**: `/api/...` (버전 접두사 `v1` 없음)

---

### REST API 통신 표준 문법 (3주차부터 필수 사용)

리액트 없이 순수 자바스크립트로 백엔드와 안전하게 통신하기 위한 약속입니다.

#### 표준 구조

```js
// 서버로부터 반려견 목록을 받아오는 표준 구조
async function fetchPets() {
    try {
        const response = await fetch('/api/pets'); // 백엔드 API 주소
        if (!response.ok) throw new Error('네트워크 응답 플래그 에러');

        const data = await response.json(); // JSON 데이터 변환
        displayPets(data); // 화면 렌더링 함수 호출
    } catch (error) {
        console.error("데이터 로딩 실패:", error);
    }
}
```

#### `scripts/api.js` 가 위 구조를 구현합니다

`fetch` 를 페이지마다 직접 쓰면 토큰 첨부, 타임아웃, 401 처리를
페이지 수만큼 반복해서 작성해야 합니다. 그리고 반드시 누군가는 빠뜨립니다.

**페이지 스크립트에서는 `fetch` 를 직접 호출하지 않습니다.**
`api.js` 와 `layout.js` 두 파일만 `fetch` 를 씁니다.

```js
// 표준 구조 그대로. fetch 자리에 Api.get 이 들어갈 뿐입니다.
async function loadPets() {
    try {
        const data = await Api.get('/api/pets');
        displayPets(data);
    } catch (error) {
        console.error("데이터 로딩 실패:", error);
    }
}
```

`Api` 를 쓰면 아래가 자동으로 처리됩니다.

| 자동 처리 | 직접 `fetch` 로 쓸 경우 |
|---|---|
| `Authorization: Bearer <토큰>` 헤더 | 매번 직접 붙여야 함 |
| 타임아웃 10초 (`AbortController`) | 무한 대기 |
| `401` → 세션 제거 후 로그인 페이지 이동 | 처리 누락 |
| `204 No Content` 안전 파싱 | `response.json()` 이 예외를 던짐 |
| `FormData` 전송 시 `Content-Type` 생략 | **파일 업로드가 동작하지 않음** |

`response.ok` 확인과 `try / catch` 는 여전히 필요합니다.
`api.js` 내부에서 `!response.ok` 일 때 `status` 와 `data` 를 담은 오류를 던지므로,
호출부는 `catch` 에서 상태 코드별로 분기할 수 있습니다.

```js
catch (error) {
    if (error.status === 409 && error.data.field === "nickname") { ... }
}
```

#### API 서버 주소 변경

`scripts/api.js` 상단의 `BASE_URL` 한 곳만 바꾸면 전 페이지에 적용됩니다.

```js
var BASE_URL = "https://api.example.com";
```

---

## 5. 로드 순서

순서를 바꾸면 스타일이 깨지거나 동작하지 않습니다.

### CSS (`<head>`)

```
variables.css   →  common.css   →  components.css   →  [페이지].css
디자인 토큰        리셋/기반        공통 컴포넌트        페이지 전용
```

`variables.css` 가 먼저 와야 나머지가 `var(--color-primary)` 를 읽을 수 있습니다.

### JS

`theme.js` 만 `<head>` 에서 `defer` 없이 실행합니다.
본문이 그려지기 전에 `data-theme` 을 정해야 화면이 번쩍이지 않기 때문입니다.

```
<head>          theme.js
</body> 직전     layout.js  →  api.js  →  ui.js  →  [페이지].js
```

| 파일 | defer | 정의 | 의존 |
|---|---|---|---|
| `theme.js` | 없음 (head 에서 즉시) | `window.TomopetTheme` | - |
| `layout.js` | 없음 (즉시 실행) | `window.TomopetAuth` | - |
| `api.js` | 있음 | `window.TomopetApi` | TomopetAuth |
| `ui.js` | 있음 | `window.TomopetUi` | - |
| `[페이지].js` | 있음 | - | 위 3개 |

`defer` 스크립트는 **문서 순서대로** 실행되므로
페이지 스크립트가 돌 때 세 모듈이 모두 준비되어 있습니다.

`terms.html` `privacy.html` 처럼 동적 동작이 없는 페이지는
`layout.js` 만 로드합니다.

---

## 6. 공통 모듈

### `api.js` — `window.TomopetApi`

```js
Api.get(path, options)
Api.post(path, body, options)
Api.put(path, body, options)
Api.patch(path, body, options)
Api.del(path, options)
Api.upload(path, formData, options)   // FormData 전송

Api.toMessage(error, fallback)        // 오류 -> 사용자 문구
Api.toList(data)                      // 배열 또는 {items:[]} -> 배열
```

**로그인 폼의 `401` 은 예외입니다.**
토큰 만료가 아니라 비밀번호 오류이므로 리다이렉트하면 안 됩니다.

```js
Api.post("/api/auth/login", body, { skipAuthRedirect: true })
```

### `ui.js` — `window.TomopetUi`

```js
Ui.$(id)                              // getElementById
Ui.$$(selector, root)                 // querySelectorAll -> 배열

Ui.createEl(tag, className, text)     // textContent 강제 (XSS 안전)
Ui.createThumb(url, alt, extraClass)  // URL 없으면 img 미생성
Ui.clearChildren(el)

Ui.renderList(listEl, items, createItem, emptyEl)
Ui.toggleEmptyState(emptyEl, hasItems)
Ui.showView(activeEl, allEls)         // 여러 뷰 중 하나만 노출

Ui.setFieldError(input, errorEl, message)   // aria-invalid 자동 설정
Ui.setFormMessage(el, message, type)        // banner--danger 등
Ui.setLoading(button, isLoading, text)      // 중복 제출 방지
Ui.focusFirstError(formEl)

Ui.formatNumber(12340)                // "12,340"
Ui.formatPrice(34900)                 // "34,900원"
Ui.formatDate(iso)                    // "2026. 7. 9."
Ui.formatRelativeTime(iso)            // "3시간 전", 7일 초과 시 날짜
```

### `layout.js` — `window.TomopetAuth`

```js
TomopetAuth.isLoggedIn()
TomopetAuth.getToken()
TomopetAuth.getUser()                    // { nickname, profileImageUrl, ... }
TomopetAuth.setSession(token, user)
TomopetAuth.clearSession()
TomopetAuth.requireAuth()                // 비로그인이면 login.html 로 이동
TomopetAuth.logout()
```

로그인이 필요한 페이지에서는 스크립트 최상단에 이렇게 씁니다.

```js
document.addEventListener("DOMContentLoaded", function () {
  if (!window.TomopetAuth.requireAuth()) return;
  // 이하 페이지 로직
});
```

저장 키는 `tomopet_access_token`, `tomopet_user` 입니다.
`localStorage` 접근은 사파리 프라이빗 모드에서 예외를 던지므로
모든 접근이 `try / catch` 로 감싸져 있습니다.

---

## 7. 사용 중인 API 엔드포인트

### 프론트가 이미 호출 중 (없으면 빈 상태로 렌더링됨)

```
POST  /api/auth/login                    { email, password }
                                         -> { accessToken, user }
POST  /api/auth/signup                   { nickname, email, password, agreeMarketing }
                                         -> 201
                                            409 { field: "email" | "nickname" }

POST  /api/auth/password/reset-request   { email } -> 200 (미가입 이메일도 200)
GET   /api/auth/password/verify-token?token=xxx   -> 200 / 400 / 410
POST  /api/auth/password/reset           { token, newPassword } -> 200 / 410

GET   /api/users/me                      -> { nickname, email, profileImageUrl }
PUT   /api/users/me                      FormData (nickname, image) -> 갱신된 user
                                                                       409 닉네임 중복
PUT   /api/users/me/password             { currentPassword, newPassword }
                                         -> 200 / 401 현재 비밀번호 불일치
DELETE /api/users/me                     -> 204

GET   /api/users/me/pets                 -> [{ petId, name, breed, birthDate, sex,
                                               weight, neutered, activityLevel,
                                               allergies[], imageUrl }]
POST  /api/pets                          FormData -> 201
PUT   /api/pets/:petId                   FormData -> 200
DELETE /api/pets/:petId                  -> 204
GET   /api/breeds                        -> ["말티즈", ...] 또는 [{ name }]

GET   /api/stats                         -> { recipeCount, memberCount, petCount }

식단 분석
GET   /api/pets/:petId/diet/target       -> { der, targets: { protein, fat, fiber } }
GET   /api/diet/logs?petId=&date=        -> { items: [...], analysis: {...} }
                                            404 = 그날 기록 없음 (오류 아님)
POST  /api/diet/logs                     { petId, date, items: [{ foodItemId, amountG }] }
                                         -> { items: [...], analysis: {
                                              calories: { actual, target },
                                              nutrients: [{ label, ratio }],
                                              score: 0~100,
                                              toxicWarnings: [{ name, reason }] } }
GET   /api/food-items?keyword=           -> [{ foodItemId, name, type, caloriesPer100g,
                                               isToxic, toxicReason }]
                                            type = FEED | TREAT | HUMAN
GET   /api/posts?sort=popular&limit=3
GET   /api/feeds?limit=3
```

### 응답 필드 이름

```
게시글  postId, title, thumbnailUrl, authorNickname, likeCount, category
사료    feedId, name, brand, price, imageUrl
통계    recipeCount, memberCount, petCount
```

`category` 는 `"gallery" | "recipe" | "free"` 셋 중 하나입니다.
목록은 배열 또는 `{ items: [...] }` 어느 쪽이든 `Api.toList(data)` 가 정규화합니다.

### 비밀번호 재설정 보안 요구사항

1. **계정 열거 방지** — 가입되지 않은 이메일이어도 항상 `200` 을 반환할 것
2. **토큰은 30분 1회용** — 재사용 시 `410`
3. **변경 후 기존 세션 전부 무효화**
4. **재발송 쿨다운** — 프론트의 60초 제한을 서버에서도 강제할 것

---

## 8. 레이아웃 방침

데스크톱 전용으로 구성 미디어 쿼리를 사용안함.

| 항목 | 값 |
|---|---|
| 최소 지원 폭 | 1024px (`--layout-min-width`) |
| 콘텐츠 최대 폭 | 1200px (`--layout-max-width`) |
| 상세/폼 페이지 폭 | 720px (`--layout-max-width-narrow`) |
| 사이드바 폭 | 220px (`--sidebar-width`) |
| viewport meta | `width=1024` |

1024px 미만 화면에서는 `body { min-width }` 에 의해 가로 스크롤이 발생합니다.

`common.css` 의 `@media (prefers-reduced-motion)` 는 반응형이 아니라
전정기관 장애 사용자를 위한 접근성 대응입니다. (WCAG 2.1 - 2.3.3)

### `common.css` 의 `[hidden]` 규칙은 지우면 안 됩니다

```css
[hidden] { display: none !important; }
```

`.empty-state { display: grid }` 처럼 `display` 를 지정한 선택자는
브라우저 기본값인 `[hidden] { display: none }` 을 덮어씁니다.
이 규칙이 없으면 JS 로 `el.hidden = true` 를 줘도 숨겨지지 않습니다.

---

## 9. 색상 시스템

| 색 | 용도 | 비율 |
|---|---|---|
| Primary 테라코타 `#E8845F` | 메인 CTA, 활성 상태, 링크 | 70% |
| Accent 세이지 `#567F63` | 안전/정상 상태, AI 기능, 레시피 | 20% |
| Deep `#2E2019` | 푸터 배경, 히어로 타이틀 | 10% |

`--color-success` 를 액센트와 같은 계열로 맞춰
**안전 = 세이지 그린** 이라는 직관이 서비스 전체에 일관되게 적용됩니다.

### 브랜드 색은 클릭 가능한 것에만

가격, 칼로리 같은 정적 수치에 쓰면 사용자가 링크로 오인합니다.

```css
가격, 칼로리   → var(--color-deep)
링크, 버튼     → var(--color-primary-deep) / var(--color-primary)
장식 요소      → currentColor
```

### primary 배경 위에는 흰 글자를 쓰지 마세요

```
흰 글자 on #E8845F   2.66:1   WCAG 미달
딥 글자 on #E8845F   5.91:1   통과
```

```css
color: var(--color-text-on-primary);   /* #2E2019 */
color: var(--color-text-on-accent);    /* #FFFFFF, accent 배경용 */
```

---

## 10. 접근성 (WCAG 2.1 AA)

모든 텍스트 조합이 **4.5:1 이상**, 대형 텍스트는 3:1 이상입니다.
색상을 새로 만들었다면 대비를 반드시 재검증하세요.
Chrome DevTools → Elements → 색상 스와치 클릭 → 대비 비율 표시

### 색에만 의존하지 않기 (WCAG 1.4.1)

적록색약 사용자에게 정상(세이지)과 주의(앰버)는 **1.84:1** 로 사실상 같은 색입니다.
건강 상태는 **색 + 도형 + 텍스트** 3중으로 표시합니다.

| 상태 | 색 | 도형 | 클래스 |
|---|---|---|---|
| 정상 | 세이지 | 원 | `.status-chip--normal` |
| 주의 | 앰버 | 삼각 | `.status-chip--caution` |
| 위험 | 레드 | 사각 | `.status-chip--danger` |
| 없음 | 그레이 | 빈 원 | `.status-chip--none` |

---

## 11. 폰트

**Pretendard 단일 사용**

| 용도 | 변수 |
|---|---|
| 전체 | `--font-family` |

CDN 으로 로드하며 별도 파일을 저장소에 포함하지 않습니다.
SIL Open Font License 라 상업적 이용과 웹 배포 모두 자유롭습니다.

손글씨 계열 포인트 폰트는 아래 이유로 제외했습니다.

1. 숫자 폭이 고정되지 않아 통계 카드, 영양 성분표, 차트 축의 정렬이 어긋남
2. 14px 이하 본문에서 가독성 저하
3. 무료 배포 폰트 상당수가 폰트 파일의 웹 재배포를 금지함

숫자가 주 내용인 요소에는 `font-variant-numeric: tabular-nums` 를 함께 지정합니다.

---

## 12. 백엔드 연동 시 지켜야 할 3가지

### 1. 폼은 반드시 submit 이벤트에 바인딩

```js
// 잘못된 방식 - Enter 키 제출 시 페이지 새로고침
document.getElementById("login-submit-btn").addEventListener("click", handleLogin);

// 올바른 방식
document.getElementById("login-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  // ...
});
```

### 2. 사용자 입력값은 textContent 로 삽입

```js
el.textContent = post.title;   // 올바름
el.innerHTML = post.title;     // XSS 취약
```

`ui.js` 의 `createEl()` 헬퍼가 이 규칙을 강제합니다.

### 3. 중복 제출 방지

요청 중에는 제출 버튼을 `disabled` 처리합니다.

```js
Ui.setLoading(submitBtn, true, "저장 중...");
```

---

## 13. 카피 작성 원칙

기능을 나열하지 않고 사용자가 실제로 하는 말로 씁니다.

| 지양 | 지향 |
|---|---|
| AI 식재료 안전성 분석 | 이거 먹여도 될까요? |
| 아직 게시글이 없어요 | 첫 밥상을 기다리고 있어요 |
| 반려동물 관리 | 우리 아이들 |

측정 근거가 없는 수치는 쓰지 않습니다.
`AI 분석 정확도 94.7%` 같은 표기는 오히려 신뢰도를 떨어뜨립니다.

### 건강 관련 화면은 톤을 분리

사용자가 불안한 순간이므로 친근한 어투를 쓰지 않습니다.

```
지양: 우리 아이한테 무슨 일이 있나 봐요
지향: 최근 2주간 체중이 12% 줄었어요
```

### 빈 상태에는 반드시 행동 버튼

```html
<div class="empty-state" id="post-list-empty">
  <p class="empty-state__title">첫 밥상을 기다리고 있어요</p>
  <p class="empty-state__desc">우리 아이 밥상을 가장 먼저 자랑해보세요</p>
  <a href="./post-write.html" class="btn btn--primary empty-state__action">글 쓰러 가기</a>
</div>
```

---

## 14. 주석 표기 규칙

| 표기 | 의미 |
|---|---|
| `[공통]` | 모든 페이지에 적용되는 항목 |
| `[추후 적용]` | 코드는 있으나 아직 동작하지 않음 |
| `[API 연동]` | 백엔드 연동 지점 |
| `[확인 필요]` | 결정 또는 외부 확인이 필요한 항목 |
| `[접근성]` | 접근성 관련 처리 |

구현이 끝나면 `[추후 적용]` 마커를 지워주세요.

---

## 15. GitHub Pages 배포

진입점이 `index.html` 이므로 별도 리다이렉트 없이 바로 배포됩니다.

```
Settings -> Pages -> Source: Deploy from a branch -> main / (root)
```

`.nojekyll` 이 있어야 Jekyll 이 `_` 로 시작하는 파일을 무시하지 않습니다.

### 주의

Pages 는 정적 호스팅이라 Spring Boot 를 구동할 수 없습니다.
`/api/*` 요청이 404 를 반환하지만 각 로더가 `catch` 하므로
에러 없이 빈 상태 UI 가 정상 렌더링됩니다.

| 화면 | 백엔드 없을 때 |
|---|---|
| 홈 통계 | `-` 유지 |
| 인기 밥상 | 빈 상태 + "글 쓰러 가기" 버튼 |
| 사료 추천 | 빈 상태 + "아이 등록하기" 버튼 |
| 로그인 시도 | "서버에 연결할 수 없습니다" 배너 |

---

## 16. 알려진 제약

### JavaScript 없이는 동작하지 않습니다

헤더/푸터가 `fetch` 로 삽입되고 회원가입 탭이 `hidden` 으로 감춰져 있어
JS 가 꺼지면 네비게이션과 가입 폼에 접근할 수 없습니다.

### 이용약관과 개인정보처리방침은 초안입니다

법률 검토 전이며 `[확인 필요]` 로 표시된 항목이 남아 있습니다.

- 개인정보 보호책임자 성명
- 위탁 업체명 (클라우드 · 메일 · AI)
- 고객센터 실제 메일 주소

### 히어로 이미지는 임시 일러스트입니다

`assets/hero-bowl.svg` 를 실제 사진으로 교체하는 것을 권장합니다.
`.thumb` 이 4:5 세로 비율입니다.

### 배포 후 OG 메타 수정 필요

`index.html` 의 `og:url` 과 `og:image` 를 실제 배포 주소로 바꿔야
링크 공유 시 미리보기 카드가 표시됩니다.
