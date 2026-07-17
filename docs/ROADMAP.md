# TOMOPET 로드맵

남은 작업과 순서

> 규칙과 주의사항은 [CONTRIBUTING.md](./CONTRIBUTING.md) 를 먼저 읽으세요.

---

## 현재 상태

| 영역 | 상태 |
|---|---|
| 디자인 시스템 | 완료 (토큰 94개, WCAG AA 전체 통과) |
| 공통 모듈 | 완료 (`layout.js` `api.js` `ui.js`) |
| 홈 | 완료 |
| 로그인 / 회원가입 | 완료 |
| 비밀번호 재설정 | 완료 |
| 이용약관 / 개인정보처리방침 | 초안 완료 (법률 검토 필요) |
| 나머지 8개 페이지 | HTML · CSS 완료, JS 미구현 |
| 모달 컴포넌트 | 완료 (`<dialog>` 기반, components.css) |
| 백엔드 | 없음 |

---

## 담당 구분

| 담당 | 파일 |
|---|---|
| SG | `index` `login` `password-reset` `password-reset-confirm` `terms` `privacy` + 공통 모듈 3개 + `header` `footer` |
| 협업자 | `community` `post-write` `post-detail` `health-record` `feed-recommend` `feed-detail` `ai-chat` `my-page` |
| 백엔드 | Spring Boot + MySQL + JWT |

---

## 작업 순서

의존 관계를 고려한 순서입니다. 앞선 항목을 건너뛰면 뒤가 막힙니다.

```
0. 모달 컴포넌트          ← 완료 (SG)
1. community.js
2. post-detail.js
3. post-write.js
4. my-page.js             ← 완료 (SG)
5. feed-recommend.js
6. feed-detail.js
7. health-record.js       ← Chart.js 필요
8. ai-chat.js             ← 백엔드 AI 필요
9. 소셜 로그인             ← 백엔드 OAuth 필요
```

---

## 0. 모달 컴포넌트 (선행 작업)

`components.css` 에 `.modal` 클래스가 **존재하지 않습니다.**
마이페이지의 4개 기능이 전부 이것을 기다리고 있습니다.

```
#add-pet-btn                 반려견 등록 / 수정
#change-password-btn         비밀번호 변경
#notification-setting-btn    알림 설정
#change-theme-btn            테마 변경
```

### `<dialog>` 를 쓰세요

직접 만들면 포커스 트랩, ESC 닫기, 배경 스크롤 잠금을 전부 구현해야 합니다.
`<dialog>` 는 브라우저가 기본 제공합니다.

```html
<dialog class="modal" id="pet-modal" aria-labelledby="pet-modal-title">
  <form method="dialog" class="modal__inner">
    <h2 class="modal__title" id="pet-modal-title">반려견 등록</h2>
    <!-- 폼 필드 -->
    <div class="modal__actions">
      <button type="button" class="btn btn--secondary" data-modal-close>취소</button>
      <button type="submit" class="btn btn--primary">저장</button>
    </div>
  </form>
</dialog>
```

```js
petModal.showModal();   // 열기. show() 가 아님 (show() 는 포커스 트랩 없음)
petModal.close();       // 닫기
```

### 주의

`<dialog>` 안의 `<form method="dialog">` 는 제출 시 **자동으로 닫힙니다.**
API 요청을 보내야 한다면 `method` 를 빼고 `preventDefault()` 로 직접 제어하세요.

```js
form.addEventListener("submit", async function (event) {
  event.preventDefault();
  Ui.setLoading(saveBtn, true, "저장 중...");

  try {
    await Api.post("/api/pets", body);
    petModal.close();
  } catch (error) {
    console.error("반려견 등록 실패:", error);
  } finally {
    Ui.setLoading(saveBtn, false);
  }
});
```

### 필요한 CSS

```css
.modal::backdrop { background: rgba(46, 32, 25, 0.45); }
.modal { border: none; border-radius: var(--radius-xl); padding: 0; }
```

`z-index` 는 필요 없습니다. `<dialog>` 는 최상위 레이어에 그려집니다.
`variables.css` 의 `--z-modal` `--z-overlay` 는 이 방식에서는 쓰지 않습니다.

---

## 1. community.js — 4건

**만들 파일** — `community.html`(루트) · `styles/community.css` · `scripts/community.js`
브랜치 `feat/community` 에서 작업 후 PR (CONTRIBUTING 섹션 0)

| 기능 | 엔드포인트 |
|---|---|
| 목록 조회 | `GET /api/posts?page=1&size=12` |
| 카테고리 필터 | `GET /api/posts?category=recipe` |
| 검색 | `GET /api/posts?keyword=연어` |
| 페이지네이션 | 응답의 `totalPages` 사용 |

### 반드시 지킬 것

카드 링크는 **홈과 동일한 형식**이어야 합니다.

```js
link.href = "./post-detail.html?postId=" + encodeURIComponent(post.postId);
```

배지 클래스도 홈과 같은 매핑을 씁니다. `index.js` 의 `CATEGORY_BADGE` 를 복사하세요.

```js
gallery -> badge--gallery
recipe  -> badge--recipe
free    -> badge--free
```

빈 상태에는 이미 행동 버튼이 들어 있습니다. 지우지 마세요.

---

## 2. post-detail.js — 4건

**만들 파일** — `post-detail.html`(루트) · `styles/post-detail.css` · `scripts/post-detail.js`
브랜치 `feat/post-detail` 에서 작업 후 PR (CONTRIBUTING 섹션 0)

| 기능 | 엔드포인트 |
|---|---|
| 상세 조회 | `GET /api/posts/:postId` |
| 좋아요 토글 | `POST /api/posts/:postId/like` |
| 댓글 목록 | `GET /api/posts/:postId/comments` |
| 댓글 작성 / 삭제 | `POST` / `DELETE /api/posts/:postId/comments/:commentId` |

### 반드시 지킬 것

```js
var params = new URLSearchParams(window.location.search);
var postId = params.get("postId");   // "id" 아님. 홈이 이 이름으로 링크를 만듦
if (!postId) { /* 잘못된 접근 처리 */ }
```

본인 글일 때만 수정/삭제 버튼을 노출합니다.

```js
var me = window.TomopetAuth.getUser();
ownerActions.hidden = !me || me.userId !== post.authorId;
```

`#post-main-image` 는 `src` 속성이 없습니다. 빈 `src` 는 현재 페이지를
이미지로 다시 내려받기 때문입니다. JS 가 채우세요.

```js
if (post.imageUrl) {
  mainImage.src = post.imageUrl;
  mainImage.hidden = false;
}
```

### 좋아요 낙관적 갱신

응답을 기다리면 반응이 느립니다. 먼저 UI 를 바꾸고 실패 시 되돌리세요.

```js
var liked = btn.classList.toggle("is-liked");

try {
  await Api.post("/api/posts/" + postId + "/like");
} catch (error) {
  console.error("좋아요 실패:", error);
  btn.classList.toggle("is-liked");   // 롤백
}
```

---

## 3. post-write.js — 8건 (가장 무거움)

**만들 파일** — `post-write.html`(루트) · `styles/post-write.css` · `scripts/post-write.js`
브랜치 `feat/post-write` 에서 작업 후 PR (CONTRIBUTING 섹션 0)

| 기능 | 비고 |
|---|---|
| 작성 / 수정 분기 | `?postId=` 가 있으면 수정 모드 |
| 이미지 미리보기 | `FileReader` |
| 이미지 업로드 | `FormData` + `Api.upload` |
| 태그 입력 | Enter 로 추가, Backspace 로 삭제 |
| 글자 수 카운터 | `maxlength` 와 동기화 |
| 임시 저장 | localStorage 또는 API |
| 카테고리 선택 | 라디오 |
| 이탈 경고 | `beforeunload` |

### `Content-Type` 을 직접 넣지 마세요

```js
/* 금지 - boundary 가 빠져 서버가 파싱하지 못함 */
await fetch(url, { headers: { "Content-Type": "multipart/form-data" }, body: formData });

/* 올바름 */
var formData = new FormData();
formData.append("title", title);
formData.append("image", file);
await Api.upload("/api/posts", formData);
```

`api.js` 가 `FormData` 를 감지해 `Content-Type` 을 자동으로 생략합니다.

### 미리보기 후 objectURL 해제

```js
var url = URL.createObjectURL(file);
preview.src = url;
preview.onload = function () { URL.revokeObjectURL(url); };
```

해제하지 않으면 이미지를 바꿀 때마다 메모리가 누적됩니다.

### 파일 크기와 형식 검증

```js
var MAX_SIZE = 5 * 1024 * 1024;   // 5MB
var ALLOWED = ["image/jpeg", "image/png", "image/webp"];
```

서버에서도 반드시 검증해야 합니다. 클라이언트 검증은 우회됩니다.

---

## 4. my-page.js — 5건

**만들 파일** — `my-page.html`(루트) · `styles/my-page.css` · `scripts/my-page.js`
브랜치 `feat/my-page` 에서 작업 후 PR (CONTRIBUTING 섹션 0)

| 기능 | 엔드포인트 |
|---|---|
| 프로필 조회 | `GET /api/users/me` |
| 반려견 목록 | `GET /api/users/me/pets` |
| 반려견 등록 / 수정 / 삭제 | `POST` / `PUT` / `DELETE /api/pets/:petId` |
| 비밀번호 변경 | `PUT /api/users/me/password` |
| 회원 탈퇴 | `DELETE /api/users/me` |

### 로그인 필수 페이지

```js
document.addEventListener("DOMContentLoaded", function () {
  if (!window.TomopetAuth.requireAuth()) return;
  /* 이하 로직 */
});
```

### 비밀번호 변경과 비밀번호 찾기는 다릅니다

| | 찾기 | 변경 |
|---|---|---|
| 상태 | 로그아웃 | 로그인 |
| 필요한 것 | 메일로 받은 토큰 | **현재 비밀번호** |
| API | `POST /api/auth/password/reset` | `PUT /api/users/me/password` |

`password-reset-confirm.js` 를 복사하면 안 됩니다. 현재 비밀번호 확인이 빠집니다.

### 탈퇴는 되돌릴 수 없습니다

확인 모달에 닉네임을 직접 입력하게 하세요. `confirm()` 은 너무 쉽게 눌립니다.

---

## 5·6. feed-recommend.js / feed-detail.js — 4건 · 3건

**만들 파일** — `feed-recommend.html` / `feed-detail.html`(루트) · 각 `styles/*.css` · `scripts/*.js`
브랜치 `feat/feed-recommend`, `feat/feed-detail` 에서 작업 후 PR

| 기능 | 엔드포인트 |
|---|---|
| 사료 목록 | `GET /api/feeds?breed=&age=&weight=` |
| 품종 목록 | `GET /api/breeds` |
| 사료 상세 | `GET /api/feeds/:feedId` |

### 반드시 지킬 것

```js
var feedId = params.get("feedId");   // 홈이 이 이름으로 링크를 만듦
```

### 가격과 칼로리는 브랜드 색을 쓰지 마세요

클릭할 수 없는 정적 수치입니다. 브랜드 색을 쓰면 링크로 오인합니다.

```css
color: var(--color-deep);   /* --color-primary-deep 아님 */
```

### 영양 정보 파싱

`nutrition_info` 가 JSON 문자열로 올 경우 반드시 `try/catch` 로 감싸세요.

```js
var nutrition = {};
try { nutrition = JSON.parse(feed.nutritionInfo); } catch (e) { /* 빈 상태 노출 */ }
```

---

## 7. health-record.js — 9건

**만들 파일** — `health-record.html`(루트) · `styles/health-record.css` · `scripts/health-record.js`
브랜치 `feat/health-record` 에서 작업 후 PR (CONTRIBUTING 섹션 0)

| 기능 | 엔드포인트 |
|---|---|
| 최근 기록 | `GET /api/pets/:petId/health/latest` |
| 기록 목록 | `GET /api/pets/:petId/health/records` |
| 기록 추가 | `POST /api/pets/:petId/health/records` |
| 이상 징후 | `GET /api/pets/:petId/health/alerts` |

### Chart.js 를 추가해야 합니다

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js" defer></script>
```

`layout.js` 뒤, `health-record.js` 앞에 넣으세요.

### 차트를 다시 그릴 때는 반드시 파괴 후 생성

```js
var chartInstance = null;

function renderChart(data) {
  if (chartInstance) chartInstance.destroy();   // 없으면 메모리 누수 + 툴팁 중복
  chartInstance = new Chart(canvas, config);
}
```

### 상태는 색만으로 구분하지 마세요

적록색약 사용자에게 세이지(정상)와 앰버(주의)는 **1.84:1**, 사실상 같은 색입니다.
`.status-chip` 이 색 + 도형 + 텍스트를 함께 표시합니다.

```js
/* 기존 상태 클래스를 모두 제거한 뒤 부여할 것 */
el.classList.remove("status-chip--normal", "status-chip--caution",
                    "status-chip--danger", "status-chip--none");
el.classList.add("status-chip--" + tone);
el.textContent = label;
```

| 값 | 텍스트 | 클래스 |
|---|---|---|
| `NORMAL` (배변) | 정상 | `--normal` |
| `SOFT` | 묽음 | `--caution` |
| `HARD` | 딱딱함 | `--caution` |
| `NORMAL` (컨디션) | 평소와 같음 | `--normal` |
| `ACTIVE` | 평소보다 활발함 | `--normal` |
| `LETHARGIC` | 평소보다 무기력함 | `--caution` |
| 값 없음 | 기록 없음 | `--none` |

### 카피 톤을 분리하세요

건강 화면은 사용자가 불안한 순간입니다. 친근한 어투를 쓰지 마세요.

```
지양: 우리 아이한테 무슨 일이 있나 봐요
지향: 최근 2주간 체중이 12% 줄었어요
```

### 이상 징후 판정 기준

| 항목 | 기준 |
|---|---|
| 체중 | 2주간 ±10% 변화 |
| 식욕 | 3일 연속 평소보다 적음 |

---

## 8. ai-chat.js — 7건

**만들 파일** — `ai-chat.html`(루트) · `styles/ai-chat.css` · `scripts/ai-chat.js`
브랜치 `feat/ai-chat` 에서 작업 후 PR (CONTRIBUTING 섹션 0)

백엔드 AI 연동이 끝나야 의미가 있습니다.

| 기능 | 엔드포인트 |
|---|---|
| 대화 목록 | `GET /api/chats` |
| 새 대화 | `POST /api/chats` |
| 메시지 목록 | `GET /api/chats/:chatId/messages` |
| 메시지 전송 | `POST /api/chats/:chatId/messages` |

### 사진 분석 결과는 반드시 면책 문구와 함께

이용약관 제7조에 명시된 내용입니다.

```
AI 분석 결과는 참고 정보이며 수의학적 진단이 아닙니다.
```

### AI 응답도 textContent 로 삽입

모델이 생성한 문자열에 HTML 이 섞일 수 있습니다.

```js
bubble.textContent = message.content;   // innerHTML 금지
```

---

## 9. 소셜 로그인 (가장 마지막)

`login.html` 에 34줄이 주석 처리되어 있습니다.

### 프론트에서 할 일

```js
window.location.href = "/api/auth/oauth/kakao";
```

사실상 이게 전부입니다.

### 백엔드에서 할 일

1. 카카오 / 구글 / 네이버 개발자 콘솔에 앱 등록
2. Redirect URI 등록
3. `GET /api/auth/oauth/:provider` 로 인가 페이지 리다이렉트
4. `GET /api/auth/oauth/:provider/callback` 에서 토큰 교환
5. 최초 로그인 시 계정 생성, 기존 이메일과 동일하면 연결 처리
6. `accessToken` 을 프론트로 전달

### 백엔드가 준비되기 전에 주석을 풀지 마세요

눌러도 404 가 나는 버튼이 3개 생깁니다.

---

## 백엔드 체크리스트

### 이미 프론트가 호출 중 (없으면 홈·로그인이 빈 상태로 보임)

```
POST  /api/auth/login                    { email, password } -> { accessToken, user }
POST  /api/auth/signup                   -> 201 / 409 { field: "email" | "nickname" }
POST  /api/auth/password/reset-request   { email } -> 200
GET   /api/auth/password/verify-token?token=xxx  -> 200 / 400 / 410
POST  /api/auth/password/reset           { token, newPassword } -> 200 / 410
GET   /api/stats                         -> { recipeCount, memberCount, petCount }
GET   /api/posts?sort=popular&limit=3
GET   /api/feeds?limit=3
```

### 아직 아무도 호출하지 않음

```
게시글    GET/POST/PUT/DELETE /api/posts
          POST /api/posts/:postId/like
댓글      GET/POST/DELETE /api/posts/:postId/comments
반려견    GET/POST/PUT/DELETE /api/pets
건강기록  GET/POST /api/pets/:petId/health/records
          GET /api/pets/:petId/health/alerts
사료      GET /api/feeds/:feedId, GET /api/breeds
AI 채팅   GET/POST /api/chats, /api/chats/:chatId/messages
사용자    GET /api/users/me
          PUT /api/users/me/password
          DELETE /api/users/me
```

### 응답 필드 이름은 프론트와 맞춰야 합니다

```
게시글  postId, title, thumbnailUrl, authorNickname, likeCount, category
사료    feedId, name, brand, price, imageUrl
통계    recipeCount, memberCount, petCount
```

`category` 는 `"gallery" | "recipe" | "free"` 셋 중 하나입니다.

목록은 배열 또는 `{ items: [...] }` 어느 쪽이든 됩니다.
`Api.toList(data)` 가 정규화합니다.

### 비밀번호 재설정 보안 요구사항

1. **계정 열거 방지** — 미가입 이메일에도 항상 `200` 을 반환할 것
   `"가입되지 않은 이메일입니다"` 를 노출하면
   공격자가 어떤 이메일이 가입되어 있는지 알아낼 수 있습니다.
2. **토큰은 30분 1회용** — 사용 후 즉시 폐기, 재사용 시 `410`
3. **변경 후 기존 세션 전부 무효화**
4. **재발송 쿨다운** — 프론트의 60초 제한을 서버에서도 강제할 것

### 파일 업로드

1. 크기 제한 5MB
2. 형식 제한 `image/jpeg` `image/png` `image/webp`
3. 확장자가 아니라 실제 매직 넘버로 검증할 것
4. 원본 파일명을 그대로 저장하지 말 것 (경로 조작 위험)

---

## 남은 비개발 작업

| 항목 | 담당 | 비고 |
|---|---|---|
| 이용약관 · 개인정보처리방침 법률 검토 | 전체 | 초안에 `[확인 필요]` 표시됨 |
| 개인정보 보호책임자 정보 | 전체 | `privacy.html` 10번 항목 |
| 위탁 업체명 | 전체 | `privacy.html` 5번 항목 |
| 고객센터 메일 주소 | 전체 | `components/footer.html`, `terms.html` |
| 히어로 실사진 | SG | 현재 임시 일러스트 |
| `og:url` `og:image` 절대 경로 | SG | 배포 주소 확정 후 |
| 통합 검색 | 미정 | 헤더 버튼이 `hidden` 상태 |

---

## 배포

`index.html` 이 진입점이므로 GitHub Pages 는 별도 설정 없이 동작합니다.

```
Settings -> Pages -> Deploy from a branch -> main / (root)
```

`.nojekyll` 이 있어야 Jekyll 이 `_` 로 시작하는 파일을 무시하지 않습니다.

정적 호스팅이라 `/api/*` 는 404 를 반환하지만
각 로더가 `catch` 하므로 에러 없이 빈 상태 UI 가 렌더링됩니다.

백엔드를 별도 서버에 올린 뒤에는 `scripts/api.js` 상단만 바꾸면 됩니다.

```js
var BASE_URL = "https://api.example.com";
```

---

## 완료 판정 기준

각 페이지 스크립트가 아래를 모두 만족하면 완료로 봅니다.

- [ ] `[추후 적용]` 마커가 0건
- [ ] `fetch` 를 직접 쓰지 않고 `Api` 를 사용
- [ ] `async / await` + `try / catch` 구조 (README 표준 문법)
- [ ] `catch` 에서 `console.error("...실패:", error)` 로 기록
- [ ] `innerHTML` 을 쓰지 않음
- [ ] 폼에 `event.preventDefault()` 존재
- [ ] 제출 중 버튼이 `disabled`
- [ ] API 실패 시 빈 상태 또는 오류 배너가 노출됨 (콘솔 에러로 끝나지 않음)
- [ ] 로그인 필수 페이지는 `requireAuth()` 호출
- [ ] 새로 만든 색의 대비가 4.5:1 이상
- [ ] `@media` 를 추가하지 않음
