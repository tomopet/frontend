/* ============================================================
   TOMOPET | scripts/post-detail.js  (견본 복사본 - 담당자 작업 대기)
   협업자용 견본 스크립트 (복사해서 쓰세요)

   이 파일은 새 페이지를 만들 때 복사용 뼈대입니다.
   "example" 를 본인 담당 이름으로 전부 바꾸고,
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
    var li = Ui.createEl("li", "card card--clickable");

    var link = Ui.createEl("a", "card__link");
    /* 상세 페이지로 갈 때 쿼리 파라미터 이름을 팀 약속대로 쓸 것
       예: post-detail 은 ?postId=, feed-detail 은 ?feedId= */
    link.href = "./index.html?exampleId=" + encodeURIComponent(item.id);

    /* 이미지 - URL 이 없으면 img 를 만들지 않음 (빈 src 금지) */
    link.appendChild(Ui.createThumb(item.imageUrl, item.title));

    var body = Ui.createEl("div", "card__body");
    body.appendChild(Ui.createEl("h3", "card__title", item.title || "제목 없음"));
    body.appendChild(Ui.createEl("p", "card__desc", item.description || ""));
    link.appendChild(body);

    li.appendChild(link);
    return li;
  }


  /* ==========================================================
     목록 불러오기 - 표준 문법 (async + try/catch)
     ========================================================== */
  async function loadList() {
    var list = $("example-list");
    var empty = $("example-empty");

    try {
      /* fetch 를 직접 쓰지 않고 Api.get 을 사용
         토큰 첨부, 타임아웃, 401 처리가 자동으로 됨 */
      var data = await Api.get("/api/example");

      /* Api.toList 는 배열이든 {items:[]} 든 배열로 정규화
         renderList 는 목록을 채우고 빈 상태를 자동 토글 */
      Ui.renderList(list, Api.toList(data), createCard, empty);
    } catch (error) {
      console.error("목록 로딩 실패:", error);

      /* 실패해도 화면이 깨지지 않도록 빈 상태를 노출 */
      Ui.renderList(list, [], createCard, empty);
      Ui.setFormMessage(
        $("example-message"),
        Api.toMessage(error, "목록을 불러오지 못했습니다."),
        "danger"
      );
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

    loadList();
  });
})();
