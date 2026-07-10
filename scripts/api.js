/* ============================================================
   TOMOPET | scripts/api.js
   HTTP 통신 공통 모듈

   적용 범위: 전체 페이지 공통
   로드 위치: layout.js 다음, ui.js 앞

   의존
     layout.js 가 정의한 window.TomopetAuth (토큰 조회)

   제공
     window.TomopetApi.get / post / put / patch / del
     window.TomopetApi.upload      FormData 전송
     window.TomopetApi.toMessage   오류를 사용자 문구로 변환
     window.TomopetApi.toList      배열 또는 {items:[]} 정규화

   기능
     1. Bearer 토큰 자동 첨부
     2. 타임아웃 (기본 10초) 초과 시 요청 중단
     3. 401 응답 시 세션 제거 후 로그인 페이지로 이동
     4. 본문이 비어있거나 JSON 이 아니어도 안전하게 파싱

   팀 표준 문법과의 관계

     README 의 REST API 표준 문법은 아래 구조입니다.

       try {
         const response = await fetch("/api/dogs");
         if (!response.ok) throw new Error("네트워크 응답 에러");
         const data = await response.json();
       } catch (error) {
         console.error("데이터 로딩 실패:", error);
       }

     이 모듈이 위 구조를 그대로 구현합니다.
     페이지 스크립트는 fetch 를 직접 쓰지 않고 Api.get 등을 호출한 뒤
     try / catch 로 감싸면 됩니다. 토큰 첨부와 타임아웃이 자동으로 붙습니다.
   ============================================================ */

(function () {
  "use strict";

  /* ==========================================================
     설정

     API 서버가 같은 오리진이면 BASE_URL 을 빈 문자열로 둠
     별도 도메인에 배포했다면 여기만 바꾸면 전 페이지에 적용됨
       예: "https://api.tomopet.com"
     ========================================================== */
  var BASE_URL = "";
  var DEFAULT_TIMEOUT = 10000;


  /* ==========================================================
     오류 객체

     status 와 data 를 담아 호출부에서 분기할 수 있게 함
       401 인증 실패
       409 중복 (data.field 로 어떤 항목인지 구분)
       422 검증 실패
     ========================================================== */
  function createApiError(message, status, data) {
    var error = new Error(message);
    error.name = "ApiError";
    error.status = status;
    error.data = data || {};
    return error;
  }


  /* ==========================================================
     401 처리

     토큰이 만료되었거나 유효하지 않은 상태
     세션을 지우고 로그인 페이지로 보냄

     로그인 폼 자체의 401(비밀번호 틀림)은 리다이렉트하면 안 되므로
     호출부에서 { skipAuthRedirect: true } 를 넘겨 우회함
     ========================================================== */
  function handleUnauthorized() {
    if (!window.TomopetAuth) return;
    window.TomopetAuth.clearSession();
    window.location.replace("./login.html");
  }


  /* ==========================================================
     요청 헤더 구성
     ========================================================== */
  function buildHeaders(body, extraHeaders) {
    var headers = {};

    /* FormData 는 브라우저가 boundary 를 포함한 Content-Type 을
       자동으로 설정하므로 직접 지정하면 안 됨 */
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    var token = window.TomopetAuth && window.TomopetAuth.getToken();
    if (token) headers.Authorization = "Bearer " + token;

    if (extraHeaders) {
      Object.keys(extraHeaders).forEach(function (key) {
        headers[key] = extraHeaders[key];
      });
    }
    return headers;
  }


  /* ==========================================================
     공통 요청 함수
     ========================================================== */
  async function request(method, path, body, options) {
    options = options || {};

    var controller = new AbortController();
    var timer = window.setTimeout(function () {
      controller.abort();
    }, options.timeout || DEFAULT_TIMEOUT);

    var init = {
      method: method,
      headers: buildHeaders(body, options.headers),
      signal: controller.signal
    };

    if (body !== undefined) {
      init.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    try {
      var response = await fetch(BASE_URL + path, init);

      /* 204 No Content 나 비어있는 본문에서도 예외가 나지 않도록 방어 */
      var data = {};
      try {
        data = await response.json();
      } catch (parseError) {
        data = {};
      }

      if (!response.ok) {
        if (response.status === 401 && !options.skipAuthRedirect) {
          handleUnauthorized();
        }
        throw createApiError(data.message || "요청 실패", response.status, data);
      }

      return data;
    } finally {
      /* 성공하든 실패하든 타이머는 반드시 정리 */
      window.clearTimeout(timer);
    }
  }


  /* ==========================================================
     오류를 사용자에게 보여줄 문구로 변환

     서버가 내려준 message 를 그대로 노출하면
     스택 트레이스나 내부 구조가 새어나갈 수 있으므로
     상태 코드 기준으로 정리된 문구를 사용
     ========================================================== */
  function toMessage(error, fallback) {
    if (!error) return fallback || "알 수 없는 오류가 발생했습니다.";

    if (error.name === "AbortError") {
      return "요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
    }

    /* status 가 없으면 네트워크 자체가 끊긴 상태 */
    if (typeof error.status === "undefined") {
      return "서버에 연결할 수 없습니다. 네트워크를 확인해주세요.";
    }

    if (error.status >= 500) {
      return "서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }
    if (error.status === 404) {
      return "요청하신 정보를 찾을 수 없습니다.";
    }
    if (error.status === 403) {
      return "권한이 없습니다.";
    }

    return error.message || fallback || "요청을 처리하지 못했습니다.";
  }


  /* ==========================================================
     목록 응답 정규화

     서버가 배열을 그대로 주기도 하고
     { items: [], totalCount: 0 } 형태로 감싸 주기도 하므로
     항상 배열로 통일해서 반환
     ========================================================== */
  function toList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
  }


  window.TomopetApi = {
    BASE_URL: BASE_URL,

    get: function (path, options) {
      return request("GET", path, undefined, options);
    },
    post: function (path, body, options) {
      return request("POST", path, body === undefined ? {} : body, options);
    },
    put: function (path, body, options) {
      return request("PUT", path, body === undefined ? {} : body, options);
    },
    patch: function (path, body, options) {
      return request("PATCH", path, body === undefined ? {} : body, options);
    },
    del: function (path, options) {
      return request("DELETE", path, undefined, options);
    },

    /* 이미지 등 파일 전송 - FormData 를 그대로 넘김 */
    upload: function (path, formData, options) {
      return request("POST", path, formData, options);
    },

    toMessage: toMessage,
    toList: toList
  };
})();
