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
| 식단 달력 (`daily-log.html`) | **완료** — diet.html + health-record.html 통합, diet/health-record 관련 파일 전부 제거됨 |
| my-page | 완료 (검증 6건 통과) |
| 커뮤니티 (`community` `post-detail` `post-write`) | **완료** — 브라우저 검증 70여 항목 통과 |
| ai-chat | 팀원 구현본 유지 (백엔드 AI 연동 대기) |
| 모달 컴포넌트 | 완료 (`<dialog>` 기반, components.css) |
| 의존성 예외 | Chart.js(CDN) — `daily-log.html` 체중 추이 차트. "Vanilla JS 의존성0" 방침의 유일한 예외 |
| 백엔드 | 없음 |

---

## 담당 구분

| 담당 | 파일 |
|---|---|
| SG | `index` `login` `password-reset` `password-reset-confirm` `terms` `privacy` `daily-log` `community` `post-detail` `post-write` + 공통 모듈 3개 + `header` `footer` |
| 협업자 | `ai-chat` `my-page` + 각 페이지 HTML/CSS 퍼블리싱 |
| 백엔드 | Spring Boot + MySQL + JWT |

`daily-log` 는 diet(SG) + health-record(협업자, mock 데이터) 통합 과정에서 SG 가 이어받아 완성했습니다.
`community` `post-detail` `post-write` 는 HTML/CSS 는 협업자가 퍼블리싱하고 JS 는 SG 가 구현했습니다.

---

## 작업 순서

의존 관계를 고려한 순서입니다. 앞선 항목을 건너뛰면 뒤가 막힙니다.

```
0. 모달 컴포넌트          ← 완료 (SG)
1. community.js           ← 완료 (SG)
2. post-detail.js         ← 완료 (SG)
3. post-write.js          ← 완료 (SG) - 임시저장 버튼 추가로 마크업 일부 수정
4. my-page.js             ← 완료 (SG)
5. daily-log.js           ← 완료 (SG) - Chart.js 필요, diet.js + health-record.js 통합
6. ai-chat.js             ← 백엔드 AI 필요 (팀원 구현본 있음, 유지)
7. 소셜 로그인             ← 백엔드 OAuth 필요
```

프론트 페이지 JS 는 ai-chat(팀원 담당)을 빼고 전부 구현이 끝났습니다.
남은 것은 백엔드 연동과 비개발 항목입니다.

---

## 0. 모달 컴포넌트 (선행 작업)

`components.css` 에 `.modal` 클래스가 **존재하지 않습니다.**
마이페이지의 4개 기능이 전부 이것을 기다리고 있습니다.

```
#add-pet-btn                 반려견 등록 / 수정
#change-password-btn         비밀번호 변경
#notification-setting-btn    알림 설정
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

## 1. community.js — 완료 (7항목)

`community.html`(루트) · `styles/community.css` · `scripts/community.js`

| 기능 | 연결 지점 |
|---|---|
| 목록 조회 + 카드 렌더 | `GET /api/posts?page=&size=` → `#community-list` |
| 카테고리 필터 | `GET /api/posts?category=recipe` → `.community__filter` |
| 제목 검색 | `GET /api/posts?keyword=연어` |
| 태그 검색 | `GET /api/posts?tag=연어` — `#` 을 떼고 보냄 |
| 검색 초기화 | `#community-search-reset` |
| 페이지네이션 | 응답의 `totalPages` (없으면 `totalCount` 로 계산) |
| 빈 상태 문구 분기 | 검색 결과 없음 / 카테고리 없음 / 글 없음 |

한 페이지는 12개입니다. `card-grid` 가 3열이라 3의 배수여야 줄이 안 비어 보입니다.

### 지킨 계약

카드 링크는 홈과 동일한 형식입니다. 배지 매핑도 `index.js` 의 `CATEGORY_BADGE` 와 같습니다.

```js
link.href = "./post-detail.html?postId=" + encodeURIComponent(post.postId);
```

필터·검색이 바뀌면 항상 1페이지로 되돌립니다.
3페이지를 보던 중 필터를 바꾸면 결과가 1페이지뿐이라 빈 화면이 나오기 때문입니다.

### 만들지 않은 것

`community.css` 에 `.community__mode-switch` `.community__mode-title` `.community__mode-status`
세 선택자가 남아 있지만 **서버/로컬 모드 전환 UI 는 만들지 않기로 했습니다.**
서버 조회만 하고 실패하면 빈 상태로 처리합니다. 위 CSS 는 현재 쓰이지 않습니다.

---

## 2. post-detail.js — 완료 (10항목)

`post-detail.html`(루트) · `styles/post-detail.css` · `scripts/post-detail.js`

| 기능 | 엔드포인트 |
|---|---|
| 상세 조회 | `GET /api/posts/:postId` |
| 게시글 삭제 | `DELETE /api/posts/:postId` |
| 좋아요 토글 | `POST /api/posts/:postId/like` |
| 댓글 목록 | `GET /api/posts/:postId/comments` |
| 댓글 작성 | `POST /api/posts/:postId/comments` |
| 댓글 삭제 | `DELETE /api/posts/:postId/comments/:commentId` |

### 지킨 계약

```js
var params = new URLSearchParams(window.location.search);
var postId = params.get("postId");   // "id" 아님. 홈과 목록이 이 이름으로 링크를 만듦
```

본인 글일 때만 수정/삭제를 노출하고, 수정 링크에 `postId` 를 붙입니다.

```js
var isOwner = Boolean(me && post.authorId && me.userId === post.authorId);
```

댓글도 같은 방식으로 본인 것에만 삭제 버튼을 답니다.

### 이미지 갤러리

`#post-image-gallery` 안에 `.post-detail__image` 를 JS 가 만들어 넣습니다.
서버가 `imageUrls` 배열을 주기도 하고 `imageUrl` 하나만 주기도 해서 배열로 통일해 다룹니다.
이미지가 없으면 빈 격자가 남지 않도록 갤러리를 통째로 숨깁니다.

### 좋아요 낙관적 갱신

먼저 화면을 바꾸고 실패하면 되돌립니다.
요청이 오가는 중에 또 누르면 카운트가 어긋나므로 `likePending` 으로 막습니다.
서버가 확정값(`liked`, `likeCount`)을 주면 그것으로 다시 맞춥니다.

### 카테고리 배지

`#post-category` 에 `.badge--*` 클래스를 **JS 가 부여합니다.**
`post-detail.css` 는 기본 색만 담당하고 카테고리 색은 `components.css` 가 맡습니다.

---

## 3. post-write.js — 완료 (10항목)

`post-write.html`(루트) · `styles/post-write.css` · `scripts/post-write.js`

| 기능 | 비고 |
|---|---|
| 작성 / 수정 분기 | `?postId=` 가 있으면 수정 모드 (`GET` 으로 기존 값을 채움) |
| 제목 / 내용 카운터 | `maxlength` 와 동기화 |
| 이미지 검증 | 최대 3장 · 장당 5MB · JPG/PNG/WEBP |
| 이미지 미리보기 | `URL.createObjectURL` + 개별 삭제 시 즉시 해제 |
| 태그 입력 | Enter 추가 / Backspace 삭제 / 최대 5개 / 중복·공백 거부 |
| 폼 검증 | 제목·내용 필수 |
| 제출 | `POST /api/posts` · `PUT /api/posts/:postId` (둘 다 FormData) |
| 임시저장 | 수동 버튼 + localStorage (**새 글 모드에서만**) |
| 이탈 경고 | `beforeunload` |
| 로그인 필수 | `requireAuth()` |

### 마크업을 수정한 부분

이 페이지는 JS 만으로 끝나지 않고 마크업을 두 군데 고쳤습니다.

1. **임시저장 버튼 추가** — `.post-write__actions-right` 로 우측 묶음을 만들고
   그 안에 `#post-draft-save` 와 상태 표시 `#post-draft-status` 를 넣었습니다.
   `.post-write__actions` 가 `space-between` 이라 묶지 않으면 세 요소가 균등 분산됩니다.
   복원 안내 `#post-draft-restore` 도 폼 위에 추가했습니다.
2. **이미지 용량 문구 정정** — 마크업에는 "장당 1MB", 이 문서에는 5MB 로 적혀 있어
   어긋나 있었습니다. ROADMAP 기준(5MB)에 맞춰 마크업 문구를 고쳤습니다.

### 임시저장은 새 글에서만

수정 모드에서도 저장하면 원본과 초안이 뒤섞여 어느 쪽이 최신인지 알 수 없습니다.
수정 모드에서는 `#post-draft-save` 를 숨깁니다.

**이미지는 임시저장되지 않습니다.** `File` 객체는 직렬화되지 않기 때문이며,
복원 안내 문구에 이 사실을 함께 적었습니다.

### `Content-Type` 을 직접 넣지 마세요

```js
/* 금지 - boundary 가 빠져 서버가 파싱하지 못함 */
await fetch(url, { headers: { "Content-Type": "multipart/form-data" }, body: formData });

/* 올바름 */
await Api.upload("/api/posts", formData);
await Api.upload("/api/posts/3", formData, { method: "PUT" });
```

`api.js` 가 `FormData` 를 감지해 `Content-Type` 을 자동으로 생략합니다.

### 파일 크기와 형식 검증

```js
var MAX_IMAGE_COUNT = 3;
var MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB
var ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
```

**서버에서도 반드시 검증해야 합니다.** 클라이언트 검증은 우회됩니다.
값을 바꾸면 `post-write.html` 의 `#post-image-limit` 안내 문구도 함께 고치세요.

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

## 5. daily-log.js — 완료 (diet.js + health-record.js 통합)

**만들었던 파일** — `daily-log.html`(루트) · `styles/daily-log.css` · `scripts/daily-log.js`

`diet.html`(식단분석, SG 담당)과 `health-record.html`(건강기록, 협업자 담당·mock 데이터)이
따로 존재하면 같은 날의 섭취 칼로리를 두 화면에서 각각 다뤄야 해서
"먹은 것"과 "몸 상태"가 어긋날 위험이 있었습니다.
이를 막기 위해 두 페이지를 `daily-log.html` 하나로 합쳤습니다.
설계 근거는 `docs/DAILY-LOG-SPEC.md`, 엔드포인트 규약은
`docs/INTEGRATION-CHECKLIST.md` 3번 섹션 참고.

옛 엔드포인트 `GET/POST /api/pets/:petId/health/records`, `GET /api/pets/:petId/health/alerts`,
`POST /api/diet/log` 는 **더 이상 쓰지 않습니다.** 백엔드는 구현하지 마세요.

### 이식된 것

- 음식 검색 모달 (diet.js) → 식사 추가 모달 안으로, 한 끼에 여러 음식을 담을 수 있게 확장
- 체중 추이 Chart.js 차트 (health-record.js) → 체중 카드 클릭 시 모달로, 파괴 후 재생성 패턴 유지
- 배변 상태는 4버튼(정상/딱딱함/무름/설사)으로 단순화, 색만으로 구분하지 않고 텍스트 병기

### 건강 화면 카피 톤은 유지

건강 관련 블록(체중·배변·특이사항, 비만도·급여평균 카드)은 여전히 담백한 어투를 씁니다.

```
지양: 우리 아이한테 무슨 일이 있나 봐요
지향: 최근 2주간 체중이 12% 줄었어요
```

---

## 6. ai-chat.js — 7건

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

## 7. 소셜 로그인 (가장 마지막)

`login.html` 에 34줄이 주석 처리되어 있습니다.

### 프론트에서 할 일

```js
window.location.href = "/api/auth/oauth/kakao";
```

사실상 이게 전부입니다.

### 백엔드에서 할 일

`docs/INTEGRATION-CHECKLIST.md` 부록(소셜 로그인) 참고.

### 백엔드가 준비되기 전에 주석을 풀지 마세요

눌러도 404 가 나는 버튼이 3개 생깁니다.

---

## 백엔드 체크리스트

백엔드 관련 규약·요구사항은 전부 한 파일로 옮겼습니다.
**`docs/INTEGRATION-CHECKLIST.md`** 를 백엔드 담당자에게 전달하세요.
(엔드포인트 목록, 응답 필드, 이메일 인증 60초, CORS, 연동 시나리오 포함)

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
| 통합 검색 | 제거 확정 | 홈 검색바·헤더 아이콘·최근 검색어 전부 제거. 재료 검색은 식단 페이지 음식 검색 모달로 일원화 |

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

**인증 처리는 백엔드 주도**: 프론트는 페이지 진입을 선제 차단하지 않고,
백엔드 401 응답을 받으면 로그인으로 이동합니다 (복귀 경로 포함).
따라서 백엔드는 로그인 필수 API 전부에서 비인증 요청에 401 을 반환해야 합니다.


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
