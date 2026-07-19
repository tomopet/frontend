/* ============================================================
   TOMOPET | scripts/ui.js
   검색 키워드: 화면 헬퍼, 렌더링, 목록, 빈 상태, 로딩 버튼, 폼 오류, 토스트, 알림, 날짜 포맷, 숫자 포맷
   DOM 조작 및 표시 형식 공통 모듈

   적용 범위: 전체 페이지 공통
   로드 위치: api.js 다음, 페이지 전용 스크립트 앞

   제공
     window.TomopetUi.$ / $$              요소 조회
     window.TomopetUi.createEl            요소 생성 (XSS 안전)
     window.TomopetUi.createThumb         이미지 플레이스홀더
     window.TomopetUi.clearChildren       자식 노드 제거
     window.TomopetUi.renderList          목록 렌더링 + 빈 상태 처리
     window.TomopetUi.toggleEmptyState    빈 상태 토글
     window.TomopetUi.showView            여러 뷰 중 하나만 노출
     window.TomopetUi.setFieldError       필드 오류 표시/해제
     window.TomopetUi.setFormMessage      폼 상단 배너
     window.TomopetUi.setLoading          버튼 로딩 상태
     window.TomopetUi.formatNumber        1234 -> "1,234"
     window.TomopetUi.formatPrice         34900 -> "34,900원"
     window.TomopetUi.formatDate          ISO -> "2026. 7. 9."
     window.TomopetUi.formatRelativeTime  ISO -> "3시간 전"

   XSS 방지
     문자열은 전부 textContent 로 삽입
     innerHTML 은 이 파일 어디에서도 사용하지 않음
   ============================================================ */

(function () {
  "use strict";

  /* ==========================================================
     요소 조회
     ========================================================== */

  /* id 로 단일 요소 조회 */
  function $(id) {
    return document.getElementById(id);
  }

  /* 선택자로 복수 요소 조회, 항상 배열 반환 */
  function $$(selector, root) {
    return Array.prototype.slice.call(
      (root || document).querySelectorAll(selector)
    );
  }


  /* ==========================================================
     요소 생성
     ========================================================== */

  /* 텍스트는 반드시 textContent 로 삽입
     서버가 <img src=x onerror=...> 를 내려줘도 문자열로 표시됨 */
  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }

  /* 썸네일 컨테이너
     이미지 URL 이 없으면 img 를 만들지 않음
     빈 src 는 문서 URL 로 해석되어 현재 페이지를 다시 내려받음 */
  function createThumb(imageUrl, altText, extraClass) {
    var thumb = createEl("div", "thumb" + (extraClass ? " " + extraClass : ""));
    if (!imageUrl) return thumb;

    var img = document.createElement("img");
    img.src = imageUrl;
    img.alt = altText || "";
    img.loading = "lazy";
    thumb.appendChild(img);
    return thumb;
  }

  /* innerHTML = "" 보다 안전하고 빠름 */
  function clearChildren(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }


  /* ==========================================================
     목록 렌더링
     ========================================================== */

  /* 빈 상태를 목록과 배타적으로 노출 */
  function toggleEmptyState(emptyEl, hasItems) {
    if (emptyEl) emptyEl.hidden = Boolean(hasItems);
  }

  /* 목록을 비우고 다시 채운 뒤 빈 상태를 갱신

     listEl     대상 ul/ol
     items      배열
     createItem 각 항목을 li 로 만드는 함수
     emptyEl    데이터가 없을 때 노출할 요소 (선택)

     DocumentFragment 에 모아 한 번에 삽입하여 리플로우를 최소화 */
  function renderList(listEl, items, createItem, emptyEl) {
    if (!listEl) return 0;

    clearChildren(listEl);

    var list = Array.isArray(items) ? items : [];
    if (list.length === 0) {
      toggleEmptyState(emptyEl, false);
      return 0;
    }

    var fragment = document.createDocumentFragment();
    list.forEach(function (item, index) {
      var node = createItem(item, index);
      if (node) fragment.appendChild(node);
    });
    listEl.appendChild(fragment);

    toggleEmptyState(emptyEl, true);
    return list.length;
  }


  /* ==========================================================
     뷰 전환

     하나만 노출하고 나머지는 숨김
     비밀번호 재설정처럼 한 페이지에 여러 단계가 있는 경우 사용

     common.css 의 [hidden] { display: none !important } 규칙이
     있어야 display:grid 인 요소도 정상적으로 숨겨짐
     ========================================================== */
  function showView(activeEl, allEls) {
    if (!Array.isArray(allEls)) return;
    allEls.forEach(function (el) {
      if (el) el.hidden = el !== activeEl;
    });
  }


  /* ==========================================================
     폼 상태 표시
     ========================================================== */

  /* 필드 오류 표시 및 해제
     message 가 비어있으면 오류 상태를 해제함

     aria-invalid 와 aria-describedby 를 함께 설정해
     스크린리더가 오류 내용을 읽어줌 */
  function setFieldError(input, errorEl, message) {
    if (!input || !errorEl) return;

    if (message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      input.classList.add("form-field__input--error");
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", errorEl.id);
    } else {
      errorEl.textContent = "";
      errorEl.hidden = true;
      input.classList.remove("form-field__input--error");
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  }

  /* 폼 상단 배너
     type: "danger" | "success" | "warning" | "info" */
  function setFormMessage(el, message, type) {
    if (!el) return;

    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }

    el.classList.remove(
      "banner--danger",
      "banner--success",
      "banner--warning",
      "banner--info"
    );
    el.classList.add("banner--" + (type || "danger"));
    el.textContent = message;
    el.hidden = false;
  }

  /* 제출 버튼 로딩 상태
     중복 제출을 막기 위해 disabled 처리
     원래 텍스트는 data 속성에 보관했다가 복원 */
  function setLoading(button, isLoading, loadingText) {
    if (!button) return;

    if (isLoading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent.trim();
      }
      button.disabled = true;
      button.textContent = loadingText || "처리 중...";
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
    }
  }

  /* 폼 안의 첫 오류 필드로 포커스 이동 */
  function focusFirstError(formEl) {
    if (!formEl) return;
    var target = formEl.querySelector(".form-field__input--error");
    if (target) target.focus();
  }


  /* ==========================================================
     표시 형식

     숫자를 다루는 요소에는 CSS 에서
     font-variant-numeric: tabular-nums 를 함께 지정할 것
     ========================================================== */

  function formatNumber(value) {
    if (typeof value !== "number" || !isFinite(value)) return "-";
    return value.toLocaleString("ko-KR");
  }

  function formatPrice(value) {
    if (typeof value !== "number" || !isFinite(value)) return "-";
    return value.toLocaleString("ko-KR") + "원";
  }

  /* ISO 8601 문자열을 "2026. 7. 9." 형태로 */
  function formatDate(isoString) {
    if (!isoString) return "-";
    var date = new Date(isoString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("ko-KR");
  }

  /* 7일 이내는 상대 시간, 그 이후는 날짜로 표시 */
  function formatRelativeTime(isoString) {
    if (!isoString) return "-";
    var date = new Date(isoString);
    if (isNaN(date.getTime())) return "-";

    var diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return "방금 전";

    var diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + "분 전";

    var diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return diffHour + "시간 전";

    var diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return diffDay + "일 전";

    return formatDate(isoString);
  }


  /* ==========================================================
     토스트 알림

     "동작이 끝났다"는 짧은 확인용 - 3초 뒤 스스로 사라짐
     결과를 그 자리에서 봐야 하는 오류는 setFormMessage 를 쓸 것

     aria-live 영역이므로 스크린리더도 내용을 읽어줌
     ========================================================== */

  var TOAST_DURATION = 3000;

  function toast(message, type) {
    var root = document.getElementById("toast-root");
    if (!root) {
      root = createEl("div", "toast-root");
      root.id = "toast-root";
      root.setAttribute("aria-live", "polite");
      document.body.appendChild(root);
    }

    var item = createEl("p", "toast" + (type === "danger" ? " toast--danger" : ""), message);
    root.appendChild(item);

    window.setTimeout(function () {
      item.remove();
    }, TOAST_DURATION);
  }


  window.TomopetUi = {
    toast: toast,
    $: $,
    $$: $$,
    createEl: createEl,
    createThumb: createThumb,
    clearChildren: clearChildren,
    renderList: renderList,
    toggleEmptyState: toggleEmptyState,
    showView: showView,
    setFieldError: setFieldError,
    setFormMessage: setFormMessage,
    setLoading: setLoading,
    focusFirstError: focusFirstError,
    formatNumber: formatNumber,
    formatPrice: formatPrice,
    formatDate: formatDate,
    formatRelativeTime: formatRelativeTime
  };
})();
