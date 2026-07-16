/* ============================================================
   TOMOPET | scripts/theme.js
   테마 적용 - 다른 어떤 스크립트보다 먼저 실행되어야 함

   반드시 <head> 안에서 defer 없이 로드할 것.
   <body> 뒤나 defer 로 두면 화면이 흰색으로 한 번 그려진 뒤
   어두워지므로 눈에 띄게 번쩍임 (flash of wrong theme)

   동작
     저장값 없음   -> 아무것도 하지 않음
                     variables.css 의 @media (prefers-color-scheme) 가
                     OS 설정을 따라감
     "light"      -> <html data-theme="light">  OS 가 다크여도 라이트 강제
     "dark"       -> <html data-theme="dark">   OS 가 라이트여도 다크 강제

   저장 키: tomopet_theme
   ============================================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "tomopet_theme";

  /* 사파리 프라이빗 모드 등에서 localStorage 접근이 예외를 던짐 */
  function readTheme() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error("테마 설정 읽기 실패:", error);
      return null;
    }
  }

  function applyTheme(theme) {
    /* system(또는 값 없음)이면 속성을 지워 OS 설정을 따르게 함 */
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function saveTheme(theme) {
    try {
      if (theme === "system") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch (error) {
      console.error("테마 설정 저장 실패:", error);
    }
  }

  /* 즉시 적용 - <head> 에서 실행되므로 본문이 그려지기 전에 끝남 */
  applyTheme(readTheme());

  /* 마이페이지 등에서 사용
     window.TomopetTheme.set("dark" | "light" | "system") */
  window.TomopetTheme = {
    STORAGE_KEY: STORAGE_KEY,

    /* 현재 선택값 - "system" | "light" | "dark" */
    get: function () {
      return readTheme() || "system";
    },

    /* 실제로 화면에 적용된 테마 - "light" | "dark"
       system 인 경우 OS 설정을 조회함 */
    getEffective: function () {
      var saved = readTheme();
      if (saved === "light" || saved === "dark") return saved;

      return window.matchMedia &&
             window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    },

    set: function (theme) {
      saveTheme(theme);
      applyTheme(theme === "system" ? null : theme);
    }
  };
})();
