# TOMOPET 디자인 시스템

모든 값은 `styles/variables.css` 에 CSS 변수(토큰)로 정의되어 있습니다.
**직접 `#hex` 나 `px` 를 쓰지 말고 반드시 토큰(`var(--...)`)을 사용하세요.**
토큰을 쓰면 다크모드가 자동으로 대응되고, 값이 바뀌어도 전 페이지에 일괄 적용됩니다.

이 문서는 기준표(무엇이 있는지)와 사용법(어떻게 쓰는지)으로 나뉩니다.

---

## 1. 색상

### 브랜드 색 — 70 / 20 / 10 비율

| 역할 | 토큰 | 값 | 용도 | 비율 |
|---|---|---|---|:---:|
| Primary | `--color-primary` | `#E8845F` | 버튼·칩 배경, CTA, 활성 상태 | 70% |
| Accent | `--color-accent` | `#567F63` | 안전/정상, AI 기능, 레시피 | 20% |
| Deep | `--color-deep` | `#2E2019` | 푸터 배경, 히어로 타이틀 | 10% |

`--color-success` 를 accent 와 같은 계열로 맞춰
**"안전 = 세이지 그린"** 이라는 직관이 서비스 전체에 일관됩니다.

### 텍스트

| 토큰 | 값 | 용도 | 대비 |
|---|---|---|---|
| `--color-text` | `#3D2E24` | 본문 기본 | 13.01:1 (흰 배경) |
| `--color-text-secondary` | `#7D6555` | 보조 설명 | 5.43:1 |
| `--color-text-muted` | `#826B5C` | 캡션·메타·플레이스홀더 | 4.5:1+ |
| `--color-text-on-primary` | `#2E2019` | primary 배경 위 글자 | 5.91:1 |
| `--color-text-on-accent` | `#FFFFFF` | accent 배경 위 글자 | 4.55:1 |

### 링크·텍스트 전용 딥 색

배경으로 쓰는 색과 글자로 쓰는 색을 **분리**했습니다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-primary-deep` | `#A8502F` | 흰/틴트 배경 위 링크·텍스트 (5.45:1) |
| `--color-accent-deep` | `#3F6B4E` | 틴트 배경 위 텍스트 (5.28:1) |

### 표면·배경

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#FDF8F3` | 페이지 최하단 배경 |
| `--color-surface` | `#FFFFFF` | 카드·패널 배경 |
| `--color-surface-alt` | `#F9F3EC` | 보조 표면, 이미지 플레이스홀더 |
| `--color-border` | `#EDE0D4` | 기본 헤어라인 |

### 상태 색 (배경과 짝)

| 상태 | 글자 토큰 | 배경 토큰 | 대비 |
|---|---|---|---|
| 성공 | `--color-success` `#4E745B` | `--color-success-bg` `#E8F0EA` | 4.55:1 |
| 경고 | `--color-warning` `#9A621D` | `--color-warning-bg` `#FBF0DF` | 4.50:1 |
| 위험 | `--color-danger` `#C83434` | `--color-danger-bg` `#FBEAEA` | 4.52:1 |
| 정보 | `--color-info` `#4570A0` | `--color-info-bg` `#EAF1F8` | 4.52:1 |

### 카테고리 색 (게시글 배지)

| 카테고리 | 글자 토큰 | 배경 토큰 | 대비 |
|---|---|---|---|
| 갤러리 | `--color-category-gallery` `#AA5434` | `...-gallery-bg` `#FBEDE6` | 4.56:1 |
| 레시피 | `--color-category-recipe` `#3F6B4E` | `...-recipe-bg` `#E8F0EA` | 5.28:1 |
| 자유 | `--color-category-free` `#6E5A8A` | `...-free-bg` `#F0EBF5` | 5.13:1 |

---

## 2. 타이포그래피

**폰트: Pretendard 단일** (CDN 로드, SIL OFL 라이선스)

| 토큰 | 크기 | 용도 |
|---|---|---|
| `--font-size-xs` | 12px | 캡션·메타 |
| `--font-size-sm` | 13px | 보조 텍스트 |
| `--font-size-md` | 14px | 본문 기본 |
| `--font-size-lg` | 16px | 카드 제목 |
| `--font-size-xl` | 18px | 섹션 제목 |
| `--font-size-2xl` | 22px | 페이지 타이틀 |
| `--font-size-3xl` | 40px | 히어로 타이틀 |

| 굵기 토큰 | 값 |
|---|---|
| `--font-weight-regular` | 400 |
| `--font-weight-medium` | 500 |
| `--font-weight-semibold` | 600 |
| `--font-weight-bold` | 700 |

| 행간 토큰 | 값 | 용도 |
|---|---|---|
| `--line-height-tight` | 1.3 | 제목 |
| `--line-height-base` | 1.6 | 본문 |
| `--line-height-loose` | 1.8 | 긴 설명문 |

숫자가 주 내용인 요소(가격·통계·차트 축)에는
`font-variant-numeric: tabular-nums` 를 함께 지정해 자릿수 정렬을 맞춥니다.

---

## 3. 간격 (Spacing)

4px 배수 체계입니다.

| 토큰 | 값 |
|---|---|
| `--spacing-2xs` | 4px |
| `--spacing-xs` | 8px |
| `--spacing-sm` | 12px |
| `--spacing-md` | 16px |
| `--spacing-lg` | 24px |
| `--spacing-xl` | 32px |
| `--spacing-2xl` | 48px |
| `--spacing-3xl` | 64px |

---

## 4. 모서리 반경 (Radius)

요소 크기별로 반경을 다르게 줘 위계를 만듭니다. (AI 티 나는 균일한 라운딩 방지)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--radius-sm` | 6px | 인풋·셀렉트 |
| `--radius-md` | 8px | 버튼 |
| `--radius-lg` | 18px | 카드 |
| `--radius-xl` | 28px | 대형 패널·모달 |
| `--radius-full` | 9999px | 칩·아바타 |

---

## 5. 그림자·전환·레이아웃

| 토큰 | 용도 |
|---|---|
| `--shadow-sm` | 살짝 뜬 표면 |
| `--shadow-md` | 카드 |
| `--shadow-lg` | 강조 카드·팝오버 |
| `--shadow-focus` | 포커스 링 |

| 토큰 | 값 | 용도 |
|---|---|---|
| `--transition-fast` | 120ms | 색·호버 |
| `--transition-base` | 200ms | 일반 |
| `--transition-slow` | 320ms | 큰 이동 |

| 토큰 | 값 | 용도 |
|---|---|---|
| `--layout-max-width` | 1200px | 콘텐츠 최대 폭 |
| `--layout-max-width-narrow` | 720px | 상세·폼 페이지 폭 |
| `--layout-min-width` | 1024px | 최소 지원 폭 |
| `--header-height` | 64px | 헤더 높이 |
| `--sidebar-width` | 220px | 사이드바 폭 |

### z-index 층

| 토큰 | 값 |
|---|---|
| `--z-dropdown` | 100 |
| `--z-sticky` | 200 |
| `--z-overlay` | 300 |
| `--z-modal` | 400 |
| `--z-toast` | 500 |

`z-index` 는 이 토큰만 쓰세요. 임의의 `9999` 같은 값을 넣으면 층이 꼬입니다.
(단, `<dialog>` 로 만든 모달은 브라우저 최상위 레이어라 `z-index` 가 불필요합니다.)

---

## 6. 다크모드

기본값은 **사용자의 OS 설정**을 따르고, 마이페이지에서 직접 바꿀 수 있습니다.

| `<html>` 상태 | 결과 |
|---|---|
| 속성 없음 | OS 설정을 따름 |
| `data-theme="light"` | 라이트 강제 |
| `data-theme="dark"` | 다크 강제 |

```css
/* OS 가 다크 + 사용자가 라이트로 강제하지 않았을 때 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { ... }
}

/* 사용자가 직접 고른 값이 항상 우선 */
[data-theme="dark"] { ... }
```

`scripts/theme.js` 가 `<head>` 에서 저장값(`tomopet_theme`)을 읽어 적용합니다.
**`<body>` 뒤나 `defer` 로 두면 흰 화면이 한 번 그려진 뒤 어두워져 눈에 띄게 번쩍입니다.**

```js
window.TomopetTheme.get()           // "system" | "light" | "dark"
window.TomopetTheme.getEffective()  // 실제 적용된 "light" | "dark"
window.TomopetTheme.set("dark")
```

### 토큰만 쓰면 다크모드는 자동입니다

`var(--color-text)` 로 쓴 글자는 다크에서 알아서 밝아집니다.
`#3D2E24` 를 직접 쓰면 안 바뀌어 배경에 묻힙니다. **이것이 토큰을 써야 하는 핵심 이유입니다.**

### `--color-deep` 과 `--color-backdrop` 은 다릅니다

`--color-deep` 은 **글자용**이라 다크에서 밝은 톤(`#F0EAE4`)이 됩니다.
푸터 배경과 모달 백드롭처럼 **다크에서도 어두워야 하는 곳**은 `--color-backdrop` 을 쓰세요.

```css
.site-footer { background-color: var(--color-backdrop); }   /* 항상 어두움 */
.card__title { color: var(--color-deep); }                  /* 다크에선 밝아짐 */
```

다크 팔레트의 모든 조합도 대비 4.5:1 이상으로 검증돼 있습니다.

---

## 7. 사용 주의사항

자주 나오는 실수와 그 이유입니다.

## 주의 1. 토큰만 쓰기 — 하드코딩 금지

```css
/* 잘못됨 - 다크모드 대응 안 됨, 값 바뀌면 일일이 수정 */
.my-card { color: #3D2E24; padding: 16px; border-radius: 18px; }

/* 올바름 */
.my-card {
  color: var(--color-text);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
}
```

## 주의 2. 브랜드 색은 "클릭 가능한 것"에만

가격·칼로리처럼 클릭 안 되는 정적 수치에 브랜드 색(주황)을 쓰면
사용자가 링크로 오인합니다.

```css
/* 잘못됨 - 가격인데 링크처럼 보임 */
.price { color: var(--color-primary-deep); }

/* 올바름 - 정적 수치는 딥 색 */
.price { color: var(--color-deep); font-variant-numeric: tabular-nums; }
```

| 대상 | 색 |
|---|---|
| 링크·버튼 | `--color-primary` / `--color-primary-deep` |
| 가격·칼로리·통계 | `--color-deep` |
| 장식 요소 | `currentColor` |

## 주의 3. primary 배경 위엔 흰 글자 금지

```
흰 글자 on #E8845F  →  2.66:1  ❌ WCAG 미달
딥 글자 on #E8845F  →  5.91:1  ✅ 통과
```

```css
/* 잘못됨 */
.btn--primary { background: var(--color-primary); color: #FFFFFF; }

/* 올바름 */
.btn--primary { background: var(--color-primary); color: var(--color-text-on-primary); }
```

accent(초록) 배경에는 반대로 **흰 글자**를 씁니다. (`--color-text-on-accent`)

## 주의 4. 상태는 색 + 도형 + 텍스트 3중으로

적록색약 사용자에게 세이지(정상)와 앰버(주의)는 **1.84:1** 로 거의 같은 색입니다.
색 하나로만 상태를 구분하면 안 됩니다. (WCAG 1.4.1)

`.status-chip` 이 색 + 도형(원/삼각/사각) + 텍스트를 함께 표시합니다.

| 상태 | 클래스 | 색 | 도형 |
|---|---|---|---|
| 정상 | `.status-chip--normal` | 세이지 | 원 |
| 주의 | `.status-chip--caution` | 앰버 | 삼각 |
| 위험 | `.status-chip--danger` | 레드 | 사각 |
| 없음 | `.status-chip--none` | 그레이 | 빈 원 |

```html
<span class="status-chip status-chip--caution">주의</span>
```

상태 클래스를 바꿀 때는 기존 것을 모두 제거하고 부여하세요.

```js
el.classList.remove("status-chip--normal","status-chip--caution",
                    "status-chip--danger","status-chip--none");
el.classList.add("status-chip--" + tone);
el.textContent = label;   // 텍스트도 반드시 함께
```

## 주의 5. 새 색을 만들면 대비 재검증

부득이하게 토큰에 없는 색을 써야 하면, 만든 뒤 대비를 확인하세요.

- 본문 텍스트: **4.5:1 이상**
- 대형 텍스트(24px 이상 또는 18px 볼드): 3:1 이상

Chrome DevTools → Elements → 색상 스와치 클릭 → 대비 비율 표시

## 주의 6. 반경은 크기에 맞게

전부 같은 반경을 주면 AI가 찍어낸 듯한 느낌이 납니다.
작은 요소는 작은 반경, 큰 요소는 큰 반경을 쓰세요.

```css
input  { border-radius: var(--radius-sm); }   /*  6px */
button { border-radius: var(--radius-md); }   /*  8px */
.card  { border-radius: var(--radius-lg); }   /* 18px */
.modal { border-radius: var(--radius-xl); }   /* 28px */
```

## 주의 7. 데스크톱 전용 — @media 금지

이 프로젝트는 최소 폭 1024px 데스크톱 전용입니다.
반응형 `@media` 를 추가하지 마세요.

`common.css` 의 `@media (prefers-reduced-motion)` 은 반응형이 아니라
전정기관 장애 사용자를 위한 접근성 대응이므로 예외입니다.

## 주의 8. `[hidden]` 규칙을 지우지 말 것

```css
/* common.css - 이 줄을 지우면 안 됨 */
[hidden] { display: none !important; }
```

`.empty-state { display: grid }` 처럼 `display` 를 지정한 요소는
브라우저 기본값 `[hidden] { display: none }` 을 덮어씁니다.
이 규칙이 없으면 JS 로 `el.hidden = true` 를 줘도 안 숨겨집니다.

---

## 빠른 체크리스트

새 스타일을 만든 뒤 아래를 확인하세요.

- [ ] `#hex` / `px` 하드코딩 없이 `var(--...)` 토큰만 썼다
- [ ] 정적 수치에 브랜드 색을 쓰지 않았다
- [ ] primary 배경 위에 흰 글자를 쓰지 않았다
- [ ] 상태를 색만으로 구분하지 않았다 (도형 + 텍스트 포함)
- [ ] 새로 만든 색의 대비가 4.5:1 이상이다
- [ ] 요소 크기에 맞는 반경을 썼다
- [ ] `@media` 를 추가하지 않았다
- [ ] `[hidden]` 규칙을 건드리지 않았다
