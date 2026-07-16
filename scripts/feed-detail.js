/* ============================================================
   TOMOPET | scripts/feed-detail.js
   협업자용 견본 스크립트 (복사해서 쓰세요)

   이 파일은 새 페이지를 만들 때 복사용 뼈대입니다.
   "feed-detail" 를 본인 담당 이름으로 전부 바꾸고,
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
     상세 데이터 가져오기 및 렌더링 함수 (상세 페이지 특성 반영)
     ========================================================== */
  function getFeedIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get("feedId");
  }


  /* ==========================================================
     목록 불러오기 - 표준 문법 (async + try/catch)
     ========================================================== */
  async function loadDetail() {
    var feedId = getFeedIdFromUrl();
    if (!feedId) {
      alert("올바르지 않은 접근입니다. 사료 ID가 없습니다.");
      window.location.href = "./feed-recommend.html";
      return;
    }

    try {
      /* fetch 를 직접 쓰지 않고 Api.get 을 사용
         토큰 첨부, 타임아웃, 401 처리가 자동으로 됨 */
      var item = await Api.get("/api/feeds/" + feedId);

      /* 상세 정보 DOM 노출 예제 (보내주신 HTML 맞춤 매핑) */
      
      // 1. 대표 이미지 바인딩
      if ($("feed-detail-img")) {
        $("feed-detail-img").src = item.imageUrl || "https://images.unsplash.com/photo-1589722244358-9dec9158a278?auto=format&fit=crop&q=80&w=400";
        $("feed-detail-img").alt = item.name || item.title || "사료 이미지";
      }

      // 2. 기본 정보 바인딩 (브랜드, 상품명, 가격)
      if ($("feed-detail-brand")) $("feed-detail-brand").textContent = item.brand || "브랜드 정보 없음";
      if ($("feed-detail-name")) $("feed-detail-name").textContent = item.name || item.title || "상품명 없음";
      if ($("feed-detail-price")) {
        var priceVal = item.price ? (typeof item.price === "number" ? item.price.toLocaleString() : item.price) + "원" : "가격 미정";
        $("feed-detail-price").textContent = priceVal;
      }

      // 3. 메타 스펙 정보 바인딩
      if ($("feed-detail-target")) $("feed-detail-target").textContent = item.targetAge || item.targetDescription || "전연령견";
      if ($("feed-detail-brand-name")) $("feed-detail-brand-name").textContent = item.manufacturer || item.brand || "토모푸드 코리아";

      // 4. 하단 테이블 영양 성분 매핑 (객체 내부에 분석 정보가 있을 경우 매핑하며, 없을 시 기본값 유지)
      if (item.nutrients) {
        if ($("nutr-crude-protein")) $("nutr-crude-protein").textContent = item.nutrients.crudeProtein || "26.0% 이상";
        if ($("nutr-crude-fat")) $("nutr-crude-fat").textContent = item.nutrients.crudeFat || "12.0% 이상";
        if ($("nutr-crude-fiber")) $("nutr-crude-fiber").textContent = item.nutrients.crudeFiber || "4.0% 이하";
        if ($("nutr-crude-ash")) $("nutr-crude-ash").textContent = item.nutrients.crudeAsh || "8.0% 이하";
        if ($("nutr-calcium")) $("nutr-calcium").textContent = item.nutrients.calcium || "1.1% 이상";
        if ($("nutr-phosphorus")) $("nutr-phosphorus").textContent = item.nutrients.phosphorus || "0.9% 이상";
      } else {
        // 단일 레벨 속성으로 성분이 들어오는 경우 처리 지원
        if (item.crudeProtein && $("nutr-crude-protein")) $("nutr-crude-protein").textContent = item.crudeProtein;
        if (item.crudeFat && $("nutr-crude-fat")) $("nutr-crude-fat").textContent = item.crudeFat;
        if (item.crudeFiber && $("nutr-crude-fiber")) $("nutr-crude-fiber").textContent = item.crudeFiber;
        if (item.crudeAsh && $("nutr-crude-ash")) $("nutr-crude-ash").textContent = item.crudeAsh;
        if (item.calcium && $("nutr-calcium")) $("nutr-calcium").textContent = item.calcium;
        if (item.phosphorus && $("nutr-phosphorus")) $("nutr-phosphorus").textContent = item.phosphorus;
      }

    } catch (error) {
      console.error("상세 로딩 실패:", error);

      var errorMsgArea = $("feed-detail-message") || $("feed-detail-brand") || document.body;
      Ui.setFormMessage(
        errorMsgArea,
        Api.toMessage(error, "상세 정보를 불러오지 못했습니다."),
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

    loadDetail();
  });
})();