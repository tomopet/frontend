/* ============================================================
   TOMOPET | scripts/password-reset.js
   검색 키워드: 비밀번호 재설정, 재설정 메일, 계정 찾기
   비밀번호 재설정 1단계 - 이메일로 재설정 링크 요청

   의존
     layout.js  window.TomopetAuth
     api.js     window.TomopetApi
     ui.js      window.TomopetUi

   연동 엔드포인트
     POST /api/auth/password/reset-request   { email }

   화면 구성
     #reset-request-view   이메일 입력 폼
     #reset-sent-view      발송 완료 안내 (재발송 버튼)

   [보안] 계정 존재 여부를 노출하지 않음
     가입되지 않은 이메일이어도 서버는 항상 성공으로 응답해야 함
     "가입되지 않은 이메일입니다" 를 노출하면
     공격자가 어떤 이메일이 가입되어 있는지 알아낼 수 있음 (계정 열거)
   ============================================================ */

(function () {
  "use strict";

  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var $ = Ui.$;

  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* 재발송 쿨다운 - 메일 폭탄을 막기 위한 최소 대기 시간 */
  var RESEND_COOLDOWN_SEC = 60;

  var cooldownTimer = null;


  /* ==========================================================
     재발송 쿨다운

     setInterval 로 남은 시간을 표시하고 0 이 되면 버튼을 되살림
     페이지를 떠날 때 타이머를 정리하지 않으면 콘솔에 오류가 남음
     ========================================================== */

  function startCooldown(button) {
    var remaining = RESEND_COOLDOWN_SEC;

    button.disabled = true;
    button.textContent = "재발송 (" + remaining + "초)";

    cooldownTimer = window.setInterval(function () {
      remaining -= 1;

      if (remaining <= 0) {
        stopCooldown(button);
        return;
      }
      button.textContent = "재발송 (" + remaining + "초)";
    }, 1000);
  }

  function stopCooldown(button) {
    if (cooldownTimer) {
      window.clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
    button.disabled = false;
    button.textContent = "재발송";
  }


  /* ==========================================================
     재설정 링크 요청
     ========================================================== */

  async function requestResetLink(email) {
    /* 이 요청의 401 은 로그인 실패가 아니므로 리다이렉트하지 않음 */
    return Api.post(
      "/api/auth/password/reset-request",
      { email: email },
      { skipAuthRedirect: true }
    );
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    /* 로그인 상태에서는 마이페이지의 비밀번호 변경을 쓰도록 유도 */
    if (window.TomopetAuth && window.TomopetAuth.isLoggedIn()) {
      window.location.replace("./index.html");
      return;
    }

    var form = $("reset-request-form");
    if (!form) return;

    var emailInput = $("reset-email");
    var emailError = $("reset-email-error");
    var submitBtn = $("reset-request-btn");

    var requestView = $("reset-request-view");
    var sentView = $("reset-sent-view");
    var sentEmail = $("reset-sent-email");
    var resendBtn = $("reset-resend-btn");

    emailInput.addEventListener("input", function () {
      Ui.setFieldError(emailInput, emailError, "");
    });

    form.addEventListener("submit", async function (event) {
      /* 없으면 페이지가 새로고침되며 입력값이 사라짐 */
      event.preventDefault();

      var email = emailInput.value.trim();

      if (!email) {
        Ui.setFieldError(emailInput, emailError, "이메일을 입력해주세요.");
        emailInput.focus();
        return;
      }
      if (!EMAIL_PATTERN.test(email)) {
        Ui.setFieldError(emailInput, emailError, "올바른 이메일 형식이 아닙니다.");
        emailInput.focus();
        return;
      }

      Ui.setLoading(submitBtn, true, "메일 보내는 중...");

      try {
        await requestResetLink(email);

        /* 이메일 주소는 사용자 입력이므로 textContent 로 삽입 */
        sentEmail.textContent = email;
        Ui.showView(sentView, [requestView, sentView]);

        startCooldown(resendBtn);
        resendBtn.focus();
      } catch (error) {
        console.error("재설정 메일 발송 실패:", error);

        /* 404 는 미가입 이메일을 뜻하므로 그대로 노출하면 안 됨
           서버가 실수로 404 를 주더라도 성공 화면을 보여줌 */
        if (error.status === 404) {
          sentEmail.textContent = email;
          Ui.showView(sentView, [requestView, sentView]);
          startCooldown(resendBtn);
          return;
        }

        Ui.setFieldError(
          emailInput,
          emailError,
          Api.toMessage(error, "메일 발송에 실패했습니다.")
        );
      } finally {
        Ui.setLoading(submitBtn, false);
      }
    });

    /* 재발송 */
    resendBtn.addEventListener("click", async function () {
      if (resendBtn.disabled) return;

      var email = sentEmail.textContent;
      startCooldown(resendBtn);

      try {
        await requestResetLink(email);
      } catch (error) {
        console.error("재발송 실패:", error);
      }
    });

    /* 페이지 이탈 시 타이머 정리 */
    window.addEventListener("pagehide", function () {
      if (cooldownTimer) window.clearInterval(cooldownTimer);
    });
  });
})();
