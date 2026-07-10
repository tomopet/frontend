/* ============================================================
   TOMOPET | scripts/password-reset-confirm.js
   비밀번호 재설정 2단계 - 새 비밀번호 입력

   의존
     layout.js  window.TomopetAuth
     api.js     window.TomopetApi
     ui.js      window.TomopetUi

   진입 경로
     메일로 받은 링크  ./password-reset-confirm.html?token=xxxxx

   연동 엔드포인트
     GET  /api/auth/password/verify-token?token=xxx   토큰 유효성 확인
     POST /api/auth/password/reset                    { token, newPassword }

   화면 구성
     #reset-form-view      새 비밀번호 입력 폼
     #reset-invalid-view   토큰 만료 또는 위조
     #reset-done-view      변경 완료

   [보안]
     토큰은 30분 1회용
     비밀번호 변경 후 서버는 기존 세션을 모두 무효화해야 함
   ============================================================ */

(function () {
  "use strict";

  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var $ = Ui.$;


  /* ==========================================================
     비밀번호 규칙

     data-rule 속성값과 키가 일치해야 체크리스트가 동작함
     ========================================================== */

  var RULES = {
    length: function (value) {
      return value.length >= 8;
    },
    letter: function (value) {
      return /[a-zA-Z]/.test(value);
    },
    number: function (value) {
      return /[0-9]/.test(value);
    },
    special: function (value) {
      return /[^a-zA-Z0-9]/.test(value);
    }
  };

  function isValidPassword(value) {
    return Object.keys(RULES).every(function (key) {
      return RULES[key](value);
    });
  }

  /* 입력할 때마다 충족한 규칙에 .is-valid 부여 */
  function updateRuleChecklist(listEl, value) {
    Ui.$$(".password-rules__item", listEl).forEach(function (item) {
      var rule = RULES[item.dataset.rule];
      if (!rule) return;

      var passed = rule(value);
      item.classList.toggle("is-valid", passed);

      /* 스크린리더에 충족 여부 전달 */
      item.setAttribute("aria-checked", String(passed));
    });
  }


  /* ==========================================================
     URL 에서 토큰 추출
     ========================================================== */

  function getToken() {
    var params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    var formView = $("reset-form-view");
    var invalidView = $("reset-invalid-view");
    var doneView = $("reset-done-view");
    var allViews = [formView, invalidView, doneView];

    var form = $("reset-confirm-form");
    if (!form) return;

    var passwordInput = $("new-password");
    var confirmInput = $("new-password-confirm");
    var passwordError = $("new-password-error");
    var confirmError = $("new-password-confirm-error");
    var submitBtn = $("reset-confirm-btn");
    var rulesList = $("password-rules");

    var token = getToken();

    /* 토큰이 아예 없으면 서버에 물어볼 필요도 없음 */
    if (!token) {
      Ui.showView(invalidView, allViews);
      return;
    }

    /* 토큰 유효성 확인
       만료되었거나 이미 사용한 토큰이면 폼을 보여주지 않음 */
    (async function verifyToken() {
      try {
        await Api.get(
          "/api/auth/password/verify-token?token=" + encodeURIComponent(token),
          { skipAuthRedirect: true }
        );
      } catch (error) {
        console.error("토큰 검증 실패:", error);
        Ui.showView(invalidView, allViews);
      }
    })();

    /* 규칙 체크리스트 실시간 갱신 */
    passwordInput.addEventListener("input", function () {
      updateRuleChecklist(rulesList, passwordInput.value);
      Ui.setFieldError(passwordInput, passwordError, "");
    });

    confirmInput.addEventListener("input", function () {
      Ui.setFieldError(confirmInput, confirmError, "");
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var password = passwordInput.value;
      var confirm = confirmInput.value;
      var isValid = true;

      if (!isValidPassword(password)) {
        Ui.setFieldError(
          passwordInput,
          passwordError,
          "아래 조건을 모두 충족해야 합니다."
        );
        isValid = false;
      }

      if (!confirm) {
        Ui.setFieldError(confirmInput, confirmError, "비밀번호를 다시 입력해주세요.");
        isValid = false;
      } else if (password !== confirm) {
        Ui.setFieldError(confirmInput, confirmError, "비밀번호가 일치하지 않습니다.");
        isValid = false;
      }

      if (!isValid) {
        Ui.focusFirstError(form);
        return;
      }

      Ui.setLoading(submitBtn, true, "변경 중...");

      try {
        await Api.post(
          "/api/auth/password/reset",
          { token: token, newPassword: password },
          { skipAuthRedirect: true }
        );

        /* 변경에 성공했다면 기존 세션은 서버에서 무효화됨
           클라이언트에도 남은 토큰이 있으면 제거 */
        if (window.TomopetAuth) window.TomopetAuth.clearSession();
        Ui.showView(doneView, allViews);
      } catch (error) {
        console.error("비밀번호 변경 실패:", error);

        /* 400/410 은 토큰 만료 또는 재사용 */
        if (error.status === 400 || error.status === 410 || error.status === 404) {
          Ui.showView(invalidView, allViews);
          return;
        }

        Ui.setFieldError(
          passwordInput,
          passwordError,
          Api.toMessage(error, "비밀번호 변경에 실패했습니다.")
        );
      } finally {
        Ui.setLoading(submitBtn, false);
      }
    });

    /* 첫 진입 시 체크리스트 초기 상태 반영 */
    updateRuleChecklist(rulesList, "");
  });
})();
