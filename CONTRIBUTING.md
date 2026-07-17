# TOMOPET 협업 가이드

작업 분담과 지켜야 할 규칙

| 담당 | 범위 |
|---|---|
| SG | `index.html` `login.html` `password-reset*.html` `terms.html` `privacy.html` + 공통 모듈 + 헤더/푸터 |
| 협업자 | `community` `post-write` `post-detail` `health-record` `feed-recommend` `feed-detail` `ai-chat` `my-page` |

남은 작업의 상세 순서와 페이지별 주의점은 [ROADMAP.md](./ROADMAP.md) 에 있습니다.

---

## 0. 협업 방식 — 시작 전에 반드시 읽기

### 저장소는 하나, 브랜치를 나눠 작업합니다

모두 **같은 저장소**에서 작업하며, 각자 자기 담당 브랜치를 만들어
완성되면 Pull Request(PR)로 `main` 에 합칩니다.
`main` 에 직접 push 하지 않습니다.

### 브랜치 이름 규칙

`feat/담당페이지` 형태로 만듭니다.

```
feat/community
feat/post-write
feat/my-page
feat/health-record
```

### 처음 한 번 (저장소 받기)

```
git clone https://github.com/(저장소주소).git
cd (저장소폴더)
```

### 작업할 때마다

```
# 1. 항상 최신 main 에서 시작
git checkout main
git pull origin main

# 2. 내 브랜치 생성 (이미 있으면 git checkout feat/community)
git checkout -b feat/community

# 3. 작업 후 커밋
git add .
git commit -m "feat: 커뮤니티 목록 조회 구현"

# 4. 내 브랜치를 원격에 올림
git push -u origin feat/community
```

### 합치기 (PR)

1. GitHub 저장소 → `Pull requests` → `New pull request`
2. `base: main` ← `compare: feat/community` 선택
3. 아래 14번 PR 체크리스트를 통과했는지 확인
4. 리뷰 후 `Merge`

### 어떤 파일을 어디에 두는가

각 담당자는 **자기 페이지 파일 3종**만 추가합니다.

| 종류 | 위치 | 예 (커뮤니티 담당) |
|---|---|---|
| 페이지 | 저장소 루트 | `community.html` |
| 스타일 | `styles/` | `styles/community.css` |
| 스크립트 | `scripts/` | `scripts/community.js` |

`index.html` 처럼 **루트에 나란히** 둡니다. 하위 폴더로 감싸지 마세요.
공통 파일(`variables.css`, `layout.js` 등)은 이미 있으니 새로 만들지 않습니다.

### 충돌을 줄이는 핵심

- 자기 담당 파일만 건드리면 충돌이 거의 나지 않습니다.
- 공통 파일(1번 목록)을 수정해야 하면 **먼저 팀에 알리세요.**
  여러 명이 같은 파일을 고치면 PR 합칠 때 충돌합니다.
- PR 전에 항상 `git pull origin main` 으로 최신 상태를 받으세요.

---

## 1. 절대 건드리면 안 되는 것

아래 파일을 고치면 **모든 페이지가 함께 깨집니다.**
수정이 필요하면 반드시 먼저 논의하세요.

```
styles/variables.css      전역 디자인 토큰
styles/common.css         리셋 + [hidden] 규칙
styles/components.css     공통 컴포넌트
components/header.html    전 페이지 헤더
components/footer.html    전 페이지 푸터
scripts/layout.js         헤더/푸터 삽입 + 인증
scripts/api.js            HTTP 통신
scripts/ui.js             DOM/포맷
```

**추가는 괜찮습니다.** 기존 값을 바꾸는 것이 위험합니다.

예를 들어 `components.css` 에 `.pet-card` 를 새로 추가하는 건 자유입니다.
하지만 `.card` 의 `border-radius` 를 바꾸면 홈 화면의 카드가 함께 바뀝니다.

---

## 2. 로드 순서 — 어기면 즉시 깨짐

### CSS (`<head>`)

```
variables.css  →  common.css  →  components.css  →  [페이지].css
```

`variables.css` 가 먼저 와야 나머지가 `var(--color-primary)` 를 읽습니다.

### JS (`</body>` 직전)

```html
<script src="./scripts/layout.js"></script>
<script src="./scripts/api.js" defer></script>
<script src="./scripts/ui.js" defer></script>
<script src="./scripts/community.js" defer></script>
```

`layout.js` 에만 `defer` 가 없습니다.
즉시 실행되어 `window.TomopetAuth` 를 먼저 정의해야 하기 때문입니다.

`defer` 스크립트는 문서 순서대로 실행되므로
페이지 스크립트가 돌 때 세 모듈이 모두 준비되어 있습니다.

---

## 3. 새 페이지를 만들 때 반드시 넣을 것

### 견본 파일을 복사하세요 (가장 쉬운 방법)

저장소에 복사용 견본 3종이 있습니다.

```
_example-page.html
styles/_example-page.css
scripts/_example-page.js
```

새 페이지는 이 셋을 복사해서 이름만 바꾸면 됩니다.

```
_example-page.html        ->  community.html
styles/_example-page.css  ->  styles/community.css
scripts/_example-page.js  ->  scripts/community.js
```

그다음 파일 안의 `example` 을 본인 담당 이름(`community`)으로 전부 바꾸고,
엔드포인트와 카드 모양을 실제에 맞게 고칩니다.

견본에는 로드 순서, XSS 안전 렌더링, try/catch, 빈 상태 처리가
이미 올바르게 들어 있으니 규칙을 외우지 않아도 됩니다.

견본 3종(`_example-*`)은 지우지 말고 그대로 두세요. 다음 담당자도 참고합니다.

### 직접 만들 경우의 뼈대

파일 3개를 아래 위치에 둡니다. (섹션 0 참고)

```
커뮤니티 담당 예:
├── community.html          ← 저장소 루트
├── styles/community.css    ← styles/ 폴더
└── scripts/community.js    ← scripts/ 폴더
```

아래는 `community.html` 의 뼈대입니다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1024">
  <link rel="icon" href="./favicon.svg" type="image/svg+xml">

  <link rel="stylesheet" href="./styles/variables.css">
  <link rel="stylesheet" href="./styles/common.css">
  <link rel="stylesheet" href="./styles/components.css">
  <link rel="stylesheet" href="./styles/[페이지].css">
</head>
<body>
  <a href="#main-content" class="skip-link">본문 바로가기</a>

  <div id="header-placeholder"></div>

  <main class="site-main" id="main-content">
    <!-- h1 은 페이지당 정확히 1개 -->
  </main>

  <div id="footer-placeholder"></div>

  <script src="./scripts/layout.js"></script>
  <script src="./scripts/api.js" defer></script>
  <script src="./scripts/ui.js" defer></script>
  <script src="./scripts/[페이지].js" defer></script>
</body>
</html>
```

`header-placeholder` 나 `footer-placeholder` 가 없으면
그 페이지만 헤더/푸터가 사라집니다.

### 페이지 스크립트가 없는 경우

`terms.html` `privacy.html` 처럼 동적 동작이 전혀 없는 페이지는
`api.js` 와 `ui.js` 를 로드하지 않습니다. 헤더/푸터 삽입을 위해 `layout.js` 만 필요합니다.

```html
<script src="./scripts/layout.js"></script>
```

이 경우에만 허용되는 예외입니다. 페이지 스크립트가 하나라도 있으면 세 개를 모두 로드하세요.

---

## 4. 페이지 스크립트 기본 형태

README 의 REST API 표준 문법(`async / await` + `try / catch`)을 그대로 따릅니다.

```js
(function () {
  "use strict";

  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var $ = Ui.$;

  async function loadPosts() {
    try {
      var data = await Api.get("/api/posts");
      Ui.renderList($("post-list"), Api.toList(data), createCard, $("post-list-empty"));
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
      Ui.setFormMessage($("form-message"), Api.toMessage(error), "danger");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    /* 로그인 필수 페이지라면 첫 줄에 */
    if (!window.TomopetAuth.requireAuth()) return;

    loadPosts();
  });
})();
```

로그인이 필요한 페이지: `post-write` `health-record` `my-page`

---

## 5. 페이지 간 계약 — 어기면 링크가 끊김

홈 화면(`index.js`)이 아래 형태로 링크를 만듭니다.
**쿼리 파라미터 이름을 그대로 받아야 합니다.**

```js
./post-detail.html?postId=123
./feed-detail.html?feedId=7
```

`?id=` 나 `?no=` 로 바꾸면 홈에서 넘어온 사용자가 빈 화면을 봅니다.

```js
/* post-detail.js */
var params = new URLSearchParams(window.location.search);
var postId = params.get("postId");   // "id" 아님
```

### 헤더 활성 메뉴

새 페이지를 만들면 `layout.js` 가 파일명으로 활성 메뉴를 찾습니다.

```
community.html      -> data-nav="community"
health-record.html  -> data-nav="health-record"
feed-recommend.html -> data-nav="feed-recommend"
ai-chat.html        -> data-nav="ai-chat"
```

하위 페이지는 상위 메뉴를 활성화합니다.

```js
var NAV_PARENT_MAP = {
  "post-detail": "community",
  "post-write": "community",
  "feed-detail": "feed-recommend"
};
```

새 하위 페이지를 만들면 이 표에 추가해야 합니다. (`layout.js` 수정 → 사전 논의)

---

## 6. API 응답 필드 이름

홈 화면이 이 필드를 읽습니다.
목록/상세 페이지도 **같은 이름을 쓰세요.** 백엔드가 두 벌을 만들 이유가 없습니다.

### 게시글

```
postId, title, thumbnailUrl, authorNickname, likeCount, category
```

`category` 는 `"gallery" | "recipe" | "free"` 셋 중 하나입니다.
다른 값이 오면 배지가 그냥 표시되지 않습니다. (오류는 안 남)

### 사료

```
feedId, name, brand, price, imageUrl
```

### 통계

```
recipeCount, memberCount, petCount
```

### 목록 응답 형태

배열과 `{ items: [...] }` 두 가지를 모두 지원합니다.

```js
Api.toList(data)   // 어느 쪽이든 배열로 반환
```

---

## 7. 코딩 규칙

### 인라인 금지

```html
<!-- 금지 -->
<div style="color: red">
<script>alert(1)</script>

<!-- 허용 -->
<div class="text-danger">
<script src="./scripts/community.js" defer></script>
```

### 사용자 입력은 `textContent` 로만

```js
el.textContent = post.title;   // 올바름
el.innerHTML = post.title;     // XSS 취약
```

`Ui.createEl(tag, className, text)` 가 이 규칙을 강제합니다.
서버가 `<img src=x onerror=alert(1)>` 를 내려줘도 그냥 글자로 보입니다.

### 폼은 `submit` 이벤트

```js
/* 금지 - Enter 키 제출 시 페이지 새로고침 */
$("submit-btn").addEventListener("click", handleSubmit);

/* 올바름 */
$("post-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  // ...
});
```

### 오류 로그 형식

README 표준에 맞춰 `console.error` 를 씁니다.

```js
catch (error) {
  console.error("데이터 로딩 실패:", error);
}
```

### 요청 중에는 버튼 잠그기

```js
Ui.setLoading(submitBtn, true, "저장 중...");
```

없으면 연타로 같은 글이 여러 번 등록됩니다.

### `fetch` 를 직접 쓰지 말 것

README 의 표준 구조(`await fetch` → `response.ok` 확인 → `response.json()`)를
`api.js` 가 이미 구현하고 있습니다.
페이지마다 다시 작성하면 토큰 첨부, 타임아웃, 401 처리를 반복해야 합니다.

```js
/* 금지 */
const response = await fetch("/api/posts", {
  headers: { Authorization: "Bearer " + token }
});

/* 올바름 - 표준 구조는 그대로, fetch 자리에 Api 가 들어감 */
try {
  const data = await Api.get("/api/posts");
} catch (error) {
  console.error("데이터 로딩 실패:", error);
}
```

`fetch` 를 직접 호출하는 파일은 `api.js` 와 `layout.js` 둘뿐입니다.

### 파일 업로드는 `Api.upload`

```js
var formData = new FormData();
formData.append("image", file);
Api.upload("/api/posts", formData);
```

`Content-Type` 을 직접 넣으면 안 됩니다.
`multipart/form-data` 는 boundary 값이 필요한데 브라우저만 만들 수 있습니다.

### 인증 엔드포인트는 `skipAuthRedirect`

```js
Api.post("/api/auth/login", body, { skipAuthRedirect: true });
```

로그인 실패의 `401` 은 토큰 만료가 아닙니다.
이걸 빼면 로그인 실패 시 로그인 페이지로 무한 리다이렉트됩니다.

### 새 탭 링크에는 `rel="noopener"`

```html
<a href="./terms.html" target="_blank" rel="noopener">보기</a>
```

없으면 새로 열린 탭이 `window.opener` 로 원본 창을 조작할 수 있습니다.

### 빈 `src` 금지

```html
<img src="" alt="">   <!-- 현재 페이지를 이미지로 다시 내려받음 -->
<img alt="">          <!-- JS 가 src 를 채움 -->
```

---

## 8. 디자인 규칙

### 반응형 없음

데스크톱 전용, 최소 폭 1024px 입니다.
`@media` 를 새로 추가하지 마세요.

`common.css` 의 `@media (prefers-reduced-motion)` 는
반응형이 아니라 전정기관 장애 사용자를 위한 접근성 대응입니다.

### 색 사용 비율 70 / 20 / 10

| 색 | 용도 | 비율 |
|---|---|---|
| Primary 테라코타 `#F2701F` | CTA, 활성 상태, 링크 | 70% |
| Accent 세이지 `#1F7A52` | 안전/정상, AI 기능, 레시피 | 20% |
| Deep `#2E2019` | 푸터, 큰 제목 | 10% |

### 브랜드 색은 클릭 가능한 것에만

가격, 칼로리 같은 정적 수치에 쓰면 사용자가 링크로 오인합니다.

```css
가격, 칼로리   → var(--color-deep)
링크, 버튼     → var(--color-primary-deep) / var(--color-primary)
장식 요소      → currentColor
```

### primary 배경 위에는 흰 글자를 쓰지 마세요

```
흰 글자 on #F2701F   2.66:1   WCAG 미달
딥 글자 on #F2701F   5.91:1   통과
```

```css
color: var(--color-text-on-primary);   /* #2E2019 */
color: var(--color-text-on-accent);    /* #FFFFFF, accent 배경용 */
```

### 색을 새로 만들었다면 대비를 재검증

Chrome DevTools → Elements → 색상 스와치 클릭 → 대비 비율 표시

본문 4.5:1, 대형 텍스트(24px 이상) 3:1 이 최소입니다.

### 상태는 색만으로 구분하지 말 것

적록색약 사용자에게 세이지와 앰버는 **1.84:1**, 사실상 같은 색입니다.

```html
<span class="status-chip status-chip--normal">정상</span>
```

| 클래스 | 색 | 도형 |
|---|---|---|
| `--normal` | 세이지 | 원 |
| `--caution` | 앰버 | 삼각 |
| `--danger` | 레드 | 사각 |
| `--none` | 그레이 | 빈 원 |

텍스트도 반드시 함께 표시합니다.

### `[hidden]` 규칙을 지우지 마세요

```css
/* common.css */
[hidden] { display: none !important; }
```

`.empty-state { display: grid }` 처럼 `display` 를 지정한 선택자는
브라우저 기본값 `[hidden] { display: none }` 을 덮어씁니다.
이 규칙이 없으면 `el.hidden = true` 를 줘도 숨겨지지 않습니다.

### 빈 상태에는 행동 버튼

문구만 두면 사용자가 무엇을 해야 할지 모릅니다.

```html
<div class="empty-state" id="post-list-empty">
  <p class="empty-state__title">아직 아무도 없네요</p>
  <p class="empty-state__desc">첫 글을 남겨보실래요?</p>
  <a href="./post-write.html" class="btn btn--primary empty-state__action">글 쓰러 가기</a>
</div>
```

### 동작하지 않는 버튼은 노출하지 말 것

눌러도 반응이 없으면 사용자는 고장으로 인식합니다.
구현 전까지 `hidden` 을 붙이세요.

---

## 9. 카피 톤

기능을 나열하지 않고 사용자가 실제로 하는 말로 씁니다.

| 지양 | 지향 |
|---|---|
| AI 식재료 안전성 분석 | 이거 먹여도 될까요? |
| 아직 게시글이 없어요 | 첫 밥상을 기다리고 있어요 |
| 반려동물 관리 | 우리 아이들 |

**단, 건강 관련 화면은 예외입니다.**

사용자가 불안한 순간이므로 담백하고 사실 위주로 씁니다.

```
지양: 우리 아이한테 무슨 일이 있나 봐요
지향: 최근 2주간 체중이 12% 줄었어요
```

측정 근거가 없는 수치는 쓰지 마세요.
`AI 분석 정확도 94.7%` 같은 표기는 오히려 신뢰도를 떨어뜨립니다.

---

## 10. 이름 규칙

| 대상 | 방식 | 예 |
|---|---|---|
| HTML 파일 / id / class | kebab-case | `post-detail.html` `#post-list` |
| JS 변수 / 함수 | camelCase | `createPostCard` |
| DB 컬럼 | snake_case | `poop_status` |
| API 경로 | `/api/...` (v1 없음) | `/api/posts/:postId` |

### 주석 표기

| 표기 | 의미 |
|---|---|
| `[공통]` | 모든 페이지에 적용 |
| `[추후 적용]` | 코드는 있으나 아직 동작하지 않음 |
| `[API 연동]` | 백엔드 연동 지점 |
| `[확인 필요]` | 결정 또는 외부 확인이 필요 |
| `[접근성]` | 접근성 관련 처리 |

구현이 끝나면 `[추후 적용]` 마커를 지우세요.
남아 있으면 다음 사람이 다시 확인하느라 시간을 씁니다.

---

## 11. 실행 및 확인

```
python -m http.server 8000
```

`file://` 로 열면 CORS 에 막혀 헤더/푸터가 뜨지 않습니다.

### PR 전 자가 점검

- [ ] `variables.css` `common.css` `components.css` 를 수정하지 않았다
- [ ] CSS / JS 로드 순서가 맞다
- [ ] `h1` 이 페이지당 1개다
- [ ] 인라인 `style` / `<script>` 가 없다
- [ ] `innerHTML` 을 쓰지 않았다
- [ ] `fetch` 를 직접 쓰지 않고 `Api` 를 썼다
- [ ] 폼에 `event.preventDefault()` 가 있다
- [ ] 제출 중 버튼이 `disabled` 된다
- [ ] `img` 에 `alt` 가 있고 빈 `src` 가 없다
- [ ] `button` 에 `type` 이 있다
- [ ] 빈 상태에 행동 버튼이 있다
- [ ] 새로 만든 색의 대비가 4.5:1 이상이다
- [ ] `@media` 를 추가하지 않았다
- [ ] 구현 완료된 `[추후 적용]` 마커를 지웠다

---

## 12. 남은 작업

[ROADMAP.md](./ROADMAP.md) 를 참고하세요.
페이지별 엔드포인트, 주의점, 완료 판정 기준이 정리되어 있습니다.
