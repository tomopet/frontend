/* ============================================================
   TOMOPET | scripts/login.js
   로그인 / 회원가입 페이지

   의존
     layout.js  window.TomopetAuth
     api.js     window.TomopetApi
     ui.js      window.TomopetUi

   연동 엔드포인트
     POST /api/auth/login    { email, password }
     POST /api/auth/signup   { nickname, email, password, agreeMarketing }

   폼 제출은 반드시 form 의 submit 이벤트에 바인딩
   버튼 click 에 걸면 Enter 키 제출 시 새로고침이 발생함
   ============================================================ */

(function () {
  "use strict";

  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var $ = Ui.$;

  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  /* ==========================================================
     탭 전환
     ========================================================== */

  var loginTab = $("login-tab");
  var signupTab = $("signup-tab");
  var loginPanel = $("login-panel");
  var signupPanel = $("signup-panel");

  function activateTab(name) {
    var isLogin = name === "login";

    loginTab.classList.toggle("auth-tabs__btn--active", isLogin);
    signupTab.classList.toggle("auth-tabs__btn--active", !isLogin);

    loginTab.setAttribute("aria-selected", String(isLogin));
    signupTab.setAttribute("aria-selected", String(!isLogin));

    /* 로빙 tabindex - 활성 탭만 Tab 키로 진입 가능 */
    loginTab.tabIndex = isLogin ? 0 : -1;
    signupTab.tabIndex = isLogin ? -1 : 0;

    loginPanel.hidden = !isLogin;
    signupPanel.hidden = isLogin;
  }

  function bindTabs() {
    if (!loginTab || !signupTab) return;

    loginTab.addEventListener("click", function () {
      activateTab("login");
    });
    signupTab.addEventListener("click", function () {
      activateTab("signup");
    });

    /* 좌우 방향키로 탭 이동 - WAI-ARIA Tabs 패턴 */
    [loginTab, signupTab].forEach(function (tab) {
      tab.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();

        var target = tab === loginTab ? signupTab : loginTab;
        activateTab(target === loginTab ? "login" : "signup");
        target.focus();
      });
    });
  }


  /* ==========================================================
     로그인
     ========================================================== */

  function bindLoginForm() {
    var form = $("login-form");
    if (!form) return;

    var emailInput = $("login-email");
    var passwordInput = $("login-password");
    var emailError = $("login-email-error");
    var passwordError = $("login-password-error");
    var formMessage = $("login-form-message");
    var submitBtn = $("login-submit-btn");

    /* 다시 입력하면 오류 표시 해제 */
    emailInput.addEventListener("input", function () {
      Ui.setFieldError(emailInput, emailError, "");
    });
    passwordInput.addEventListener("input", function () {
      Ui.setFieldError(passwordInput, passwordError, "");
    });

    function validate() {
      var email = emailInput.value.trim();
      var password = passwordInput.value;
      var isValid = true;

      if (!email) {
        Ui.setFieldError(emailInput, emailError, "이메일을 입력해주세요.");
        isValid = false;
      } else if (!EMAIL_PATTERN.test(email)) {
        Ui.setFieldError(emailInput, emailError, "올바른 이메일 형식이 아닙니다.");
        isValid = false;
      }

      if (!password) {
        Ui.setFieldError(passwordInput, passwordError, "비밀번호를 입력해주세요.");
        isValid = false;
      }

      return isValid;
    }

    form.addEventListener("submit", async function (event) {
      /* 브라우저 기본 제출 차단 - 없으면 페이지가 새로고침됨 */
      event.preventDefault();

      Ui.setFormMessage(formMessage, "");
      if (!validate()) {
        Ui.focusFirstError(form);
        return;
      }

      Ui.setLoading(submitBtn, true, "로그인 중...");

      try {
        /* 여기서의 401 은 토큰 만료가 아니라 비밀번호 오류이므로
           api.js 의 자동 리다이렉트를 끔 */
        var data = await Api.post(
          "/api/auth/login",
          { email: emailInput.value.trim(), password: passwordInput.value },
          { skipAuthRedirect: true }
        );

        window.TomopetAuth.setSession(data.accessToken, data.user);

        /* 이동 직전이므로 버튼 상태를 되돌리지 않음 */
        window.location.href = "./index.html";
      } catch (error) {
        console.error("로그인 실패:", error);

        if (error.status === 401 || error.status === 400) {
          Ui.setFieldError(
            passwordInput,
            passwordError,
            "이메일 또는 비밀번호가 올바르지 않습니다."
          );
          passwordInput.focus();
        } else {
          Ui.setFormMessage(
            formMessage,
            Api.toMessage(error, "로그인에 실패했습니다."),
            "danger"
          );
        }
        Ui.setLoading(submitBtn, false);
      }
    });
  }


  /* ==========================================================
     회원가입
     ========================================================== */

  /* 영문, 숫자, 특수문자를 각각 1개 이상 포함하고 8자 이상 */
  function isStrongPassword(value) {
    return (
      value.length >= 8 &&
      /[a-zA-Z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^a-zA-Z0-9]/.test(value)
    );
  }

  function bindSignupForm() {
    var form = $("signup-form");
    if (!form) return;

    var nicknameInput = $("signup-nickname");
    var emailInput = $("signup-email");
    var passwordInput = $("signup-password");
    var confirmInput = $("signup-password-confirm");

    var nicknameError = $("signup-nickname-error");
    var emailError = $("signup-email-error");
    var passwordError = $("signup-password-error");
    var confirmError = $("signup-password-confirm-error");

    var agreeTerms = $("agree-terms");
    var agreePrivacy = $("agree-privacy");
    var agreeMarketing = $("agree-marketing");

    var formMessage = $("signup-form-message");
    var submitBtn = $("signup-submit-btn");

    [
      [nicknameInput, nicknameError],
      [emailInput, emailError],
      [passwordInput, passwordError],
      [confirmInput, confirmError]
    ].forEach(function (pair) {
      pair[0].addEventListener("input", function () {
        Ui.setFieldError(pair[0], pair[1], "");
      });
    });

    function validate() {
      var nickname = nicknameInput.value.trim();
      var email = emailInput.value.trim();
      var password = passwordInput.value;
      var confirm = confirmInput.value;
      var isValid = true;

      if (!nickname) {
        Ui.setFieldError(nicknameInput, nicknameError, "닉네임을 입력해주세요.");
        isValid = false;
      } else if (nickname.length < 2) {
        Ui.setFieldError(nicknameInput, nicknameError, "닉네임은 2자 이상이어야 합니다.");
        isValid = false;
      }

      if (!email) {
        Ui.setFieldError(emailInput, emailError, "이메일을 입력해주세요.");
        isValid = false;
      } else if (!EMAIL_PATTERN.test(email)) {
        Ui.setFieldError(emailInput, emailError, "올바른 이메일 형식이 아닙니다.");
        isValid = false;
      }

      if (!isStrongPassword(password)) {
        Ui.setFieldError(
          passwordInput,
          passwordError,
          "영문, 숫자, 특수문자를 포함해 8자 이상 입력해주세요."
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

      if (!agreeTerms.checked || !agreePrivacy.checked) {
        Ui.setFormMessage(formMessage, "필수 약관에 동의해주세요.", "danger");
        isValid = false;
      }

      return isValid;
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      Ui.setFormMessage(formMessage, "");
      if (!validate()) {
        Ui.focusFirstError(form);
        return;
      }

      Ui.setLoading(submitBtn, true, "가입 중...");

      try {
        await Api.post(
          "/api/auth/signup",
          {
            nickname: nicknameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            agreeMarketing: agreeMarketing.checked
          },
          { skipAuthRedirect: true }
        );

        form.reset();
        activateTab("login");

        Ui.setFormMessage(
          $("login-form-message"),
          "가입이 완료되었습니다. 로그인해주세요.",
          "success"
        );
        $("login-email").focus();
      } catch (error) {
        console.error("회원가입 실패:", error);

        /* 409 는 이메일 또는 닉네임 중복 */
        if (error.status === 409) {
          if (error.data.field === "nickname") {
            Ui.setFieldError(nicknameInput, nicknameError, "이미 사용 중인 닉네임입니다.");
          } else {
            Ui.setFieldError(emailInput, emailError, "이미 가입된 이메일입니다.");
          }
        } else {
          Ui.setFormMessage(
            formMessage,
            Api.toMessage(error, "가입에 실패했습니다."),
            "danger"
          );
        }
      } finally {
        Ui.setLoading(submitBtn, false);
      }
    });
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    /* 이미 로그인된 상태로 접근하면 홈으로 되돌림 */
    if (window.TomopetAuth && window.TomopetAuth.isLoggedIn()) {
      window.location.replace("./index.html");
      return;
    }

    bindTabs();
    bindLoginForm();
    bindSignupForm();

    /* URL 에 ?tab=signup 이 있으면 회원가입 탭으로 시작 */
    var params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "signup") {
      activateTab("signup");
    }
  });
})();
