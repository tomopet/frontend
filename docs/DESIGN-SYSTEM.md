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
| Primary | `--color-primary` | `#F2701F` | 버튼·칩 배경, CTA, 활성 상태 | 70% |
| Accent | `--color-accent` | `#1F7A52` | 안전/정상, AI 기능, 레시피 | 20% |
| Deep | `--color-deep` | `#2E2019` | 푸터 배경, 히어로 타이틀 | 10% |

`--color-success` 를 accent 와 같은 계열로 맞춰
**"안전 = 세이지 그린"** 이라는 직관이 서비스 전체에 일관됩니다.

### 텍스트

| 토큰 | 값 | 용도 | 대비 |
|---|---|---|---|
| `--color-text` | `#3D2E24` | 본문 기본 | 13.01:1 (흰 배경) |
| `--color-text-secondary` | `#755C4C` | 보조 설명 | 6.19:1 |
| `--color-text-muted` | `#7A6151` | 캡션·메타·플레이스홀더 | 4.5:1+ |
| `--color-text-on-primary` | `#2E2019` | primary 배경 위 글자 | 5.32:1 |
| `--color-text-on-accent` | `#FFFFFF` | accent 배경 위 글자 | 5.30:1 |

### 링크·텍스트 전용 딥 색

배경으로 쓰는 색과 글자로 쓰는 색을 **분리**했습니다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-primary-deep` | `#A83A0C` | 흰/틴트 배경 위 링크·텍스트 (6.41:1) |
| `--color-accent-deep` | `#146341` | 틴트 배경 위 텍스트 (5.97:1) |

### 표면·배경

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#FFFFFF` | 페이지 배경 (순백) |
| `--color-surface` | `#FFFFFF` | 카드·패널 배경 |
| `--color-surface-alt` | `#F2E8DC` | 보조 표면, 아이콘 칩, 이미지 플레이스홀더 |
| `--color-header-bg` | `#F2701F` | 헤더 밴드 (다크에서는 `#3D2318`) |
| `--color-backdrop` | `#2E2019` | 푸터 배경, 모달 백드롭 (다크에서도 어두움) |
| `--color-border` | `#EDE0D4` | 기본 헤어라인 |

### 상태 색 (배경과 짝)

| 상태 | 글자 토큰 | 배경 토큰 | 대비 |
|---|---|---|---|
| 성공 | `--color-success` `#146341` | `--color-success-bg` `#DCEDE3` | 4.55:1 |
| 경고 | `--color-warning` `#8F5A00` | `--color-warning-bg` `#FBEBCC` | 4.50:1 |
| 위험 | `--color-danger` `#C4241C` | `--color-danger-bg` `#FBE3E1` | 4.52:1 |
| 정보 | `--color-info` `#1A5FA8` | `--color-info-bg` `#DEEAF7` | 4.52:1 |

### 카테고리 색 (게시글 배지)

| 카테고리 | 글자 토큰 | 배경 토큰 | 대비 |
|---|---|---|---|
| 갤러리 | `--color-category-gallery` `#A8400E` | `...-gallery-bg` `#F9E3D8` | 4.56:1 |
| 레시피 | `--color-category-recipe` `#146341` | `...-recipe-bg` `#DCEDE3` | 5.28:1 |
| 자유 | `--color-category-free` `#5B3F91` | `...-free-bg` `#EAE2F5` | 5.13:1 |

---

## 1-1. 색 배치 구조

위에서 아래로 **색이 옅어집니다.**

```
헤더      --color-header-bg   #F2701F   진한 브랜드 색
검색 밴드  --color-primary-light #F9E3D8  연한 틴트
본문      --color-bg          #FFFFFF   순백
푸터      --color-backdrop    #2E2019   딥 (아래를 닫음)
```

### 배경이 순백이라 카드에 테두리가 필수입니다

```css
/* 카드도 흰색이므로 테두리가 없으면 배경에 묻힘 */
.card {
  background-color: var(--color-surface);   /* #FFFFFF */
  border: 1px solid var(--color-border);    /* 이게 없으면 경계가 사라짐 */
}
```

**그림자만으로는 부족합니다.** 순백 위 흰 카드는 그림자가 거의 안 보입니다.

### 헤더 밴드 위에서는 글자 색이 하나뿐입니다

`#F2701F` 위에서 대비 4.5:1 을 넘는 색은 **`--color-text-on-primary` 하나뿐**입니다.

```
#2E2019 (딥)      5.32:1  ✅  ← 이것만 가능
#5A3A1E (흐리게)   3.46:1  ❌
#FFFFFF (흰색)     2.95:1  ❌
```

그래서 **활성 메뉴를 색으로 구분할 수 없습니다.** 굵기와 밑줄로 표시합니다.

```css
.nav-list__link          { color: var(--color-text-on-primary); font-weight: 400; }
.nav-list__link--active  { font-weight: 700; }      /* 색이 아니라 굵기 */
.nav-list__link--active::after { background-color: var(--color-text-on-primary); }
```

### 헤더 위 요소는 반전시킵니다

헤더가 primary 색이므로 **primary 를 쓰는 요소는 오렌지 위 오렌지**가 되어 보이지 않습니다.

| 요소 | 일반 | 헤더 위 |
|---|---|---|
| 로고 마크 | primary 배경 | **딥 배경 + 오렌지 글자** |
| 버튼 | `.btn--primary` | **`.btn--on-header`** |
| 아이콘 버튼 | secondary 색 | **`text-on-primary`** |
| 아바타 | 테두리 없음 | **딥 테두리** |

---

## 2. 타이포그래피

**폰트: Pretendard 단일** (CDN 로드, SIL OFL 라이선스)

### 크기 토큰

| 토큰 | 크기 |
|---|---|
| `--font-size-xs` | 12px |
| `--font-size-sm` | 13px |
| `--font-size-md` | 14px |
| `--font-size-lg` | 16px |
| `--font-size-xl` | 18px |
| `--font-size-2xl` | 22px |
| `--font-size-3xl` | 40px |

### 어디에 무엇을 쓰는가 (이 표를 따르세요)

크기 표만 보고 매번 고민하지 않도록 용도를 못박았습니다.

| 요소 | 크기 | 굵기 | 색 |
|---|---|---|---|
| 페이지 제목 `<h1>` | `--font-size-2xl` 22px | `semibold` 600 | `--color-deep` |
| 페이지 설명 | `--font-size-md` 14px | `regular` 400 | `--color-text-secondary` |
| 섹션 제목 `<h2>` | `--font-size-lg` 16px | `semibold` 600 | `--color-deep` |
| 카드 제목 `<h3>` | `--font-size-md` 14px | `medium` 500 | `--color-deep` |
| 본문 | `--font-size-md` 14px | `regular` 400 | `--color-text` |
| 보조 설명 | `--font-size-sm` 13px | `regular` 400 | `--color-text-secondary` |
| 메타 · 캡션 | `--font-size-xs` 12px | `regular` 400 | `--color-text-muted` |
| 버튼 | `--font-size-md` 14px | `medium` 500 | 배경에 따라 |
| 배지 · 칩 | `--font-size-xs` 12px | `medium` 500 | 카테고리 색 |
| 폼 라벨 | `--font-size-sm` 13px | `medium` 500 | `--color-text-secondary` |
| 폼 힌트 | `--font-size-xs` 12px | `regular` 400 | `--color-text-muted` |
| 통계 숫자 | `--font-size-2xl` 22px | `bold` 700 | `--color-deep` |

`--font-size-3xl` (40px)은 현재 쓰이지 않습니다. 필요할 때만 쓰세요.

### 굵기

| 토큰 | 값 | 용도 |
|---|---|---|
| `--font-weight-regular` | 400 | 본문 |
| `--font-weight-medium` | 500 | 카드 제목, 버튼, 라벨 |
| `--font-weight-semibold` | 600 | 페이지·섹션 제목 |
| `--font-weight-bold` | 700 | 숫자 강조 |

**700 이상은 쓰지 마세요.** Pretendard 는 600에서 이미 충분히 굵고,
700을 남발하면 위계가 무너집니다.

### 행간

| 토큰 | 값 | 용도 |
|---|---|---|
| `--line-height-tight` | 1.3 | 제목 |
| `--line-height-base` | 1.6 | 본문 |
| `--line-height-loose` | 1.8 | 긴 설명문 (약관 등) |

### 숫자에는 tabular-nums

가격, 통계, 차트 축, 체중처럼 **숫자가 주 내용인 요소**에는 반드시 넣으세요.

```css
.stats__value {
  font-variant-numeric: tabular-nums;
}
```

없으면 숫자 폭이 제각각이라 로딩 중 `-` 에서 실제 값으로 바뀔 때 레이아웃이 흔들립니다.

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

### 여백 리듬 (이 값을 따르세요)

간격을 매번 고민하지 않도록 용도를 못박았습니다.

| 위치 | 값 |
|---|---|
| 섹션과 섹션 사이 | `--spacing-3xl` 64px |
| 섹션 제목과 내용 | `--spacing-md` 16px |
| 카드 사이 | `--spacing-md` 16px |
| 카드 내부 패딩 | `--spacing-lg` 24px |
| 폼 필드 사이 | `--spacing-md` 16px |
| 라벨과 인풋 | `--spacing-2xs` 4px |
| 인풋과 힌트 | `--spacing-2xs` 4px |
| 버튼 사이 | `--spacing-sm` 12px |
| 아이콘과 텍스트 | `--spacing-2xs` 4px |

**임의의 px 를 쓰지 마세요.** 4px 배수 체계가 무너지면 화면 전체의 리듬이 어긋납니다.

---

## 4. 모서리 반경 (Radius)

요소 크기별로 반경을 다르게 줘 위계를 만듭니다. (AI 티 나는 균일한 라운딩 방지)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--radius-sm` | 6px | 인풋·셀렉트 |
| `--radius-md` | 8px | 버튼 |
| `--radius-lg` | 10px | 카드 · 바로가기 칩 |
| `--radius-xl` | 16px | 대형 패널·모달 |
| `--radius-full` | 9999px | 칩·아바타 |

---

## 4-1. 아이콘

SVG 인라인으로 넣습니다. 아이콘 폰트나 이미지 파일을 쓰지 않습니다.

| 용도 | 크기 | 굵기 |
|---|---|---|
| 인라인 (텍스트 옆) | 13~16px | `stroke-width: 1.6` |
| 버튼 안 | 18px | `stroke-width: 1.6` |
| 바로가기 칩 | 23px | `stroke-width: 1.6` |
| 장식 | 24px 이하 | |

### 규칙

```html
<!-- 색은 currentColor - 부모의 color 를 따라감 -->
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="..." stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>
```

- **`fill` 대신 `stroke`** — 아웃라인 스타일로 통일. 채운 아이콘은 무거워 보입니다.
- **`stroke-width: 1.6`** — 전 아이콘 동일. 1이면 얇아서 흐려 보이고, 2면 뭉툭합니다.
- **`currentColor`** — 하드코딩하면 다크모드에서 안 바뀝니다.
- **장식이면 `aria-hidden="true"`** — 옆에 텍스트가 있으면 아이콘은 장식입니다.
- **아이콘만 있는 버튼은 `aria-label` 필수** — 스크린리더가 읽을 게 없습니다.

### 바로가기 칩 규격

```
칩 크기      50 × 50px
칩 반경      --radius-lg (10px)
칩 배경      --color-surface-alt
칩 테두리    1px solid --color-border
아이콘 색    --color-primary-deep
아이콘 크기  23px
```

**칩 배경에 카테고리 색을 쓰지 마세요.** 6개가 각각 다른 색이면 시선이 분산되어
정작 중요한 검색이 묻힙니다. 배경은 중성으로 통일하고 아이콘만 브랜드 색을 씁니다.

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
흰 글자 on #F2701F  →  2.95:1  ❌ WCAG 미달
딥 글자 on #F2701F  →  5.32:1  ✅ 통과
```

```css
/* 잘못됨 */
.btn--primary { background: var(--color-primary); color: #FFFFFF; }

/* 올바름 */
.btn--primary { background: var(--color-primary); color: var(--color-text-on-primary); }
```

accent(초록) 배경에는 반대로 **흰 글자**를 씁니다. (`--color-text-on-accent`)

## 주의 3-1. 헤더 밴드 위에는 primary 를 쓰지 마세요

헤더 자체가 primary 색입니다. 그 위에 `.btn--primary` 를 놓으면 **오렌지 위 오렌지**라 안 보입니다.

```html
<!-- 잘못됨 -->
<a class="btn btn--primary btn--sm">로그인</a>

<!-- 올바름 - 반전 -->
<a class="btn btn--on-header btn--sm">로그인</a>
```

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
.card  { border-radius: var(--radius-lg); }   /* 10px */
.modal { border-radius: var(--radius-xl); }   /* 16px */
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
