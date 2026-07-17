/* ============================================================
   TOMOPET | scripts/index.js
   메인(홈) 페이지 - 진입점

   의존
     layout.js  window.TomopetAuth
     api.js     window.TomopetApi
     ui.js      window.TomopetUi

   연동 엔드포인트
     GET /api/stats                        { recipeCount, memberCount, petCount }
     GET /api/posts?sort=popular&limit=3
     GET /api/feeds?limit=3

   [추후 적용] 통합 검색은 마크업만 있고 동작하지 않음
     백엔드에 /api/search 가 없어 제출을 막기만 함

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
      /* 실패 시 마크업의 초기값 "-" 를 그대로 유지 */
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
     맞춤 사료 추천
     ========================================================== */

  function createFeedCard(feed) {
    var item = Ui.createEl("li", "card card--clickable");

    var link = Ui.createEl("a", "card__link");
    link.href = "./feed-detail.html?feedId=" + encodeURIComponent(feed.feedId);

    link.appendChild(Ui.createThumb(feed.imageUrl, feed.name, "thumb--square"));

    var body = Ui.createEl("div", "card__body");
    body.appendChild(Ui.createEl("p", "card__desc", feed.brand || "-"));
    body.appendChild(Ui.createEl("h3", "card__title", feed.name || "이름 없음"));

    var meta = Ui.createEl("div", "card__meta");
    meta.appendChild(Ui.createEl("strong", null, Ui.formatPrice(feed.price)));
    body.appendChild(meta);

    link.appendChild(body);
    item.appendChild(link);
    return item;
  }

  async function loadFeedRecommend() {
    var list = $("feed-recommend-list");
    var empty = $("feed-recommend-empty");

    try {
      var data = await Api.get("/api/feeds?limit=3");
      Ui.renderList(list, Api.toList(data), createFeedCard, empty);
    } catch (error) {
      console.error("사료 추천 로딩 실패:", error);
      Ui.renderList(list, [], createFeedCard, empty);
    }
  }


  /* ==========================================================
     통합 검색

     [추후 적용] 백엔드에 /api/search 가 없어 아직 동작하지 않음
     지금은 제출을 막아 페이지가 새로고침되는 것만 방지함

     연결할 때는 아래처럼 쓰면 됨
       var keyword = $("global-search").value.trim();
       if (keyword) window.location.href = "./search.html?q=" + encodeURIComponent(keyword);

     검색 페이지 없이 재료만 찾게 하려면 /api/food-items?keyword= 로 연결
     ========================================================== */

  function initSearch() {
    var form = $("global-search-form");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      /* 없으면 페이지가 새로고침되며 입력값이 사라짐 */
      event.preventDefault();

      var keyword = $("global-search").value.trim();
      if (!keyword) return;

      /* [추후 적용] 검색 결과 페이지로 이동 */
      console.error("검색 미구현:", keyword);
    });
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    initSearch();

    /* 세 요청은 서로 독립적이므로 병렬로 보냄
       각 로더가 자체적으로 try / catch 하므로
       하나가 실패해도 나머지 섹션은 정상 렌더링됨 */
    Promise.all([loadStats(), loadPopularPosts(), loadFeedRecommend()]);
  });
})();
