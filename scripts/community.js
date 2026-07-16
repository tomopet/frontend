(function() {
  "use strict";

  // API 및 UI 유틸리티 별칭
  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var $ = Ui.$;

  // 상수 정의
  var PAGE_SIZE = 12;
  var currentPage = 1;
  var totalPages = 1;
  var currentCategory = "";
  var searchType = "title";
  var searchQuery = "";
  var latestRequestId = 0;

  // DOM 요소 참조
  var messageEl = $("community-message");
  var listEl = $("community-list");
  var emptyEl = $("community-empty");
  var emptyTitleEl = $("community-empty-title");
  var emptyDescEl = $("community-empty-desc");
  var resultEl = $("community-result");
  var searchFormEl = $("community-search-form");
  var searchTypeEl = $("community-search-type");
  var searchInputEl = $("community-search-input");
  var searchResetEl = $("community-search-reset");
  var searchErrorEl = $("community-search-error");
  var searchHintEl = $("community-search-hint");
  var paginationEl = $("community-pagination");
  var prevBtn = $("community-page-prev");
  var nextBtn = $("community-page-next");
  var pageStatusEl = $("community-page-status");

  // 카테고리 버튼들
  var categoryButtons = Ui.$$(".community__filter");

  // 게시글 카드 생성
  function createPostCard(post) {
    var card = Ui.createEl("li", "card card--clickable");
    var link = Ui.createEl("a", "card__link");
    link.href = "./post-detail.html?postId=" + encodeURIComponent(post.postId);
    link.setAttribute("aria-label", post.title || "제목 없음");

    var thumb = Ui.createThumb(
      post.thumbnailUrl || post.imageUrl,
      post.title || "제목 없음",
      "card__thumb"
    );

    var body = Ui.createEl("div", "card__body");

    var badge = null;
    if (post.category) {
      var categoryMap = {
        gallery: { label: "갤러리", className: "badge badge--gallery" },
        recipe: { label: "레시피", className: "badge badge--recipe" },
        free: { label: "자유", className: "badge badge--free" }
      };
      var categoryInfo = categoryMap[post.category];
      if (categoryInfo) {
        badge = Ui.createEl("span", categoryInfo.className, categoryInfo.label);
      }
    }

    var title = Ui.createEl("h3", "card__title", post.title || "제목 없음");

    var meta = Ui.createEl("div", "community-card__meta");
    var author = Ui.createEl("span", null, post.authorNickname || "익명");
    var date = post.createdAt ? Ui.formatRelativeTime(post.createdAt) : "";
    var likeCount = Ui.formatNumber(Number(post.likeCount) || 0) + " 좋아요";
    meta.appendChild(author);
    if (date) {
      meta.appendChild(Ui.createEl("span", null, " · "));
      meta.appendChild(Ui.createEl("span", null, date));
    }
    meta.appendChild(Ui.createEl("span", null, " · "));
    meta.appendChild(Ui.createEl("span", null, likeCount));

    if (badge) body.appendChild(badge);
    body.appendChild(title);
    body.appendChild(meta);

    card.appendChild(link);
    link.appendChild(thumb);
    link.appendChild(body);

    return card;
  }

  // URL 경로 구성
  function buildListPath() {
    var params = new URLSearchParams();
    params.append("page", currentPage);
    params.append("size", PAGE_SIZE);

    if (currentCategory) {
      params.append("category", currentCategory);
    }

    if (searchQuery) {
      params.append("keyword", searchType === "tag" ? searchQuery.replace(/^#/, "") : searchQuery);
    }

    return "/api/posts?" + params.toString();
  }

  // 페이지 데이터 정규화
  function normalizePageData(data) {
    if (Array.isArray(data)) {
      return {
        items: data,
        totalPages: 1,
        totalCount: data.length,
        page: 1
      };
    }

    data = data && typeof data === "object" ? data : {};
    var items = Array.isArray(data.items) ? data.items : [];
    var page = Math.max(1, Number(data.page) || 1);
    var total = Math.max(1, Number(data.totalPages) || 1);
    var count = Math.max(0, Number(data.totalCount) || items.length);

    return {
      items: items,
      totalPages: total,
      totalCount: count,
      page: page
    };
  }

  // 필터 버튼 상태 업데이트
  function updateFilterButtons() {
    categoryButtons.forEach(function(btn) {
      var category = btn.getAttribute("data-category");
      if (category === currentCategory) {
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.classList.remove("is-active");
        btn.setAttribute("aria-pressed", "false");
      }
    });
  }

  // 페이지네이션 업데이트
  function updatePagination(pageData) {
    totalPages = pageData.totalPages;
    currentPage = pageData.page;

    if (totalPages <= 1) {
      paginationEl.hidden = true;
      return;
    }

    paginationEl.hidden = false;
    pageStatusEl.textContent = currentPage + " / " + totalPages + " 페이지";

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  }

  // 게시글 목록 로드
  async function loadPosts() {
    // 기존 메시지 초기화
    Ui.setFormMessage(messageEl, "", "info");

    var requestId = ++latestRequestId;
    prevBtn.disabled = true;
    nextBtn.disabled = true;

    try {
      var path = buildListPath();
      var response = await Api.get(path);
      if (requestId !== latestRequestId) return;
      var pageData = normalizePageData(response);

      // 목록 렌더링
      Ui.renderList(listEl, pageData.items, createPostCard, emptyEl);

      // 결과 텍스트 업데이트
      var resultText = pageData.totalCount > 0
        ? Ui.formatNumber(pageData.totalCount) + "개의 게시글이 있습니다."
        : "게시글이 없습니다.";
      resultEl.textContent = resultText;

      // 빈 상태 업데이트
      if (pageData.items.length === 0) {
        emptyEl.hidden = false;
        emptyTitleEl.textContent = searchQuery ? "검색 결과가 없습니다" : "해당 카테고리에 게시글이 없습니다";
        emptyDescEl.textContent = searchQuery ? "다른 검색어로 다시 시도해주세요." : "첫 이야기를 남겨보세요.";
      } else {
        emptyEl.hidden = true;
      }

      // 페이지네이션 업데이트
      updatePagination(pageData);

    } catch (error) {
      if (requestId !== latestRequestId) return;
      console.error("게시글 목록 조회 실패:", error);
      Ui.renderList(listEl, [], createPostCard, emptyEl);
      resultEl.textContent = "게시글을 불러오지 못했습니다.";
      paginationEl.hidden = true;
      Ui.setFormMessage(messageEl, Api.toMessage(error), "danger");
    }
  }

  // 카테고리 클릭 핸들러
  function handleCategoryClick(event) {
    var target = event.target;
    if (target.classList.contains("community__filter")) {
      currentCategory = target.getAttribute("data-category");
      currentPage = 1;
      updateFilterButtons();
      loadPosts();
    }
  }

  // 검색 폼 제출 핸들러
  function handleSearchSubmit(event) {
    event.preventDefault();
    var query = searchInputEl.value.trim();

    if (!query) {
      Ui.setFieldError(searchInputEl, searchErrorEl, "검색어를 입력해주세요.");
      return;
    }

    if (searchType === "tag" && !query.startsWith("#")) {
      Ui.setFieldError(searchInputEl, searchErrorEl, "태그 검색은 #으로 시작해야 합니다.");
      return;
    }

    // 오류 초기화
    Ui.setFieldError(searchInputEl, searchErrorEl, "");

    searchQuery = query;
    currentPage = 1;
    loadPosts();
  }

  // 검색 초기화
  function resetSearch() {
    searchInputEl.value = "";
    searchQuery = "";
    currentPage = 1;
    Ui.setFieldError(searchInputEl, searchErrorEl, "");
    loadPosts();
  }

  // 검색 타입 변경 핸들러
  function handleSearchTypeChange() {
    searchType = searchTypeEl.value;
    searchInputEl.placeholder = searchType === "tag"
      ? "#태그명을 입력해주세요."
      : "글 제목을 입력해주세요.";

    searchHintEl.hidden = searchType !== "tag";
    Ui.setFieldError(searchInputEl, searchErrorEl, "");
  }

  // 이벤트 바인딩
  function bindEvents() {
    categoryButtons.forEach(function(btn) {
      btn.addEventListener("click", handleCategoryClick);
    });

    searchFormEl.addEventListener("submit", handleSearchSubmit);
    searchResetEl.addEventListener("click", resetSearch);
    searchTypeEl.addEventListener("change", handleSearchTypeChange);
    prevBtn.addEventListener("click", function() {
      if (currentPage > 1) {
        currentPage--;
        loadPosts();
      }
    });
    nextBtn.addEventListener("click", function() {
      if (currentPage < totalPages) {
        currentPage++;
        loadPosts();
      }
    });
  }

  // DOM 로드 후 초기화
  document.addEventListener("DOMContentLoaded", function() {
    bindEvents();
    loadPosts();
  });
})();
