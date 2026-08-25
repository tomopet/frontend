# TOMOPET 작업 인수인계 (다음 세션용)

이 문서 + 최신 zip 을 새 대화에 올리면 그대로 이어서 진행할 수 있습니다.

검색 키워드: 인수인계, 다음 작업, 진행 상황, 커뮤니티, 데일리로그, daily-log

---

## 지금 상태 한 줄 요약

**프론트 페이지 JS 는 전부 구현이 끝났습니다.** 남은 것은 백엔드 연동과 비개발 항목입니다.

---

## 다음에 할 일

프론트에 새로 만들 페이지는 없습니다. 우선순위 순으로:

1. **백엔드 연동** — `docs/INTEGRATION-CHECKLIST.md` 를 백엔드 담당자에게 전달.
   특히 3번(식단 달력 5종)과 3-2번(게시글·댓글) 섹션이 신규입니다.
2. **`scripts/api.js` 의 `DEPLOY_API_URL`** 채우기 — 지금 빈 문자열이라 배포본은 같은 오리진으로 요청합니다.
3. **비개발 항목** — 아래 미완료 목록 참고 (캐릭터 이미지, 약관 [확인 필요] 3곳, og:url/og:image)
4. **소셜 로그인** — 백엔드 OAuth 준비 후. `login.html` 에 34줄이 주석 처리되어 있습니다.
   **백엔드가 준비되기 전에 주석을 풀지 마세요.** 눌러도 404 나는 버튼이 3개 생깁니다.

---

## 이번 세션에서 한 일 — 커뮤니티 3종 구현

`community.js` `post-detail.js` `post-write.js` 는 `_example-page.js` 를 복사만 해둔
97줄짜리 견본 뼈대였습니다(`/api/example` 을 호출하고 DOM id 도 `example-list` 였음).
셋 다 실제 마크업에 맞춰 구현했습니다. HTML/CSS 는 이미 완성돼 있어 JS 만 붙였습니다.

### community.js (7항목)

목록 조회, 카테고리 필터 4버튼, 제목/태그 검색, 검색 초기화, 페이지네이션,
결과 개수, 빈 상태 문구 분기(검색 없음 / 카테고리 없음 / 글 없음).
한 페이지 12개(`card-grid` 3열이라 3의 배수).

- 태그 검색은 `#태그명` 형식만 받고, 서버에는 `#` 을 떼고 `tag=` 로 보냅니다.
- 필터·검색이 바뀌면 항상 1페이지로 리셋합니다.

### post-detail.js (10항목)

상세 조회, 이미지 갤러리, 좋아요 낙관적 토글, 본인 글 판정, 게시글 삭제 모달,
댓글 목록/작성/삭제, 댓글 삭제 모달, 빈 상태 포커스 버튼, `postId` 없는 접근 방어.

- 좋아요는 먼저 화면을 바꾸고 실패하면 되돌립니다. `likePending` 으로 연타를 막습니다.
- `#post-category` 에 `.badge--*` 를 **JS 가 부여**합니다 (`post-detail.css` 주석의 계약).

### post-write.js (10항목) + 마크업 수정

작성/수정 분기, 제목·내용 카운터, 이미지 검증·미리보기·개별삭제,
태그 Enter/Backspace, 폼 검증, FormData 제출, 임시저장, 이탈 경고, `requireAuth`.

**이 페이지만 마크업을 고쳤습니다:**

1. `post-write.html` 에 임시저장 UI 추가 — `#post-draft-save` `#post-draft-status`
   `#post-draft-restore`(복원 안내) + `.post-write__actions-right` 묶음
2. `post-write.css` 에 위 4개 클래스 스타일 추가 (기존 토큰만 사용)
3. 이미지 안내 문구 **"장당 1MB" → "장당 5MB"** — 마크업과 ROADMAP 이 어긋나 있어 ROADMAP 기준으로 통일
4. `#post-image-input` 에 `aria-describedby="post-image-limit"` 추가 (제한 안내가 스크린리더에 안 읽히던 문제)

---

## 이번 세션에서 잡은 버그 3건

검수 과정에서 나온 것들입니다. 같은 실수를 반복하지 않도록 남깁니다.

| 파일 | 문제 | 조치 |
|---|---|---|
| `post-detail.html` | 댓글 폼에 **`novalidate` 누락** — 브라우저 기본 검증이 JS 검증을 가로채 `#comment-content-error` 가 영영 안 뜸. 프로젝트 폼 14개 중 이것만 달랐음 | `novalidate` 추가 |
| `community.js` | `renderPagination` 이 `totalPages <= 1` 일 때 조기 반환하며 상태 텍스트를 안 고쳐, `aria-live` 영역에 낡은 "2 / 3" 이 남음 | 숨기기 전에 값을 먼저 갱신하도록 수정 |
| `post-write.js` | 제출 분기에 잘못된 삼항식(`await Api.post !== undefined ? ...`)이 들어가 있었음 | `Api.upload("/api/posts", formData)` 로 정정 |

### 고치지 않고 남긴 것

`scripts/ai-chat.js` 가 `is-ready` 클래스를 붙였다 떼는데 **`ai-chat.css` 에 정의가 없습니다.**
아무 시각 효과가 없는 죽은 코드입니다. ai-chat 은 협업자 담당이라
`CONTRIBUTING.md` 1번(남의 파일은 먼저 논의) 원칙에 따라 손대지 않았습니다. 팀에 공유하세요.

---

## 검수 방법 (다음에도 그대로 쓰면 됩니다)

이번 세션에서 만든 검수 도구는 zip 에 포함되지 않았습니다(작업용 임시 파일).
같은 검사를 다시 하려면 아래를 확인하세요.

**정적 검수** — 12개 HTML 전수 검사

- JS 가 참조하는 DOM id 가 해당 HTML 에 실제로 있는지
- JS 가 만드는 CSS 클래스가 CSS 에 정의돼 있는지
- 중복 id, 빈 `src`, `img` alt 누락, `button` type 누락
- 끊어진 페이지/CSS/스크립트 링크
- 스크립트 로드 순서 (`layout.js` 는 defer 없이 첫 번째)
- `innerHTML` / 직접 `fetch` / 인라인 style / 인라인 `<script>` / 반응형 `@media`
- 폼마다 `novalidate` 일관성 ← 위 버그를 잡은 검사
- `?postId=` 링크 계약, `CATEGORY_BADGE` 3개 파일 일치, `NAV_PARENT_MAP`, `data-nav` 일치

**동적 검수** — mock 백엔드 + Playwright

- community: 목록/필터/검색/페이지네이션/빈상태 26항목
- post-detail: 상세/좋아요/댓글 CRUD/삭제모달/잘못된접근 24항목
- post-write: 카운터/이미지검증/태그/임시저장/제출/수정모드 30항목
- 전 페이지 스모크: 12개 페이지 미처리 예외 0건, 헤더·푸터 삽입, 활성 메뉴

결과: **정적 문제 0건, 동적 실패 0건, 미처리 예외 0건.**

---

## 주요 결정 사항 (누적)

**인증**: 프론트 가드 제거함(`requireAuth` 항상 통과). 백엔드 401 주도 방식.
비로그인 접근 차단은 백엔드가 401 반환 → `api.js` 가 로그인으로 보냄(복귀경로 포함).

**API 주소**: 환경 자동 감지. localhost → localhost:8080, 배포 → `DEPLOY_API_URL`(아직 빈값).

**검색**: 홈 검색바·헤더 아이콘·최근검색어 전부 제거함.
재료 검색은 식단 달력의 식사 추가 모달로 일원화.
커뮤니티 검색은 별개(글 제목/태그)이며 목록 페이지 안에 있습니다.

**디자인**: 테라코타 유지 확정. 바로가기 아이콘 4종.

**차트**: Chart.js 채택(CDN). "Vanilla JS 의존성0" 방침의 유일한 예외로 README/ROADMAP 에 문서화 완료.

**커뮤니티 모드 전환**: `community.css` 에 `.community__mode-*` 선택자가 있지만
**서버/로컬 모드 전환 UI 는 만들지 않기로 결정**했습니다. 해당 CSS 는 현재 미사용입니다.

**임시저장**: 수동 버튼 방식. 새 글 모드에서만 동작하고 이미지는 저장되지 않습니다
(`File` 객체 직렬화 불가). 수정 모드에서는 버튼을 숨깁니다.

---

## 추후 수정/확인할 점 (미완료 목록)

**코드 작업 (프론트)**: 없음 — 페이지 JS 전부 구현 완료

**백엔드 전달 (`docs/INTEGRATION-CHECKLIST.md`)**:
- [ ] 이메일 인증 API 2종 (send/verify), 60초 만료 서버 판정
- [ ] 로그인은 `username` 파라미터 (email 아님)
- [ ] 모든 로그인필수 API 401 반환 (프론트 가드 없음)
- [ ] daily-log API 5종 (3번 섹션)
- [ ] 게시글·댓글 API (3-2번 섹션) — 특히 `authorId` 필수, `tags` 반복키, `POST /api/posts` 응답에 `postId`
- [ ] `/api/breeds` 견종목록, `POST/PUT /api/pets` (my-page 가 씀)
- [ ] `/api/breeds/standards` (daily-log 비만도 카드용, 아직 프론트는 mock 사용 중)

**비개발 (팀/SG)**:
- [ ] 캐릭터 이미지 2장: 히어로 320×320(투명 png 추천), 빈상태 192×192
- [ ] 약관/개인정보 [확인 필요] 3곳: 보호책임자명, 위탁업체명, 고객센터 메일
- [ ] 배포 후 `og:url` / `og:image` 실제 주소로
- [ ] `scripts/api.js` 의 `DEPLOY_API_URL` 채우기

---

## 현재 버전 상태

- 마지막 실제 배포본: v24 (검색 제거까지) 이후 로컬에서 v25~v29 디자인 수정들
- 팀원 git pull 분(ai-chat) 반영됨, health-record 는 daily-log 로 대체되며 제거
- 그 위에 daily-log 본체 + 커뮤니티 3종(community / post-detail / post-write) 구현 완료
- GitHub `main` 기준으로는 daily-log 와 커뮤니티 3종이 아직 미반영 상태일 수 있으니
  push 전에 `git pull origin main` 으로 팀원 작업을 먼저 확인하세요
