(function () {
  "use strict";

  // API 및 UI 유틸리티 명명
  // [공통] 직접 fetch하거나 HTML 문자열을 조립하지 않고 공용 API/UI 모듈로 통신과 DOM 생성을 처리한다.
  const Api = window.TomopetApi;
  const Ui = window.TomopetUi;
  const $ = Ui.$;

  // 상수 및 상태 변수
  // 한 페이지 항목 수와 백엔드 카테고리 값에 대응하는 배지 표시 정보를 고정한다.
  const PAGE_SIZE = 12;
  const CATEGORY_BADGE = {
    gallery: {
      label: "갤러리",
      className: "badge badge--gallery"
    },
    recipe: {
      label: "레시피",
      className: "badge badge--recipe"
    },
    free: {
      label: "자유",
      className: "badge badge--free"
    }
  };

  // 현재 필터·검색·페이지 상태를 API 경로와 화면 상태가 함께 공유한다.
  let currentPage = 1;
  let totalPages = 1;
  let currentCategory = "";
  let searchType = "title";
  let searchQuery = "";
  let latestRequestId = 0;

  // DOM 요소 참조
  // 목록/빈 상태/검색/페이지네이션에서 반복 사용하는 DOM 요소를 한 번만 찾는다.
  const messageEl = $("community-message");
  const listEl = $("community-list");
  const emptyEl = $("community-empty");
  const emptyTitleEl = $("community-empty-title");
  const emptyDescEl = $("community-empty-desc");
  const resultEl = $("community-result");

  const searchFormEl = $("community-search-form");
  const searchTypeEl = $("community-search-type");
  const searchInputEl = $("community-search-input");
  const searchResetEl = $("community-search-reset");
  const searchErrorEl = $("community-search-error");
  const searchHintEl = $("community-search-hint");

  const paginationEl = $("community-pagination");
  const prevBtn = $("community-page-prev");
  const nextBtn = $("community-page-next");
  const pageStatusEl = $("community-page-status");

  // 카테고리 버튼
  // 여러 카테고리 버튼은 공용 다중 선택 유틸리티로 배열 형태의 참조를 얻는다.
  const categoryButtons = Ui.$$(".community__filter");

  // 게시글 카드 생성
  // 게시글 한 건을 XSS에 안전한 DOM 노드로 만들고 정확한 ?postId= 상세 링크를 부여한다.
  function createPostCard(post) {
    const card = Ui.createEl("li", "card card--clickable");
    const link = Ui.createEl("a", "card__link");

    link.href =
      "./post-detail.html?postId=" +
      encodeURIComponent(post.postId);

    link.setAttribute(
      "aria-label",
      post.title || "제목 없음"
    );

    const thumb = Ui.createThumb(
      post.thumbnailUrl || post.imageUrl,
      post.title || "제목 없음",
      "card__thumb"
    );

    // 목록 썸네일은 카드 크기를 통일하기 위한 축소 미리보기이며 상세 원본 이미지는 별도 갤러리에서 표시한다.
    const body = Ui.createEl("div", "card__body");

    const categoryInfo = CATEGORY_BADGE[post.category];

    if (categoryInfo) {
      const badge = Ui.createEl(
        "span",
        categoryInfo.className,
        categoryInfo.label
      );

      body.appendChild(badge);
    }

    const title = Ui.createEl(
      "h3",
      "card__title",
      post.title || "제목 없음"
    );

    const meta = Ui.createEl(
      "div",
      "community-card__meta"
    );

    const date = post.createdAt
      ? Ui.formatRelativeTime(post.createdAt)
      : "";

    const authorAndDate = date
      ? (post.authorNickname || "익명") + " · " + date
      : post.authorNickname || "익명";

    const likeCount = Math.max(
      0,
      Number(post.likeCount) || 0
    );

    meta.appendChild(
      Ui.createEl("span", null, authorAndDate)
    );

    meta.appendChild(
      Ui.createEl(
        "span",
        null,
        "좋아요 " + Ui.formatNumber(likeCount)
      )
    );

    body.appendChild(title);
    body.appendChild(meta);

    link.appendChild(thumb);
    link.appendChild(body);
    card.appendChild(link);

    return card;
  }

  // API 요청 경로 생성
  // 현재 페이지·카테고리·검색 상태를 URLSearchParams로 인코딩해 목록 API 경로를 만든다.
  function buildListPath(page) {
    const params = new URLSearchParams();

    params.append("page", page);
    params.append("size", PAGE_SIZE);

    if (currentCategory) {
      params.append("category", currentCategory);
    }

    if (searchQuery) {
      // 태그 검색은 UI에서 요구한 선행 #을 서버 키워드 값에서는 제거한다.
      const keyword =
        searchType === "tag"
          ? searchQuery.replace(/^#/, "")
          : searchQuery;

      params.append("keyword", keyword);
    }

    return "/api/posts?" + params.toString();
  }

  // API 응답 데이터 정규화
  // 배열 또는 페이지 객체 응답을 하나의 페이지 모델로 통합하고 누락된 page는 요청 페이지로 보완한다.
  function normalizePageData(data, requestedPage) {
    const fallbackPage = Math.max(
      1,
      Number(requestedPage) || 1
    );

    if (Array.isArray(data)) {
      return {
        items: data,
        totalPages: 1,
        totalCount: data.length,
        page: 1
      };
    }

    const safeData =
      data && typeof data === "object"
        ? data
        : {};

    const items = Api.toList(safeData);

    const rawTotalCount = Number(safeData.totalCount);

    const totalCount =
      Number.isFinite(rawTotalCount) && rawTotalCount >= 0
        ? Math.floor(rawTotalCount)
        : items.length;

    const rawTotalPages = Number(safeData.totalPages);

    const normalizedTotalPages = Math.max(
      1,
      Number.isFinite(rawTotalPages) && rawTotalPages > 0
        ? Math.floor(rawTotalPages)
        : Math.ceil(totalCount / PAGE_SIZE)
    );

    const rawPage = Number(safeData.page);

    const page = Math.min(
      // 서버 page가 없거나 잘못되어도 요청 페이지를 먼저 복원한 뒤 전체 페이지 범위로 제한한다.
      normalizedTotalPages,
      Math.max(
        1,
        Number.isFinite(rawPage) && rawPage > 0
          ? Math.floor(rawPage)
          : fallbackPage
      )
    );

    return {
      items,
      page,
      totalPages: normalizedTotalPages,
      totalCount
    };
  }

  // 카테고리 버튼 상태 변경
  // 선택 카테고리를 시각 클래스와 aria-pressed에 동시에 반영한다.
  function updateFilterButtons() {
    categoryButtons.forEach(function (button) {
      const category =
        button.getAttribute("data-category") || "";

      const isActive =
        category === currentCategory;

      button.classList.toggle(
        "is-active",
        isActive
      );

      button.setAttribute(
        "aria-pressed",
        String(isActive)
      );
    });
  }

  // 페이지네이션 상태 변경
  // 응답의 현재/전체 페이지를 저장하고 이전·다음 버튼과 상태 텍스트를 갱신한다.
  function updatePagination(pageData) {
    totalPages = pageData.totalPages;
    currentPage = pageData.page;

    if (totalPages <= 1) {
      paginationEl.hidden = true;
      pageStatusEl.textContent = "";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    paginationEl.hidden = false;

    pageStatusEl.textContent =
      currentPage +
      " / " +
      totalPages +
      " 페이지";

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  }

  // 빈 목록 상태 변경
  // 빈 결과가 검색 때문인지 카테고리 때문인지 구분해 다음 행동을 안내한다.
  function updateEmptyState(items) {
    if (items.length > 0) {
      emptyEl.hidden = true;
      return;
    }

    emptyEl.hidden = false;

    if (searchQuery) {
      emptyTitleEl.textContent =
        "검색 결과가 없습니다";

      emptyDescEl.textContent =
        "다른 검색어로 다시 시도해주세요.";

      return;
    }

    emptyTitleEl.textContent =
      "해당 카테고리에 게시글이 없습니다";

    emptyDescEl.textContent =
      "첫 이야기를 남겨보세요.";
  }

  // 게시글 목록 불러오기
  // [API 연동] 목록을 요청하고 카드·결과 수·빈 상태·페이지네이션을 하나의 응답으로 갱신한다.
  async function loadPosts() {
    Ui.setFormMessage(
      messageEl,
      "",
      "info"
    );

    const requestId = ++latestRequestId;

    // 로딩 중임을 보조기기에 알리고 중복 페이지 이동을 막는다.
    listEl.setAttribute("aria-busy", "true");
    prevBtn.disabled = true;
    nextBtn.disabled = true;

    try {
      const requestedPage = currentPage;
      const path = buildListPath(requestedPage);
      const response = await Api.get(path);

      // 이전 요청보다 늦게 도착한 응답은 무시
      // 빠른 필터 전환 중 이전 요청이 늦게 도착해 최신 화면을 덮지 않도록 무시한다.
      if (requestId !== latestRequestId) {
        return;
      }

      const pageData =
        normalizePageData(response, requestedPage);

      Ui.renderList(
        listEl,
        pageData.items,
        createPostCard,
        emptyEl
      );

      resultEl.textContent =
        pageData.totalCount > 0
          ? Ui.formatNumber(pageData.totalCount) +
            "개의 게시글이 있습니다."
          : "게시글이 없습니다.";

      updateEmptyState(pageData.items);
      updatePagination(pageData);
    } catch (error) {
      if (requestId !== latestRequestId) {
        return;
      }

      console.error(
        "게시글 목록 조회 실패:",
        error
      );

      Ui.renderList(
        listEl,
        [],
        createPostCard,
        emptyEl
      );

      emptyEl.hidden = true;

      resultEl.textContent =
        "게시글을 불러오지 못했습니다.";

      paginationEl.hidden = true;

      Ui.setFormMessage(
        messageEl,
        Api.toMessage(error),
        "danger"
      );
    } finally {
      // 마지막으로 시작된 요청만 aria-busy를 해제해 진행 중 요청의 상태가 사라지지 않게 한다.
      if (requestId === latestRequestId) {
        listEl.removeAttribute("aria-busy");
      }
    }
  }

  // 카테고리 버튼 클릭
  // 카테고리 변경 시 첫 페이지로 돌아가 선택 상태를 표시한 뒤 목록을 다시 요청한다.
  function handleCategoryClick(event) {
    const button = event.currentTarget;

    currentCategory =
      button.getAttribute("data-category") || "";

    currentPage = 1;

    updateFilterButtons();
    loadPosts();
  }

  // 검색 폼 제출
  // 검색 폼 제출을 가로채 제목/태그 규칙을 검증한 뒤 첫 페이지부터 조회한다.
  function handleSearchSubmit(event) {
    event.preventDefault();

    const query =
      searchInputEl.value.trim();

    const selectedSearchType =
      searchTypeEl.value === "tag"
        ? "tag"
        : "title";

    if (!query) {
      Ui.setFieldError(
        searchInputEl,
        searchErrorEl,
        "검색어를 입력해주세요."
      );

      searchInputEl.focus();

      return;
    }

    if (
      selectedSearchType === "tag" &&
      (!query.startsWith("#") ||
        query.length === 1 ||
        /\s/.test(query))
    ) {
      Ui.setFieldError(
        searchInputEl,
        searchErrorEl,
        "태그 검색은 공백 없이 #태그명으로 입력해주세요."
      );

      searchInputEl.focus();

      return;
    }

    Ui.setFieldError(
      searchInputEl,
      searchErrorEl,
      ""
    );

    searchType = selectedSearchType;
    searchQuery = query;
    currentPage = 1;

    loadPosts();
  }

  // 검색 초기화
  // 검색어와 오류를 비우고 현재 선택된 검색 유형을 유지한 채 전체 목록을 다시 조회한다.
  function resetSearch() {
    searchInputEl.value = "";
    searchType =
      searchTypeEl.value === "tag"
        ? "tag"
        : "title";
    searchQuery = "";
    currentPage = 1;

    Ui.setFieldError(
      searchInputEl,
      searchErrorEl,
      ""
    );

    loadPosts();
  }

  // 검색 타입 변경
  // 제목/태그 선택에 맞춰 placeholder, 태그 형식 안내, 이전 오류 상태를 동기화한다.
  function handleSearchTypeChange() {
    const selectedSearchType =
      searchTypeEl.value === "tag"
        ? "tag"
        : "title";

    searchInputEl.placeholder =
      selectedSearchType === "tag"
        ? "#태그명을 입력해주세요."
        : "글 제목을 입력해주세요.";

    searchHintEl.hidden =
      selectedSearchType !== "tag";

    Ui.setFieldError(
      searchInputEl,
      searchErrorEl,
      ""
    );
  }

  // 이벤트 연결
  // 필터·검색·페이지 이동 이벤트를 초기화 단계에서 한 번만 연결한다.
  function bindEvents() {
    categoryButtons.forEach(function (button) {
      button.addEventListener(
        "click",
        handleCategoryClick
      );
    });

    searchFormEl.addEventListener(
      "submit",
      handleSearchSubmit
    );

    searchResetEl.addEventListener(
      "click",
      resetSearch
    );

    searchTypeEl.addEventListener(
      "change",
      handleSearchTypeChange
    );

    prevBtn.addEventListener(
      "click",
      function () {
        if (currentPage <= 1) {
          return;
        }

        currentPage -= 1;
        loadPosts();
      }
    );

    nextBtn.addEventListener(
      "click",
      function () {
        if (currentPage >= totalPages) {
          return;
        }

        currentPage += 1;
        loadPosts();
      }
    );
  }

  // 초기 실행
  // DOM의 초기 검색 유형을 상태에 반영하고 이벤트 연결 후 첫 목록을 불러온다.
  function init() {
    searchType = searchTypeEl.value || "title";

    handleSearchTypeChange();
    updateFilterButtons();
    bindEvents();
    loadPosts();
  }

  document.addEventListener(
    "DOMContentLoaded",
    init
  );
})();
