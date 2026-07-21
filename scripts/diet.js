/* ============================================================
   TOMOPET | scripts/diet.js
   검색 키워드: 식단, 음식 검색, 급여, 칼로리, 기록 저장, 분석, 모달
   식단 균형 분석

   README 4번 REST API 표준 문법을 따릅니다.
     async 함수 + try / catch + console.error("...실패:", error)

   계산은 전부 백엔드가 합니다.
     DER(하루 권장 칼로리), AAFCO 영양소 목표치, 금지 식품 판정 모두
     서버가 계산해서 내려주고 이 파일은 표시만 합니다.

     이유
       1. 기준이 바뀌면 배포 없이 고칠 수 있어야 함
       2. 아이 건강과 직결되므로 클라이언트 조작 위험을 막아야 함

   엔드포인트
     GET   /api/users/me/pets                      아이 목록
     GET   /api/pets/:petId/diet/target            DER + 영양소 목표치
     GET   /api/diet/log?petId=&date=             하루 기록 조회
     POST  /api/diet/log                          하루 기록 저장 + 분석
     GET   /api/food-items?keyword=                음식 검색 (사료+간식+사람음식)
   ============================================================ */

(function () {
  "use strict";

  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var Auth = window.TomopetAuth;
  var $ = Ui.$;

  /* 검색 디바운스 - 타자마다 요청하면 서버가 과부하됨 */
  var SEARCH_DEBOUNCE_MS = 300;
  var MIN_KEYWORD_LENGTH = 2;

  var MAX_AMOUNT_G = 5000;

  var state = {
    pets: [],
    petId: null,
    date: null,
    items: [],          /* [{ foodItemId, name, amountG, calories, isToxic, toxicReason }] */
    searchTimer: null,
    picked: null        /* 모달에서 고른 음식 */
  };


  /* ==========================================================
     날짜 - 로컬 기준 YYYY-MM-DD

     toISOString() 은 UTC 로 바꿔버려 한국에서 오전 9시 이전이면
     하루 전 날짜가 나옴. 로컬 값을 직접 조립해야 함
     ========================================================== */

  function todayString() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }


  /* ==========================================================
     급여 기록 목록
     ========================================================== */

  function createLogItem(item, index) {
    var li = Ui.createEl("li", "food-log__item" + (item.isToxic ? " food-log__item--toxic" : ""));

    var info = Ui.createEl("div", "food-log__info");
    info.appendChild(Ui.createEl("span", "food-log__name", item.name));
    info.appendChild(Ui.createEl("span", "food-log__meta", Ui.formatNumber(item.amountG) + "g"));
    li.appendChild(info);

    /* 칼로리는 서버가 계산해서 내려준 값 */
    if (item.calories !== null && item.calories !== undefined) {
      li.appendChild(Ui.createEl("span", "food-log__calories", Ui.formatNumber(item.calories) + " kcal"));
    }

    var remove = Ui.createEl("button", "food-log__remove", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", item.name + " 삭제");
    remove.addEventListener("click", function () {
      state.items.splice(index, 1);
      renderLog();
      saveAndAnalyze();
    });
    li.appendChild(remove);

    return li;
  }

  function renderLog() {
    var list = $("food-log");
    var empty = $("food-log-empty");
    var foot = $("log-foot");

    Ui.clearChildren(list);

    if (!state.items.length) {
      Ui.toggleEmptyState(empty, false);
      list.hidden = true;
      foot.hidden = true;
      return;
    }

    list.hidden = false;
    Ui.toggleEmptyState(empty, true);

    var fragment = document.createDocumentFragment();
    state.items.forEach(function (item, index) {
      fragment.appendChild(createLogItem(item, index));
    });
    list.appendChild(fragment);

    var total = state.items.reduce(function (sum, item) {
      return sum + (item.calories || 0);
    }, 0);
    $("total-calories").textContent = Ui.formatNumber(total) + " kcal";
    foot.hidden = false;
  }


  /* ==========================================================
     분석 결과 렌더링

     서버가 준 숫자를 그대로 표시만 함
     ========================================================== */

  function renderToxic(warnings) {
    var box = $("toxic-warning");
    var list = $("toxic-warning-list");

    if (!warnings || !warnings.length) {
      box.hidden = true;
      return;
    }

    Ui.clearChildren(list);
    warnings.forEach(function (w) {
      var li = Ui.createEl("li", "toxic-warning__item");
      li.appendChild(Ui.createEl("strong", "toxic-warning__name", w.name));
      /* 사유도 서버가 준 문자열이므로 textContent 로 */
      li.appendChild(document.createTextNode(" — " + (w.reason || "급여하면 안 되는 음식이에요")));
      list.appendChild(li);
    });

    /* 양과 무관하게 위험하므로 균형 점수보다 먼저 보이게 함 */
    box.hidden = false;
  }

  /* 게이지 채우기 - 부족/적정/과다를 색 + 텍스트 2중으로 표시 */
  function fillGauge(fillEl, gaugeEl, ratio) {
    var percent = Math.min(Math.round(ratio * 100), 100);

    fillEl.style.width = percent + "%";
    fillEl.classList.remove("gauge__fill--low", "gauge__fill--over");

    if (ratio < 0.9) fillEl.classList.add("gauge__fill--low");
    else if (ratio > 1.1) fillEl.classList.add("gauge__fill--over");

    if (gaugeEl) gaugeEl.setAttribute("aria-valuenow", String(percent));
  }

  function toneText(ratio) {
    if (ratio < 0.9) return "부족해요";
    if (ratio > 1.1) return "많아요";
    return "적정해요";
  }

  function renderCalories(calories) {
    var box = $("calorie-metric");
    if (!calories) {
      box.hidden = true;
      return;
    }

    $("calorie-value").textContent =
      Ui.formatNumber(calories.actual) + " / " + Ui.formatNumber(calories.target) + " kcal";

    var ratio = calories.target ? calories.actual / calories.target : 0;
    fillGauge($("calorie-fill"), $("calorie-gauge"), ratio);

    $("calorie-hint").textContent =
      Math.round(ratio * 100) + "% · " + toneText(ratio);
    box.hidden = false;
  }

  function createNutrientItem(n) {
    var li = Ui.createEl("li", "nutrient-item");

    var head = Ui.createEl("div", "nutrient-item__head");
    head.appendChild(Ui.createEl("span", "nutrient-item__label", n.label || n.name));
    head.appendChild(Ui.createEl("span", "nutrient-item__value",
      Math.round((n.ratio || 0) * 100) + "% · " + toneText(n.ratio || 0)));
    li.appendChild(head);

    var gauge = Ui.createEl("div", "gauge");
    gauge.setAttribute("role", "progressbar");
    gauge.setAttribute("aria-label", (n.label || n.name) + " 충족률");
    gauge.setAttribute("aria-valuemin", "0");
    gauge.setAttribute("aria-valuemax", "100");

    var fill = Ui.createEl("span", "gauge__fill");
    gauge.appendChild(fill);
    li.appendChild(gauge);

    fillGauge(fill, gauge, n.ratio || 0);
    return li;
  }

  function renderScore(score) {
    var box = $("score-box");
    if (score === null || score === undefined) {
      box.hidden = true;
      return;
    }

    $("score-value").textContent = score + "점";

    /* 건강 화면이므로 친근한 어투 대신 담백하게 */
    var hint = "영양 균형이 좋아요";
    if (score < 60) hint = "영양소 몇 가지가 부족해요";
    else if (score < 80) hint = "조금 더 채우면 좋겠어요";
    $("score-hint").textContent = hint;

    box.hidden = false;
  }

  function renderAnalysis(analysis) {
    var empty = $("analysis-empty");

    if (!analysis) {
      empty.hidden = false;
      $("toxic-warning").hidden = true;
      $("calorie-metric").hidden = true;
      $("score-box").hidden = true;
      Ui.clearChildren($("nutrient-list"));
      return;
    }

    empty.hidden = true;
    renderToxic(analysis.toxicWarnings);
    renderCalories(analysis.calories);
    Ui.renderList($("nutrient-list"), analysis.nutrients || [], createNutrientItem, null);
    renderScore(analysis.score);
  }


  /* ==========================================================
     데이터 로드
     ========================================================== */

  async function loadPets() {
    try {
      var data = await Api.get("/api/users/me/pets");
      state.pets = Api.toList(data);

      var select = $("pet-select");
      Ui.clearChildren(select);

      state.pets.forEach(function (pet) {
        var option = document.createElement("option");
        option.value = pet.petId;
        /* 이름은 사용자 입력이므로 textContent 로 */
        option.textContent = pet.name;
        select.appendChild(option);
      });

      /* 아이가 없으면 이 페이지가 성립하지 않음 - 체중/나이가 있어야 DER 계산 가능 */
      var hasPet = state.pets.length > 0;
      $("diet-layout").hidden = !hasPet;
      Ui.toggleEmptyState($("no-pet-empty"), hasPet);

      if (hasPet) {
        state.petId = state.pets[0].petId;
        select.value = state.petId;
      }
      return hasPet;
    } catch (error) {
      console.error("아이 목록 로딩 실패:", error);
      $("diet-layout").hidden = true;
      Ui.setFormMessage(
        $("page-message"),
        Api.toMessage(error, "아이 목록을 불러오지 못했습니다."),
        "danger"
      );
      return false;
    }
  }

  async function loadLog() {
    if (!state.petId || !state.date) return;

    try {
      var data = await Api.get(
        "/api/diet/log?petId=" + encodeURIComponent(state.petId) +
        "&date=" + encodeURIComponent(state.date)
      );

      state.items = Api.toList(data.items);
      renderLog();
      renderAnalysis(data.analysis);
    } catch (error) {
      /* 404 는 그날 기록이 없다는 뜻이므로 오류가 아님 */
      if (error.status === 404) {
        state.items = [];
        renderLog();
        renderAnalysis(null);
        return;
      }

      console.error("식단 기록 로딩 실패:", error);
      state.items = [];
      renderLog();
      renderAnalysis(null);
      Ui.setFormMessage(
        $("page-message"),
        Api.toMessage(error, "기록을 불러오지 못했습니다."),
        "danger"
      );
    }
  }

  /* 저장과 분석을 한 번에 - 서버가 저장 후 분석 결과를 돌려줌 */
  async function saveAndAnalyze() {
    if (!state.petId || !state.date) return;

    try {
      var data = await Api.post("/api/diet/log", {
        petId: state.petId,
        date: state.date,
        items: state.items.map(function (item) {
          return { foodItemId: item.foodItemId, amountG: item.amountG };
        })
      });

      /* 서버가 계산한 칼로리를 반영 */
      if (data.items) {
        state.items = Api.toList(data.items);
        renderLog();
      }
      renderAnalysis(data.analysis);
      Ui.setFormMessage($("page-message"), "");
      /* 저장이 조용히 끝나면 사용자가 성공 여부를 알 수 없음 */
      Ui.toast("식단이 기록됐어요");
    } catch (error) {
      console.error("식단 분석 실패:", error);
      Ui.setFormMessage(
        $("page-message"),
        Api.toMessage(error, "분석하지 못했습니다."),
        "danger"
      );
    }
  }


  /* ==========================================================
     음식 검색 모달
     ========================================================== */

  function createResultItem(food) {
    var li = document.createElement("li");

    var btn = Ui.createEl("button", "food-result__button");
    btn.type = "button";
    btn.appendChild(Ui.createEl("span", "", food.name));

    /* 금지 식품은 검색 단계에서 미리 알림 - 색 + 텍스트 2중 */
    if (food.isToxic) {
      btn.appendChild(Ui.createEl("span", "food-result__toxic", "위험"));
    }
    btn.appendChild(Ui.createEl("span", "food-result__meta",
      Ui.formatNumber(food.caloriesPer100g) + " kcal/100g"));

    btn.addEventListener("click", function () {
      Ui.$$(".food-result__button", $("food-result")).forEach(function (el) {
        el.classList.remove("is-selected");
      });
      btn.classList.add("is-selected");
      pickFood(food);
    });

    li.appendChild(btn);
    return li;
  }

  function pickFood(food) {
    state.picked = food;

    $("picked-name").textContent = food.name;
    $("picked-meta").textContent =
      Ui.formatNumber(food.caloriesPer100g) + " kcal/100g" +
      (food.isToxic ? " · 급여 금지" : "");

    $("food-picked").hidden = false;
    $("food-add-btn").disabled = false;
    $("food-amount").focus();
  }

  async function searchFood(keyword) {
    try {
      var data = await Api.get("/api/food-items?keyword=" + encodeURIComponent(keyword));
      var list = Api.toList(data);

      Ui.renderList($("food-result"), list, createResultItem, null);
      $("food-result-empty").hidden = list.length > 0;
    } catch (error) {
      console.error("음식 검색 실패:", error);
      Ui.clearChildren($("food-result"));
      $("food-result-empty").hidden = false;
      Ui.setFormMessage(
        $("food-form-message"),
        Api.toMessage(error, "검색하지 못했습니다."),
        "danger"
      );
    }
  }

  function openFoodModal() {
    var modal = $("food-modal");
    var form = $("food-form");

    form.reset();
    Ui.setFormMessage($("food-form-message"), "");
    Ui.setFieldError($("food-amount"), $("food-amount-error"), "");
    Ui.clearChildren($("food-result"));

    $("food-result-empty").hidden = true;
    $("food-picked").hidden = true;
    $("food-add-btn").disabled = true;
    $("food-amount").value = "100";
    state.picked = null;

    modal.showModal();
    $("food-search").focus();
  }

  function initFoodModal() {
    var modal = $("food-modal");
    var form = $("food-form");

    Ui.$$("[data-modal-close]", modal).forEach(function (btn) {
      btn.addEventListener("click", function () { modal.close(); });
    });

    $("add-food-btn").addEventListener("click", openFoodModal);
    $("empty-add-food-btn").addEventListener("click", openFoodModal);

    /* 디바운스 - 타자마다 요청하지 않음 */
    $("food-search").addEventListener("input", function () {
      var keyword = $("food-search").value.trim();

      window.clearTimeout(state.searchTimer);
      if (keyword.length < MIN_KEYWORD_LENGTH) {
        Ui.clearChildren($("food-result"));
        $("food-result-empty").hidden = true;
        return;
      }

      state.searchTimer = window.setTimeout(function () {
        searchFood(keyword);
      }, SEARCH_DEBOUNCE_MS);
    });

    /* 검색창에서 Enter 로 폼이 제출되지 않게 함 */
    $("food-search").addEventListener("keydown", function (event) {
      if (event.key === "Enter") event.preventDefault();
    });

    form.addEventListener("submit", function (event) {
      /* 없으면 페이지가 새로고침되며 입력값이 사라짐 */
      event.preventDefault();

      if (!state.picked) return;

      var amount = Number($("food-amount").value);
      if (!amount || amount <= 0 || amount > MAX_AMOUNT_G) {
        Ui.setFieldError($("food-amount"), $("food-amount-error"),
          "1에서 " + Ui.formatNumber(MAX_AMOUNT_G) + " 사이로 입력해주세요.");
        $("food-amount").focus();
        return;
      }
      Ui.setFieldError($("food-amount"), $("food-amount-error"), "");

      state.items.push({
        foodItemId: state.picked.foodItemId,
        name: state.picked.name,
        amountG: amount,
        /* 칼로리는 서버가 다시 계산해서 내려줌 - 여기선 임시 표시용 */
        calories: Math.round((state.picked.caloriesPer100g || 0) * amount / 100),
        isToxic: Boolean(state.picked.isToxic),
        toxicReason: state.picked.toxicReason
      });

      modal.close();
      renderLog();
      saveAndAnalyze();
    });
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", async function () {
    /* 로그인 필수 페이지 - 비로그인이면 로그인 화면으로 이동 */
    if (!Auth.requireAuth()) return;

    state.date = todayString();
    $("date-select").value = state.date;
    /* 미래 날짜는 기록할 수 없음 */
    $("date-select").max = state.date;

    initFoodModal();

    $("pet-select").addEventListener("change", function () {
      state.petId = $("pet-select").value;
      loadLog();
    });

    $("date-select").addEventListener("change", function () {
      state.date = $("date-select").value;
      loadLog();
    });

    var hasPet = await loadPets();
    if (hasPet) loadLog();
  });
})();
