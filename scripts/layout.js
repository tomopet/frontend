/* ============================================================
   TOMOPET | scripts/layout.js
   검색 키워드: 헤더, 푸터, 공통 레이아웃, 세션, 로그인 상태, 로그아웃, 인증 가드, 리다이렉트
   공통 레이아웃 로더 + 인증 상태 관리

   적용 범위: 전체 페이지 공통
   로드 위치: </body> 직전, 페이지 전용 스크립트보다 먼저

   역할
     1. components/header.html, components/footer.html 을 fetch 하여 삽입
     2. 현재 페이지에 해당하는 내비게이션 링크에 활성 클래스 부여
     3. 로그인 상태에 따라 헤더 우측 버튼 전환
     4. window.TomopetAuth 로 토큰 유틸리티 전역 노출

   실행 순서
     이 파일은 defer 없이 로드되어 즉시 실행됨
     페이지 전용 스크립트는 defer 로 로드되어 DOM 파싱 후 실행됨
     따라서 window.TomopetAuth 는 항상 페이지 스크립트보다 먼저 정의됨

   fetch 제약
     file:// 프로토콜에서는 CORS 로 차단됨
     로컬 서버 환경에서 실행 필요
       - VSCode Live Server 확장
       - python -m http.server 8000
   ============================================================ */

(function () {
  "use strict";

  /* ==========================================================
     인증 토큰 유틸리티

     localStorage 는 사파리 프라이빗 모드 등에서 예외를 던지므로
     모든 접근을 try/catch 로 감쌈
     ========================================================== */

  var TOKEN_KEY = "tomopet_access_token";
  var USER_KEY = "tomopet_user";

  var TomopetAuth = {
    /* 저장된 액세스 토큰 반환, 없으면 null */
    getToken: function () {
      try {
        return window.localStorage.getItem(TOKEN_KEY);
      } catch (error) {
        console.error("세션 읽기 실패:", error);
        return null;
      }
    },

    /* 저장된 사용자 정보 반환, 없으면 null */
    getUser: function () {
      try {
        var raw = window.localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    },

    /* 로그인 성공 시 세션 저장 */
    setSession: function (token, user) {
      try {
        window.localStorage.setItem(TOKEN_KEY, token);
        if (user) {
          window.localStorage.setItem(USER_KEY, JSON.stringify(user));
        }
      } catch (error) {
        console.error("세션 저장 실패:", error);
      }
    },

    /* 로그아웃 또는 토큰 만료 시 세션 제거 */
    clearSession: function () {
      try {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
      } catch (error) {
        console.error("세션 제거 실패:", error);
      }
    },

    isLoggedIn: function () {
      return Boolean(this.getToken());
    },

    /* 로그인 후 원래 페이지로 되돌아올 수 있도록
       현재 위치(파일명 + 쿼리)를 redirect 로 실어 보냄

       pathname 전체가 아니라 파일명만 쓰는 이유
         GitHub Pages 는 /저장소명/ 하위에 배포되어
         전체 경로를 쓰면 로컬과 배포 환경의 경로가 달라짐 */
    loginUrl: function () {
      var page = window.location.pathname.split("/").pop() || "index.html";
      var target = page + window.location.search;
      /* 로그인 페이지 자신을 redirect 로 넣으면 무한 순환 */
      if (page === "login.html") return "./login.html";
      return "./login.html?redirect=" + encodeURIComponent(target);
    },

    /* ========================================================
       인증 가드 - 사용하지 않기로 결정 (백엔드 주도 방식)

       프론트에서 선제적으로 로그인 페이지로 막지 않습니다.
       비로그인 접근 여부는 백엔드가 401 로 판정하고,
       401 을 받으면 api.js 의 handleUnauthorized 가
       로그인 페이지로 보냅니다 (loginUrl 로 복귀 경로 포함).

       각 페이지의 requireAuth() 호출은 남겨둠
         나중에 프론트 가드가 다시 필요해지면
         이 함수만 고치면 전 페이지에 적용되기 때문
       검색 키워드: 인증 가드, 로그인 막기
       ======================================================== */
    requireAuth: function () {
      return true;
    },

    logout: function () {
      this.clearSession();
      window.location.href = "./login.html";
    }
  };

  /* 페이지 전용 스크립트에서 사용할 수 있도록 전역 노출 */
  window.TomopetAuth = TomopetAuth;


  /* ==========================================================
     컴포넌트 삽입
     ========================================================== */

  /* placeholder 요소를 fetch 해온 HTML 로 통째 교체
     README 의 REST API 표준 문법과 동일한 구조 (try / catch + response.ok 확인) */
  async function injectComponent(placeholderId, componentPath) {
    var placeholder = document.getElementById(placeholderId);
    if (!placeholder) return false;

    try {
      var response = await fetch(componentPath);
      if (!response.ok) throw new Error("HTTP " + response.status);

      var html = await response.text();
      placeholder.outerHTML = html;
      return true;
    } catch (error) {
      console.error("[layout] " + componentPath + " 로드 실패", error);

      /* file:// 로 연 경우 흔히 발생하므로 원인 안내
         사용자 입력이 아닌 고정 문구이므로 textContent 로 삽입 */
      var notice = document.createElement("p");
      notice.className = "layout-error";
      notice.textContent = "레이아웃을 불러오지 못했습니다. 로컬 서버로 실행해주세요.";
      placeholder.replaceWith(notice);
      return false;
    }
  }


  /* ==========================================================
     현재 페이지 내비게이션 활성화
     ========================================================== */

  /* 파일명에서 확장자를 뗀 키 반환
     예: /pages/community.html -> community

     루트 경로("/" 또는 "/repo/")로 접근하면 파일명이 비므로
     기본 진입점인 index 로 처리 */
  function getCurrentPageKey() {
    var fileName = window.location.pathname.split("/").pop();
    if (!fileName) return "index";
    return fileName.replace(".html", "");
  }

  /* 하위 페이지는 상위 목록 페이지를 활성 표시 */
  var NAV_PARENT_MAP = {
    "post-detail": "community",
    "post-write": "community"
  };

  function markActiveNav() {
    var pageKey = getCurrentPageKey();
    var activeKey = NAV_PARENT_MAP[pageKey] || pageKey;

    var link = document.querySelector(
      '.nav-list__link[data-nav="' + activeKey + '"]'
    );
    if (!link) return;

    link.classList.add("nav-list__link--active");
    link.setAttribute("aria-current", "page");
  }


  /* ==========================================================
     로그인 상태에 따른 헤더 전환
     ========================================================== */

  function renderAuthState() {
    var loginBtn = document.getElementById("header-login-btn");
    var profileBtn = document.getElementById("header-profile-btn");
    if (!loginBtn || !profileBtn) return;

    if (!TomopetAuth.isLoggedIn()) {
      loginBtn.hidden = false;
      profileBtn.hidden = true;
      return;
    }

    loginBtn.hidden = true;
    profileBtn.hidden = false;

    var user = TomopetAuth.getUser();
    var image = profileBtn.querySelector("img");

    if (user && user.profileImageUrl) {
      if (image) {
        image.src = user.profileImageUrl;
        image.alt = "";
      }
      return;
    }

    /* 프로필 이미지가 없으면 닉네임 첫 글자 표시
       빈 src 를 남기면 깨진 이미지 아이콘이 노출되므로 img 제거 */
    if (image) image.remove();
    profileBtn.textContent =
      user && user.nickname ? user.nickname.charAt(0) : "?";
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", async function () {
    /* 헤더와 푸터는 서로 독립적이므로 병렬로 요청 */
    await Promise.all([
      injectComponent("header-placeholder", "./components/header.html"),
      injectComponent("footer-placeholder", "./components/footer.html")
    ]);

    /* 컴포넌트가 DOM 에 삽입된 뒤에야 요소를 찾을 수 있음 */
    markActiveNav();
    renderAuthState();

    /* 페이지 전용 스크립트가 헤더 삽입 완료를 감지할 수 있도록 알림 */
    document.dispatchEvent(new CustomEvent("layout:ready"));
  });
})();
