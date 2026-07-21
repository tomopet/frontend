/* ============================================================
   TOMOPET | scripts/login.js
   검색 키워드: 로그인, 회원가입, 이메일 인증, 인증번호, 유효시간, 타이머, 아이디, 약관 동의, 리다이렉트 검증
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

  /* 아이디 - 영문 소문자와 숫자만, 4~20자
     대문자를 허용하면 "Abc" 와 "abc" 를 다른 계정으로 오해함
     특수문자를 허용하면 URL 이나 멘션에서 다루기 까다로워짐 */
  var USERNAME_PATTERN = /^[a-z0-9]{4,20}$/;

  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* 이메일 인증번호 유효시간(초)
     화면 타이머는 안내용이고 실제 만료 판정은 서버가 함
     [확인 필요] 1분은 메일 도착이 늦으면 빠듯할 수 있음
       늘리게 되면 백엔드 만료시간과 반드시 같이 바꿀 것 */
  var EMAIL_CODE_TTL_SECONDS = 60;

  var EMAIL_CODE_PATTERN = /^[0-9]{6}$/;


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

    var usernameInput = $("login-username");
    var passwordInput = $("login-password");
    var usernameError = $("login-username-error");
    var passwordError = $("login-password-error");
    var formMessage = $("login-form-message");
    var submitBtn = $("login-submit-btn");

    /* 다시 입력하면 오류 표시 해제 */
    usernameInput.addEventListener("input", function () {
      Ui.setFieldError(usernameInput, usernameError, "");
    });
    passwordInput.addEventListener("input", function () {
      Ui.setFieldError(passwordInput, passwordError, "");
    });

    function validate() {
      var username = usernameInput.value.trim();
      var password = passwordInput.value;
      var isValid = true;

      /* 로그인에서는 형식까지 검사하지 않음
         "아이디 형식이 아닙니다" 는 존재하지 않는 계정을 알려주는 셈이라
         계정 열거의 단서가 됨. 빈 값만 막고 나머지는 서버 응답에 맡김 */
      if (!username) {
        Ui.setFieldError(usernameInput, usernameError, "아이디를 입력해주세요.");
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
          { username: usernameInput.value.trim(), password: passwordInput.value },
          { skipAuthRedirect: true }
        );

        window.TomopetAuth.setSession(data.accessToken, data.user);

        /* 이동 직전이므로 버튼 상태를 되돌리지 않음
           redirect 가 있으면 하던 페이지로, 없으면 홈으로 */
        window.location.href = resolveRedirect() || "./index.html";
      } catch (error) {
        console.error("로그인 실패:", error);

        if (error.status === 401 || error.status === 400) {
          Ui.setFieldError(
            passwordInput,
            passwordError,
            "아이디 또는 비밀번호가 올바르지 않습니다."
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
     이메일 인증

     흐름
       발송 -> 1분 카운트다운 -> 인증번호 확인 -> 이메일 잠금
       만료되면 확인을 막고 재발송을 유도

     이메일을 수정하면 인증이 무효가 됨
       인증된 주소와 가입되는 주소가 달라지는 것을 막기 위함
     ========================================================== */

  var emailAuth = {
    verified: false,
    timerId: null,

    els: function () {
      return {
        email: $("signup-email"),
        emailError: $("signup-email-error"),
        sendBtn: $("email-send-btn"),
        field: $("email-code-field"),
        code: $("signup-email-code"),
        codeError: $("signup-email-code-error"),
        timer: $("email-code-timer"),
        verifyBtn: $("email-verify-btn")
      };
    },

    startTimer: function () {
      var e = this.els();
      var remaining = EMAIL_CODE_TTL_SECONDS;
      var self = this;

      this.stopTimer();
      e.timer.classList.remove("is-expired");
      e.verifyBtn.disabled = false;

      function render() {
        var m = Math.floor(remaining / 60);
        var s = remaining % 60;
        e.timer.textContent = m + ":" + (s < 10 ? "0" : "") + s;
      }
      render();

      this.timerId = window.setInterval(function () {
        remaining -= 1;
        render();
        if (remaining <= 0) self.expire();
      }, 1000);
    },

    stopTimer: function () {
      if (this.timerId) {
        window.clearInterval(this.timerId);
        this.timerId = null;
      }
    },

    expire: function () {
      var e = this.els();
      this.stopTimer();
      e.timer.textContent = "만료";
      e.timer.classList.add("is-expired");
      e.verifyBtn.disabled = true;
      Ui.setFieldError(e.code, e.codeError,
        "인증 시간이 지났어요. 인증번호를 다시 발송해주세요.");
    },

    /* 이메일이 바뀌는 등 인증을 처음 상태로 되돌릴 때 */
    reset: function () {
      var e = this.els();
      this.stopTimer();
      this.verified = false;
      e.field.hidden = true;
      e.code.value = "";
      e.code.readOnly = false;
      e.timer.textContent = "";
      e.timer.classList.remove("is-expired");
      e.email.readOnly = false;
      e.sendBtn.disabled = false;
      e.sendBtn.textContent = "인증번호 발송";
      Ui.setFieldError(e.code, e.codeError, "");
    },

    send: async function () {
      var e = this.els();
      var email = e.email.value.trim();

      if (!email || !EMAIL_PATTERN.test(email)) {
        Ui.setFieldError(e.email, e.emailError, "올바른 이메일 형식이 아닙니다.");
        return;
      }
      Ui.setFieldError(e.email, e.emailError, "");
      Ui.setFieldError(e.code, e.codeError, "");

      Ui.setLoading(e.sendBtn, true, "발송 중...");
      try {
        await Api.post("/api/auth/email/send", { email: email });

        e.field.hidden = false;
        e.code.value = "";
        e.code.readOnly = false;
        e.code.focus();
        e.sendBtn.textContent = "재발송";
        this.startTimer();
      } catch (error) {
        console.error("인증번호 발송 실패:", error);

        if (error.status === 409) {
          /* 이미 가입된 이메일 - 로그인/재설정으로 안내 */
          Ui.setFieldError(e.email, e.emailError, "이미 가입된 이메일이에요.");
        } else {
          Ui.setFieldError(e.email, e.emailError, Api.toMessage(error));
        }
      } finally {
        Ui.setLoading(e.sendBtn, false);
        /* setLoading 이 원래 문구로 되돌리므로 발송 후 상태 재적용 */
        if (!this.verified && !e.field.hidden) e.sendBtn.textContent = "재발송";
      }
    },

    verify: async function () {
      var e = this.els();
      var email = e.email.value.trim();
      var code = e.code.value.trim();

      if (!EMAIL_CODE_PATTERN.test(code)) {
        Ui.setFieldError(e.code, e.codeError, "인증번호 6자리를 입력해주세요.");
        return;
      }
      Ui.setFieldError(e.code, e.codeError, "");

      Ui.setLoading(e.verifyBtn, true, "확인 중...");
      try {
        await Api.post("/api/auth/email/verify", { email: email, code: code });

        this.verified = true;
        this.stopTimer();

        /* 인증된 주소 그대로 가입되도록 수정을 잠금 */
        e.email.readOnly = true;
        e.code.readOnly = true;
        e.sendBtn.disabled = true;
        e.verifyBtn.disabled = true;
        e.timer.textContent = "인증 완료";
        e.timer.classList.remove("is-expired");
      } catch (error) {
        console.error("인증번호 확인 실패:", error);

        /* 400 불일치 / 410 만료 - 서버 판정이 우선 */
        if (error.status === 410) {
          this.expire();
        } else if (error.status === 400) {
          Ui.setFieldError(e.code, e.codeError, "인증번호가 일치하지 않아요.");
        } else {
          Ui.setFieldError(e.code, e.codeError, Api.toMessage(error));
        }
      } finally {
        if (!this.verified) Ui.setLoading(e.verifyBtn, false);
      }
    },

    bind: function () {
      var e = this.els();
      if (!e.sendBtn) return;
      var self = this;

      e.sendBtn.addEventListener("click", function () { self.send(); });
      e.verifyBtn.addEventListener("click", function () { self.verify(); });

      /* Enter 로 폼 전체가 제출되지 않도록 인증번호 입력에서 가로챔 */
      e.code.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          self.verify();
        }
      });

      /* 인증 후 이메일을 고치면 인증 무효 - readOnly 라 보통은 못 고치지만
         발송만 하고 인증 전인 상태에서 이메일을 바꾸는 경우를 처리 */
      e.email.addEventListener("input", function () {
        if (!self.verified && !e.field.hidden) self.reset();
      });
    }
  };


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

    var usernameInput = $("signup-username");
    var nicknameInput = $("signup-nickname");
    var emailInput = $("signup-email");
    var passwordInput = $("signup-password");
    var confirmInput = $("signup-password-confirm");

    var usernameError = $("signup-username-error");
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
      [usernameInput, usernameError],
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
      var username = usernameInput.value.trim();
      var nickname = nicknameInput.value.trim();
      var email = emailInput.value.trim();
      var password = passwordInput.value;
      var confirm = confirmInput.value;
      var isValid = true;

      /* 아이디는 가입 후 바꿀 수 없으므로 여기서 형식을 확실히 잡음 */
      if (!username) {
        Ui.setFieldError(usernameInput, usernameError, "아이디를 입력해주세요.");
        isValid = false;
      } else if (!USERNAME_PATTERN.test(username)) {
        Ui.setFieldError(
          usernameInput,
          usernameError,
          "영문 소문자와 숫자만 4~20자로 입력해주세요."
        );
        isValid = false;
      }

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

      /* 인증 없이 남의 이메일로 가입하는 것을 막음
         서버도 같은 검증을 하지만 여기서 먼저 안내 */
      if (!emailAuth.verified) {
        Ui.setFieldError(emailInput, emailError, "이메일 인증을 완료해주세요.");
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
            username: usernameInput.value.trim(),
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
        $("login-username").focus();
      } catch (error) {
        console.error("회원가입 실패:", error);

        /* 409 는 중복. 서버가 data.field 로 어느 항목인지 알려줌
           username | nickname | email 세 가지 */
        if (error.status === 409) {
          if (error.data.field === "username") {
            Ui.setFieldError(usernameInput, usernameError, "이미 사용 중인 아이디입니다.");
          } else if (error.data.field === "nickname") {
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
     로그인 후 되돌아갈 페이지

     requireAuth 가 ./login.html?redirect=diet.html%3Fkeyword%3D...
     형태로 넘겨준 값을 읽습니다.

     [보안] 오픈 리다이렉트 방지
       ?redirect=https://피싱사이트.com 처럼 외부 주소를 심어
       로그인 직후 가짜 사이트로 보내는 공격이 있으므로
       "우리 페이지 파일명 + 쿼리" 형태만 허용합니다.
         허용  my-page.html, diet.html
         거부  https://evil.com, //evil.com, javascript:, login.html(순환)
     ========================================================== */

  function resolveRedirect() {
    var raw = new URLSearchParams(window.location.search).get("redirect") || "";
    if (!/^[a-z0-9-]+\.html(\?[^#]*)?$/i.test(raw)) return null;
    if (raw.indexOf("login.html") === 0) return null;
    return "./" + raw;
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    /* 이미 로그인된 상태로 접근하면 가려던 곳 또는 홈으로 되돌림 */
    if (window.TomopetAuth && window.TomopetAuth.isLoggedIn()) {
      window.location.replace(resolveRedirect() || "./index.html");
      return;
    }

    bindTabs();
    bindLoginForm();
    bindSignupForm();
    emailAuth.bind();

    /* URL 에 ?tab=signup 이 있으면 회원가입 탭으로 시작 */
    var params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "signup") {
      activateTab("signup");
    }
  });
})();
