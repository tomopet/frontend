/* ============================================================
   TOMOPET | scripts/feed-recommend.js
   협업자용 견본 스크립트 (복사해서 쓰세요)

   이 파일은 새 페이지를 만들 때 복사용 뼈대입니다.
   "feed-recommend" 를 본인 담당 이름으로 전부 바꾸고,
   엔드포인트와 카드 모양을 실제에 맞게 고치면 됩니다.

   README 4번 "REST API 표준 문법" 을 그대로 따릅니다.
     async 함수 + try / catch + console.error("...실패:", error)

   의존 (전부 layout.js/api.js/ui.js 가 제공)
     window.TomopetAuth  인증
     window.TomopetApi   HTTP 통신
     window.TomopetUi    DOM / 포맷
   ============================================================ */

(function () {
  "use strict";

  /* 공통 모듈 별칭 - 매번 window. 을 붙이지 않기 위함 */
  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var $ = Ui.$;


  /* ==========================================================
     카드 한 개를 만드는 함수

     사용자 입력(제목 등)은 반드시 Ui.createEl 로 넣을 것.
     createEl 은 textContent 로 삽입하므로 XSS 에 안전함.
     innerHTML 은 절대 쓰지 말 것.
     ========================================================== */
  function createCard(item) {
    var li = Ui.createEl("article", "feed-card");

    var link = Ui.createEl("a", "feed-card__link");
    /* 상세 페이지로 갈 때 쿼리 파라미터 이름을 팀 약속대로 쓸 것
       예: post-detail 은 ?postId=, food-detail 은 ?foodId= */
    link.href = "./feed-detail.html?feedId=" + encodeURIComponent(item.id);

    /* 이미지 - URL 이 없으면 img 를 만들지 않음 (빈 src 금지) */
    if (item.imageUrl) {
      var imgContainer = Ui.createEl("div", "feed-card__image-container");
      imgContainer.appendChild(Ui.createThumb(item.imageUrl, item.name || item.title));
      link.appendChild(imgContainer);
    }

    var body = Ui.createEl("div", "feed-card__info");
    body.appendChild(Ui.createEl("span", "feed-card__brand", item.brand || "브랜드 없음"));
    body.appendChild(Ui.createEl("h3", "feed-card__name", item.name || item.title || "제목 없음"));
    
    // 원화 단위 콤마 포맷 처리
    var priceStr = item.price ? (typeof item.price === "number" ? item.price.toLocaleString() : item.price) + "원" : "가격 미정";
    body.appendChild(Ui.createEl("span", "feed-card__price", priceStr));
    link.appendChild(body);

    li.appendChild(link);
    return li;
  }


  /* ==========================================================
     목록 불러오기 - 표준 문법 (async + try/catch)
     ========================================================== */
  async function loadList() {
    var list = $("feed-grid-container");
    var empty = $("feed-empty-view");
    var loading = $("feed-loading-view");

    // 로딩 시작 시 더미 카드들이 들어있던 영역을 비우고 로딩 뷰 활성화
    if (loading) loading.removeAttribute("hidden");

    try {
      /* fetch 를 직접 쓰지 않고 Api.get 을 사용
         토큰 첨부, 타임아웃, 401 처리가 자동으로 됨 */
      var data = await Api.get("/api/feeds/recommend");

      /* Api.toList 는 배열이든 {items:[]} 든 배열로 정규화
         renderList 는 목록을 채우고 빈 상태를 자동 토글 */
      Ui.renderList(list, Api.toList(data), createCard, empty);
    } catch (error) {
      console.error("목록 로딩 실패:", error);

      /* 실패해도 화면이 깨지지 않도록 빈 상태를 노출 */
      Ui.renderList(list, [], createCard, empty);
      
      // 혹시 HTML 파일에 에러 메시지를 뿌려줄 컨테이너 요소가 존재한다면 출력
      var msgEl = $("feed-recommend-message") || $("feed-filter-form");
      if (msgEl) {
        Ui.setFormMessage(
          msgEl,
          Api.toMessage(error, "추천 사료 목록을 불러오지 못했습니다."),
          "danger"
        );
      }
    } finally {
      // 통신이 끝나면 로딩 뷰 제거
      if (loading) loading.setAttribute("hidden", "true");
    }
  }


  /* ==========================================================
     초기화
     ========================================================== */
  document.addEventListener("DOMContentLoaded", function () {
    /* 로그인 필수 페이지라면 아래 주석을 해제할 것
       (post-write, health-record, my-page 가 해당)

    if (!window.TomopetAuth.requireAuth()) return;
    */

    // 필터 검색 폼 이벤트 리스너 연동 (옵션)
    var filterForm = $("feed-filter-form");
    if (filterForm) {
      filterForm.addEventListener("submit", function (e) {
        e.preventDefault();
        loadList(); // 검색 버튼 클릭 시 목록 재로딩
      });
    }

    // 필터 초기화 버튼 바인딩
    var resetBtn = $("reset-filter-btn");
    if (resetBtn && filterForm) {
      resetBtn.addEventListener("click", function () {
        filterForm.reset();
        loadList();
      });
    }

    loadList();
  });
})();