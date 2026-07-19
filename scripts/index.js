/* ============================================================
   TOMOPET | scripts/index.js
   검색 키워드: 홈, 메인, 통계, 인기 밥상, 통합 검색, 최근 검색어, 추천 검색어, 스켈레톤
   메인(홈) 페이지 - 진입점

   의존
     layout.js  window.TomopetAuth
     api.js     window.TomopetApi
     ui.js      window.TomopetUi

   연동 엔드포인트
     GET /api/stats                        { recipeCount, memberCount, petCount }
     GET /api/posts?sort=popular&limit=3

   통합 검색은 diet.html?keyword= 로 연결됨 (음식 검색 모달 재사용)

   세 요청은 서로 독립적이므로 병렬로 보내고
   각 로더가 자체적으로 catch 하므로
   하나가 실패해도 나머지 섹션은 정상 렌더링됨
   ============================================================ */

(function () {
  "use strict";

  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var $ = Ui.$;


  /* ==========================================================
     서비스 통계
     ========================================================== */

  function renderStats(stats) {
    var mapping = [
      ["stat-recipe-count", stats.recipeCount],
      ["stat-member-count", stats.memberCount],
      ["stat-pet-count", stats.petCount]
    ];

    mapping.forEach(function (pair) {
      var el = $(pair[0]);
      if (el) el.textContent = Ui.formatNumber(pair[1]);
    });
  }

  async function loadStats() {
    try {
      var stats = await Api.get("/api/stats");
      renderStats(stats);
    } catch (error) {
      console.error("통계 로딩 실패:", error);
      /* 실패 시 스켈레톤이 무한히 깜빡이지 않도록 "-" 로 교체 */
      ["stat-recipe-count", "stat-member-count", "stat-pet-count"].forEach(function (id) {
        var el = $(id);
        if (el) el.textContent = "-";
      });
    }
  }


  /* ==========================================================
     인기 게시글
     ========================================================== */

  /* 카테고리 코드 -> 배지 표시 정보
     서버 값이 목록에 없으면 배지를 생략하므로
     예상치 못한 값이 그대로 노출되지 않음 */
  var CATEGORY_BADGE = {
    gallery: { label: "갤러리", className: "badge badge--gallery" },
    recipe: { label: "레시피", className: "badge badge--recipe" },
    free: { label: "자유", className: "badge badge--free" }
  };

  function createPostCard(post) {
    var item = Ui.createEl("li", "card card--clickable");

    var link = Ui.createEl("a", "card__link");
    link.href = "./post-detail.html?postId=" + encodeURIComponent(post.postId);

    link.appendChild(Ui.createThumb(post.thumbnailUrl, post.title));

    var body = Ui.createEl("div", "card__body");

    var badge = CATEGORY_BADGE[post.category];
    if (badge) {
      body.appendChild(Ui.createEl("span", badge.className, badge.label));
    }

    body.appendChild(Ui.createEl("h3", "card__title", post.title || "제목 없음"));

    var meta = Ui.createEl("div", "card__meta");
    meta.appendChild(Ui.createEl("span", null, post.authorNickname || "익명"));
    meta.appendChild(
      Ui.createEl("span", null, "좋아요 " + Ui.formatNumber(post.likeCount || 0))
    );
    body.appendChild(meta);

    link.appendChild(body);
    item.appendChild(link);
    return item;
  }

  async function loadPopularPosts() {
    var list = $("popular-post-list");
    var empty = $("popular-post-empty");

    try {
      var data = await Api.get("/api/posts?sort=popular&limit=3");
      Ui.renderList(list, Api.toList(data), createPostCard, empty);
    } catch (error) {
      console.error("인기 게시글 로딩 실패:", error);
      /* 실패해도 빈 상태 UI 는 정상 노출 */
      Ui.renderList(list, [], createPostCard, empty);
    }
  }


  /* ==========================================================
     최근 / 추천 검색어

     최근 검색어는 localStorage 에만 저장됨 (서버 전송 없음)
       시크릿 모드 등에서 localStorage 접근이 막힐 수 있어
       읽기/쓰기를 전부 try 로 감쌈 - 실패해도 검색은 동작해야 함
     ========================================================== */

  var RECENT_KEY = "tomopet.recentSearches";
  var RECENT_MAX = 5;

  /* 첫 방문자에게 검색 사용법을 보여주는 예시 재료
     급여 가능(닭가슴살·고구마)과 주의(포도·양파)를 섞어
     "안 되는 것도 알려주는 서비스"임이 드러나게 함 */
  var SUGGESTED_KEYWORDS = ["닭가슴살", "고구마", "포도", "양파"];

  function readRecent() {
    try {
      var raw = window.localStorage.getItem(RECENT_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function writeRecent(list) {
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch (error) {
      /* 저장 실패는 치명적이지 않음 */
    }
  }

  function saveRecent(keyword) {
    var list = readRecent().filter(function (item) { return item !== keyword; });
    list.unshift(keyword);
    writeRecent(list.slice(0, RECENT_MAX));
  }

  function goSearch(keyword) {
    saveRecent(keyword);
    window.location.href = "./diet.html?keyword=" + encodeURIComponent(keyword);
  }

  function createChip(keyword, options) {
    var chip = Ui.createEl("button", "search-chip" + (options.suggest ? " search-chip--suggest" : ""));
    chip.type = "button";
    chip.appendChild(document.createTextNode(keyword));
    chip.addEventListener("click", function () { goSearch(keyword); });

    if (options.removable) {
      var remove = Ui.createEl("span", "search-chip__remove", "✕");
      remove.setAttribute("role", "button");
      remove.setAttribute("aria-label", keyword + " 검색 기록 삭제");
      remove.addEventListener("click", function (event) {
        /* 칩 클릭(검색 이동)과 분리 */
        event.stopPropagation();
        writeRecent(readRecent().filter(function (item) { return item !== keyword; }));
        renderSearchPanel();
      });
      chip.appendChild(remove);
    }

    var item = Ui.createEl("li");
    item.appendChild(chip);
    return item;
  }

  function renderSearchPanel() {
    var recentSection = $("recent-search-section");
    var recentList = $("recent-search-list");
    var suggestList = $("suggest-search-list");
    if (!recentList || !suggestList) return;

    var recent = readRecent();
    recentSection.hidden = recent.length === 0;

    recentList.textContent = "";
    recent.forEach(function (keyword) {
      recentList.appendChild(createChip(keyword, { removable: true }));
    });

    suggestList.textContent = "";
    SUGGESTED_KEYWORDS.forEach(function (keyword) {
      suggestList.appendChild(createChip(keyword, { suggest: true }));
    });
  }

  function initSearchPanel() {
    var panel = $("search-panel");
    var input = $("global-search");
    var clearBtn = $("recent-clear-btn");
    if (!panel || !input) return;

    input.addEventListener("focus", function () {
      renderSearchPanel();
      panel.hidden = false;
    });

    /* blur 대신 바깥 클릭으로 닫음
       blur 로 닫으면 패널 안의 칩을 누르기 전에 패널이 사라짐 */
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".hero-search")) panel.hidden = true;
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") panel.hidden = true;
    });

    clearBtn.addEventListener("click", function () {
      writeRecent([]);
      renderSearchPanel();
    });
  }


  /* ==========================================================
     통합 검색

     별도 검색 페이지 대신 식단의 음식 검색 모달을 재사용합니다.
     diet.html?keyword= 로 이동하면 diet.js 가 모달을 열고
     /api/food-items?keyword= 를 바로 조회합니다.

     이유
       1. "이거 먹여도 될까요?" 가 서비스 핵심 질문이고
          그 답(금지 식품 여부 + 칼로리)이 이미 음식 검색에 있음
       2. 백엔드에 /api/search 를 새로 만들 필요가 없음

     식단은 로그인 필수 페이지라 비로그인 사용자는
     로그인 화면으로 이동함 (keyword 는 유실 - ROADMAP 참고)
     ========================================================== */

  function initSearch() {
    var form = $("global-search-form");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      /* 없으면 페이지가 새로고침되며 입력값이 사라짐 */
      event.preventDefault();

      var keyword = $("global-search").value.trim();
      if (!keyword) return;

      /* 최근 검색어 저장을 거쳐 이동 */
      goSearch(keyword);
    });

    /* 헤더 검색 아이콘으로 진입 - 검색창에 바로 포커스
       주소는 정리해 새로고침 시 반복 실행을 막음 */
    var params = new URLSearchParams(window.location.search);
    if (params.get("focus") === "search") {
      window.history.replaceState(null, "", window.location.pathname);
      $("global-search").focus();
    }
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    initSearch();

    /* 세 요청은 서로 독립적이므로 병렬로 보냄
       각 로더가 자체적으로 try / catch 하므로
       하나가 실패해도 나머지 섹션은 정상 렌더링됨 */
    initSearchPanel();
    Promise.all([loadStats(), loadPopularPosts()]);
  });
})();
