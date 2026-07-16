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
     로그인 상태에 따른 히어로 CTA 조정
     ========================================================== */

  function adjustHeroCta() {
    if (!window.TomopetAuth || !window.TomopetAuth.isLoggedIn()) return;

    var startBtn = document.querySelector('.hero__cta a[href="./login.html"]');
    if (!startBtn) return;

    /* 이미 로그인했다면 "밥상 자랑하러 가기" 대신 글쓰기로 바로 유도 */
    startBtn.href = "./post-write.html";
    startBtn.textContent = "레시피 공유하기";
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    adjustHeroCta();

    Promise.all([loadStats(), loadPopularPosts(), loadFeedRecommend()]);
  });
})();
