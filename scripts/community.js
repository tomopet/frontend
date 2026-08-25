/* ============================================================
   TOMOPET | scripts/community.js
   검색 키워드: 커뮤니티, 게시판, 글 목록, 카테고리, 필터, 검색, 태그, 페이지네이션
   커뮤니티 게시글 목록

   의존
     layout.js  window.TomopetAuth
     api.js     window.TomopetApi
     ui.js      window.TomopetUi

   연동 엔드포인트
     GET /api/posts?page=&size=&category=&keyword=&tag=

       page      1부터 시작
       size      한 페이지 개수
       category  "free" | "gallery" | "recipe" (전체는 파라미터 생략)
       keyword   글 제목 검색
       tag       태그 검색 (# 을 뗀 순수 태그명)

   응답은 배열과 { items, totalCount, totalPages } 를 모두 허용함
   totalPages 가 없으면 totalCount 로 계산하고, 둘 다 없으면 개수로 추정함

   카드 구조와 배지 매핑은 index.js 와 같아야 함
   홈에서 넘어온 사용자와 목록에서 넘어온 사용자가 같은 링크 형식을 써야
   상세 페이지가 빈 화면이 되지 않음 (CONTRIBUTING 5번 계약)

   로그인 없이 볼 수 있는 페이지이므로 requireAuth 를 호출하지 않음
   ============================================================ */

(function () {
  "use strict";

  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var $ = Ui.$;

  /* 한 페이지 개수 - card-grid 가 3열이므로 3의 배수 */
  var PAGE_SIZE = 12;

  /* 태그는 "#태그명" 형식만 받음
     공백이나 # 이 섞인 값을 그대로 보내면 검색이 조용히 실패함 */
  var TAG_PATTERN = /^#[^\s#]+$/;

  /* 카테고리 코드 -> 배지 표시 정보
     서버 값이 목록에 없으면 배지를 생략하므로
     예상치 못한 값이 그대로 노출되지 않음 */
  var CATEGORY_BADGE = {
    gallery: { label: "갤러리", className: "badge badge--gallery" },
    recipe: { label: "레시피", className: "badge badge--recipe" },
    free: { label: "자유", className: "badge badge--free" }
  };

  var state = {
    category: "",        /* "" 는 전체 */
    searchType: "title",
    keyword: "",         /* 확정된 검색어 - 입력 중인 값이 아님 */
    page: 1,
    totalPages: 1,
    totalCount: 0
  };


  /* ==========================================================
     게시글 카드

     제목과 닉네임은 사용자 입력이므로 전부 Ui.createEl 로 삽입함
     createEl 은 textContent 를 쓰므로 XSS 에 안전함
     ========================================================== */

  function createPostCard(post) {
    var item = Ui.createEl("li", "card card--clickable");

    var link = Ui.createEl("a", "card__link");
    /* 홈(index.js)과 동일한 링크 형식 - "id" 나 "no" 로 바꾸면 상세가 빈 화면이 됨 */
    link.href = "./post-detail.html?postId=" + encodeURIComponent(post.postId);

    /* 이미지 URL 이 없으면 img 를 만들지 않음
       빈 src 는 현재 페이지를 이미지로 다시 내려받음 */
    link.appendChild(Ui.createThumb(post.thumbnailUrl, post.title));

    var body = Ui.createEl("div", "card__body");

    var badge = CATEGORY_BADGE[post.category];
    if (badge) {
      body.appendChild(Ui.createEl("span", badge.className, badge.label));
    }

    body.appendChild(Ui.createEl("h3", "card__title", post.title || "제목 없음"));

    var meta = Ui.createEl("div", "community-card__meta");
    meta.appendChild(Ui.createEl("span", null, post.authorNickname || "익명"));
    meta.appendChild(
      Ui.createEl("span", null, "좋아요 " + Ui.formatNumber(post.likeCount || 0))
    );
    body.appendChild(meta);

    link.appendChild(body);
    item.appendChild(link);
    return item;
  }


  /* ==========================================================
     빈 상태 문구

     "글이 하나도 없음" 과 "검색 결과가 없음" 은 사용자가 할 행동이 다름
     같은 문구를 쓰면 검색어를 고칠 생각을 못 하고 이탈함
     ========================================================== */

  function renderEmptyText() {
    var title = $("community-empty-title");
    var desc = $("community-empty-desc");

    if (state.keyword) {
      title.textContent = "검색 결과가 없습니다";
      desc.textContent = "다른 검색어로 다시 찾아보세요.";
      return;
    }

    if (state.category) {
      title.textContent = "해당 카테고리에 게시글이 없습니다";
      desc.textContent = "첫 이야기를 남겨보세요.";
      return;
    }

    title.textContent = "아직 게시글이 없습니다";
    desc.textContent = "첫 이야기를 남겨보세요.";
  }

  /* 결과 개수 - aria-live 영역이라 스크린리더가 갱신을 읽어줌 */
  function renderResultCount() {
    var el = $("community-result");

    if (!state.totalCount) {
      el.textContent = "";
      return;
    }

    el.textContent = state.keyword
      ? "검색 결과 " + Ui.formatNumber(state.totalCount) + "개"
      : "총 " + Ui.formatNumber(state.totalCount) + "개";
  }


  /* ==========================================================
     페이지네이션

     한 페이지뿐이면 통째로 숨김
     눌러도 반응이 없는 버튼을 노출하면 고장으로 인식됨
     ========================================================== */

  function renderPagination() {
    var nav = $("community-pagination");

    /* 숨기기 전에 값을 먼저 맞춤
       숨김 처리만 하고 빠져나가면 이전 페이지 수가 그대로 남아
       다시 여러 페이지가 됐을 때 낡은 값이 잠깐 보임 */
    $("community-page-status").textContent = state.page + " / " + state.totalPages;
    $("community-page-prev").disabled = state.page <= 1;
    $("community-page-next").disabled = state.page >= state.totalPages;

    /* 한 페이지뿐이면 통째로 숨김
       눌러도 반응이 없는 버튼을 노출하면 고장으로 인식됨 */
    nav.hidden = state.totalPages <= 1;
  }


  /* ==========================================================
     목록 조회
     ========================================================== */

  /* 상태를 쿼리 문자열로 변환
     빈 값은 아예 보내지 않음 - category= 처럼 빈 파라미터를 넘기면
     서버가 "" 를 필터 조건으로 해석할 수 있음 */
  function buildQuery() {
    var params = new URLSearchParams();
    params.set("page", String(state.page));
    params.set("size", String(PAGE_SIZE));

    if (state.category) params.set("category", state.category);

    if (state.keyword) {
      if (state.searchType === "tag") {
        params.set("tag", state.keyword.replace(/^#/, ""));
      } else {
        params.set("keyword", state.keyword);
      }
    }

    return params.toString();
  }

  /* 서버가 totalPages 를 주면 그대로 쓰고
     totalCount 만 주면 계산하고
     배열만 주면 받은 개수로 마지막 페이지인지 추정함 */
  function resolveTotalPages(data, itemCount) {
    if (data && typeof data.totalPages === "number") return data.totalPages;

    if (data && typeof data.totalCount === "number") {
      return Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE));
    }

    return itemCount < PAGE_SIZE ? state.page : state.page + 1;
  }

  function resolveTotalCount(data, itemCount) {
    if (data && typeof data.totalCount === "number") return data.totalCount;
    return itemCount;
  }

  async function loadPosts() {
    var list = $("community-list");
    var empty = $("community-empty");

    try {
      var data = await Api.get("/api/posts?" + buildQuery());
      var items = Api.toList(data);

      state.totalCount = resolveTotalCount(data, items.length);
      state.totalPages = resolveTotalPages(data, items.length);

      /* 문구를 먼저 정해야 renderList 가 빈 상태를 열 때 올바른 내용이 보임 */
      renderEmptyText();
      Ui.renderList(list, items, createPostCard, empty);

      renderResultCount();
      renderPagination();
      Ui.setFormMessage($("community-message"), "");
    } catch (error) {
      console.error("게시글 목록 로딩 실패:", error);

      /* 실패해도 빈 상태 UI 는 정상 노출 */
      state.totalCount = 0;
      state.totalPages = 1;

      renderEmptyText();
      Ui.renderList(list, [], createPostCard, empty);
      renderResultCount();
      renderPagination();

      Ui.setFormMessage(
        $("community-message"),
        Api.toMessage(error, "게시글을 불러오지 못했습니다."),
        "danger"
      );
    }
  }

  /* 필터나 검색이 바뀌면 1페이지부터 다시 봐야 함
     3페이지를 보던 중 필터를 바꾸면 결과가 1페이지뿐이라 빈 화면이 나옴 */
  function reload(resetPage) {
    if (resetPage) state.page = 1;
    loadPosts();
  }


  /* ==========================================================
     카테고리 필터
     ========================================================== */

  function initFilters() {
    var buttons = Ui.$$(".community__filter");

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var category = button.getAttribute("data-category") || "";
        if (category === state.category) return;

        state.category = category;

        /* 활성 상태는 클래스와 aria-pressed 를 함께 갱신함
           클래스만 바꾸면 스크린리더가 무엇이 선택됐는지 알 수 없음 */
        buttons.forEach(function (other) {
          var isActive = other === button;
          other.classList.toggle("is-active", isActive);
          other.setAttribute("aria-pressed", isActive ? "true" : "false");
        });

        reload(true);
      });
    });
  }


  /* ==========================================================
     검색
     ========================================================== */

  function clearSearchError() {
    Ui.setFieldError($("community-search-input"), $("community-search-error"), "");
  }

  /* 검색 대상에 따라 placeholder 와 안내 문구를 바꿈
     태그 검색인데 "글 제목을 입력해주세요" 가 떠 있으면 형식을 틀리게 됨 */
  function applySearchType(type) {
    var input = $("community-search-input");
    var hint = $("community-search-hint");

    if (type === "tag") {
      input.placeholder = "#태그명 형태로 입력해주세요.";
      hint.textContent = "태그 검색은 #태그명처럼 정확히 입력해주세요.";
      return;
    }

    input.placeholder = "글 제목을 입력해주세요.";
    hint.textContent = "글 제목의 일부만 입력해도 검색됩니다.";
  }

  function initSearch() {
    var form = $("community-search-form");
    var input = $("community-search-input");
    var typeSelect = $("community-search-type");

    typeSelect.addEventListener("change", function () {
      state.searchType = typeSelect.value;
      applySearchType(state.searchType);
      clearSearchError();
    });

    /* 입력을 고치기 시작하면 이전 오류를 지움 */
    input.addEventListener("input", clearSearchError);

    form.addEventListener("submit", function (event) {
      /* 없으면 페이지가 새로고침되며 검색어가 사라짐 */
      event.preventDefault();

      var value = input.value.trim();

      if (!value) {
        Ui.setFieldError(input, $("community-search-error"), "검색어를 입력해주세요.");
        input.focus();
        return;
      }

      if (state.searchType === "tag" && !TAG_PATTERN.test(value)) {
        Ui.setFieldError(
          input,
          $("community-search-error"),
          "태그는 #태그명 형태로 띄어쓰기 없이 입력해주세요."
        );
        input.focus();
        return;
      }

      clearSearchError();
      state.keyword = value;
      reload(true);
    });

    $("community-search-reset").addEventListener("click", function () {
      form.reset();
      /* reset 은 select 를 HTML 기본값으로 되돌리므로 상태도 함께 맞춤 */
      state.searchType = typeSelect.value;
      state.keyword = "";
      applySearchType(state.searchType);
      clearSearchError();
      reload(true);
    });
  }


  /* ==========================================================
     페이지 이동
     ========================================================== */

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > state.totalPages) return;

    state.page = nextPage;
    loadPosts();
    /* 페이지를 넘기면 목록 위쪽부터 보여야 함 */
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initPagination() {
    $("community-page-prev").addEventListener("click", function () {
      goToPage(state.page - 1);
    });

    $("community-page-next").addEventListener("click", function () {
      goToPage(state.page + 1);
    });
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    /* 새로고침 시 브라우저가 select 값을 복원하므로 상태를 DOM 에서 읽어옴 */
    state.searchType = $("community-search-type").value;
    applySearchType(state.searchType);

    initFilters();
    initSearch();
    initPagination();

    loadPosts();
  });
})();
