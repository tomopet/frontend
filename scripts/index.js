/* ============================================================
   TOMOPET | scripts/index.js
   검색 키워드: 홈, 메인, 통계, 인기 밥상, 바로가기, 스켈레톤
   메인(홈) 페이지 - 진입점

   의존
     layout.js  window.TomopetAuth
     api.js     window.TomopetApi
     ui.js      window.TomopetUi

   연동 엔드포인트
     GET /api/stats                        { recipeCount, memberCount, petCount }
     GET /api/posts?sort=popular&limit=3

   홈 검색바는 제거됨 - 검색은 식단 페이지의 음식 검색 모달로 일원화

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
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {

    /* 세 요청은 서로 독립적이므로 병렬로 보냄
       각 로더가 자체적으로 try / catch 하므로
       하나가 실패해도 나머지 섹션은 정상 렌더링됨 */
    Promise.all([loadStats(), loadPopularPosts()]);
  });
})();
