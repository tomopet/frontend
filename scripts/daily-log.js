/* ============================================================
   TOMOPET | scripts/daily-log.js
   검색 키워드: 달력, 데일리로그, 통합 기록, 식단, 산책, 체중, 배변, 특이사항,
              비만도, 급여평균, 음식 검색, 체중 추이, 모달
   diet.html(식단분석) + health-record.html(건강기록) 통합 기록 페이지

   README 4번 REST API 표준 문법을 따릅니다.
     async 함수 + try / catch + console.error("...실패:", error)

   설계서: docs/DAILY-LOG-SPEC.md
   비만도/급여평균 계산은 scripts/breed-standards.js 를 그대로 사용합니다.
     (RER/MER 수의학 표준 공식 - 완성됨, 이 파일에서 다시 계산하지 않음)

   엔드포인트 (전부 [확인 필요] - 백엔드 미구현, 404 는 정상)
     GET   /api/users/me/pets                          아이 목록 (기존)
     GET   /api/pets/:petId/daily-log?date=             하루 기록 조회 (신규)
     POST  /api/pets/:petId/daily-log                   하루 기록 저장 (신규)
     GET   /api/pets/:petId/daily-log/summary?month=    달력 점 표시용 월 요약 (신규)
     GET   /api/pets/:petId/daily-log/calorie-stats?days= 최근 N일 평균 섭취열량 (신규)
     GET   /api/pets/:petId/weight?range=week|month|year 체중 추이 (신규)
     GET   /api/food-items?keyword=                      음식 검색 (기존, diet.js 에서 이식)

   백엔드가 아직 없으므로 위 엔드포인트는 전부 404 를 반환합니다.
   이 파일은 404/오류에도 화면이 깨지지 않고 로컬 입력만으로 동작하도록
   낙관적 업데이트(먼저 화면 갱신, 이어서 저장 시도)를 씁니다.
   ============================================================ */

(function () {
  "use strict";

  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var Auth = window.TomopetAuth;
  var Breed = window.TomopetBreedStandards;
  var $ = Ui.$;

  /* 검색 디바운스 - 타자마다 요청하면 서버가 과부하됨 */
  var SEARCH_DEBOUNCE_MS = 300;
  var MIN_KEYWORD_LENGTH = 2;
  var MAX_AMOUNT_G = 5000;
  var MAX_PHOTOS = 4;
  var CALORIE_AVG_DAYS = 7;

  var WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
  var POOP_ABNORMAL = { hard: true, soft: true, diarrhea: true };
  var CONDITION_LABEL = { under: "저체중", normal: "적정", over: "과체중" };
  var CALORIE_LABEL = { under: "부족", normal: "적정", over: "과다" };
  var CONDITION_CLASSES = [
    "metric-card__value--under",
    "metric-card__value--normal",
    "metric-card__value--over",
    "metric-card__value--unknown"
  ];


  var state = {
    pets: [],
    petId: null,
    petBreed: null,
    petWeightProfile: null,   /* 마이페이지 등록 체중 - 추이가 없을 때 폴백 */
    latestWeight: null,       /* 비만도/급여평균 계산에 쓰는 최신 체중 */

    viewYear: 0,
    viewMonth: 0,              /* 1-12 */
    selectedDate: null,
    monthSummary: {},          /* "YYYY-MM-DD" -> { diet, walk, poopAbnormal, note } */

    day: {
      weight: null,
      poop: null,
      poopMemo: "",
      note: "",
      meals: [],                /* [{ time, items:[...], photos:[{url}] }] */
      walks: []                 /* [{ time, memo }] */
    },

    searchTimer: null,
    mealPicked: null,
    mealDraft: { items: [], photos: [] },  /* 식사 모달 안에서 작성 중인 끼니 */

    weightChart: null,
    weightChartRange: "week"
  };


  /* ==========================================================
     날짜 유틸 - 로컬 기준

     toISOString() 은 UTC 로 바꿔버려 한국에서 오전 9시 이전이면
     하루 전 날짜가 나옴. 로컬 값을 직접 조립해야 함
     ========================================================== */

  function pad2(n) { return String(n).padStart(2, "0"); }

  function toDateString(y, m, d) {
    return y + "-" + pad2(m) + "-" + pad2(d);
  }

  function todayParts() {
    var d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }

  function todayString() {
    var t = todayParts();
    return toDateString(t.y, t.m, t.d);
  }

  function monthString(y, m) {
    return y + "-" + pad2(m);
  }

  function nowTimeString() {
    var d = new Date();
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function formatDayTitle(dateStr) {
    var parts = dateStr.split("-").map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    return parts[0] + "년 " + parts[1] + "월 " + parts[2] + "일 (" + WEEKDAY_LABELS[date.getDay()] + ")";
  }

  function sortByTime(list) {
    list.sort(function (a, b) { return (a.time || "").localeCompare(b.time || ""); });
  }


  /* ==========================================================
     달력
     ========================================================== */

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function firstWeekday(y, m) {
    return new Date(y, m - 1, 1).getDay();
  }

  function renderCalendar() {
    var y = state.viewYear;
    var m = state.viewMonth;
    $("calendar-month-label").textContent = y + "년 " + m + "월";

    var grid = $("calendar-grid");
    Ui.clearChildren(grid);

    var pad = firstWeekday(y, m);
    var total = daysInMonth(y, m);
    var today = todayString();
    var fragment = document.createDocumentFragment();

    for (var i = 0; i < pad; i++) {
      fragment.appendChild(Ui.createEl("div", "calendar-cell calendar-cell--pad"));
    }

    var _loop = function (day) {
      var dateStr = toDateString(y, m, day);
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "calendar-cell";
      cell.setAttribute("data-date", dateStr);
      cell.setAttribute("aria-label", m + "월 " + day + "일");

      if (dateStr === today) {
        cell.classList.add("calendar-cell--today");
        cell.setAttribute("aria-current", "date");
      }
      if (dateStr === state.selectedDate) {
        cell.classList.add("calendar-cell--selected");
        cell.setAttribute("aria-pressed", "true");
      } else {
        cell.setAttribute("aria-pressed", "false");
      }

      cell.appendChild(Ui.createEl("span", "calendar-cell__num", String(day)));

      var dots = Ui.createEl("span", "calendar-cell__dots");
      var summary = state.monthSummary[dateStr];
      if (summary) {
        if (summary.diet) dots.appendChild(Ui.createEl("span", "calendar-dot calendar-dot--diet"));
        if (summary.walk) dots.appendChild(Ui.createEl("span", "calendar-dot calendar-dot--walk"));
        if (summary.poopAbnormal) dots.appendChild(Ui.createEl("span", "calendar-dot calendar-dot--poop"));
        if (summary.note) dots.appendChild(Ui.createEl("span", "calendar-dot calendar-dot--note"));
      }
      cell.appendChild(dots);

      cell.addEventListener("click", function () {
        selectDate(cell.getAttribute("data-date"));
      });

      fragment.appendChild(cell);
    };

    for (var day = 1; day <= total; day++) _loop(day);

    var trailing = (7 - ((pad + total) % 7)) % 7;
    for (var j = 0; j < trailing; j++) {
      fragment.appendChild(Ui.createEl("div", "calendar-cell calendar-cell--pad"));
    }

    grid.appendChild(fragment);
  }

  function changeMonth(delta) {
    var m = state.viewMonth + delta;
    var y = state.viewYear;
    if (m < 1) { m = 12; y -= 1; }
    else if (m > 12) { m = 1; y += 1; }
    state.viewYear = y;
    state.viewMonth = m;
    loadMonthSummary();
  }

  function selectDate(dateStr) {
    if (!dateStr || dateStr === state.selectedDate) return;
    state.selectedDate = dateStr;
    renderCalendar();
    loadDayDetail(dateStr);
  }

  async function loadMonthSummary() {
    state.monthSummary = {};

    if (!state.petId) {
      renderCalendar();
      return;
    }

    try {
      var data = await Api.get(
        "/api/pets/" + encodeURIComponent(state.petId) +
        "/daily-log/summary?month=" + monthString(state.viewYear, state.viewMonth)
      );
      var list = Api.toList(data);
      list.forEach(function (row) {
        if (!row || !row.date) return;
        state.monthSummary[row.date] = {
          diet: Boolean(row.diet),
          walk: Boolean(row.walk),
          poopAbnormal: Boolean(row.poopAbnormal),
          note: Boolean(row.note)
        };
      });
    } catch (error) {
      /* 신규 엔드포인트 - 백엔드 연동 전에는 404 가 정상이므로 점 없이 표시만 함 */
      if (error.status !== 404) console.error("달력 요약 로딩 실패:", error);
    }

    renderCalendar();
  }


  /* ==========================================================
     하루 상세
     ========================================================== */

  function resetDayState() {
    state.day = { weight: null, poop: null, poopMemo: "", note: "", meals: [], walks: [] };
  }

  function setPoopActive(poop) {
    Ui.$$(".poop-btn", $("poop-buttons")).forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-poop") === poop);
    });
  }

  function applyDayToForm() {
    $("day-detail-title").textContent = formatDayTitle(state.selectedDate);
    $("day-weight").value =
      typeof state.day.weight === "number" ? state.day.weight : "";
    $("day-poop-memo").value = state.day.poopMemo || "";
    $("day-note").value = state.day.note || "";
    setPoopActive(state.day.poop);
    renderMealList();
    renderWalkList();
  }

  async function loadDayDetail(dateStr) {
    resetDayState();
    applyDayToForm();

    if (!state.petId) return;

    try {
      var data = await Api.get(
        "/api/pets/" + encodeURIComponent(state.petId) +
        "/daily-log?date=" + encodeURIComponent(dateStr)
      );
      /* 응답이 오는 사이 사용자가 다른 날짜를 눌렀으면 무시 */
      if (state.selectedDate !== dateStr) return;

      state.day.weight = typeof data.weight === "number" ? data.weight : null;
      state.day.poop = data.poop || null;
      state.day.poopMemo = data.poopMemo || "";
      state.day.note = data.note || "";
      state.day.meals = Api.toList(data.meals);
      state.day.walks = Api.toList(data.walks);
      applyDayToForm();
    } catch (error) {
      /* 404 는 그날 기록이 없다는 뜻이므로 오류가 아님 */
      if (error.status !== 404) {
        console.error("하루 기록 로딩 실패:", error);
        Ui.setFormMessage(
          $("page-message"),
          Api.toMessage(error, "기록을 불러오지 못했습니다."),
          "danger"
        );
      }
    }
  }

  async function saveDay() {
    if (!state.petId || !state.selectedDate) return;

    var weightVal = $("day-weight").value;
    state.day.weight = weightVal === "" ? null : Number(weightVal);
    state.day.poopMemo = $("day-poop-memo").value.trim();
    state.day.note = $("day-note").value.trim();

    var body = {
      petId: state.petId,
      date: state.selectedDate,
      weight: state.day.weight,
      poop: state.day.poop,
      poopMemo: state.day.poopMemo,
      note: state.day.note,
      meals: state.day.meals.map(function (meal) {
        return {
          time: meal.time,
          items: (meal.items || []).map(function (item) {
            return { foodItemId: item.foodItemId, amountG: item.amountG };
          })
        };
      }),
      walks: state.day.walks.map(function (walk) {
        return { time: walk.time, memo: walk.memo };
      })
    };

    /* 달력 점은 서버 응답을 기다리지 않고 로컬 상태로 즉시 갱신
       (재조회 없이도 화면이 곧바로 반영되어야 함) */
    state.monthSummary[state.selectedDate] = {
      diet: state.day.meals.length > 0,
      walk: state.day.walks.length > 0,
      poopAbnormal: Boolean(state.day.poop && POOP_ABNORMAL[state.day.poop]),
      note: Boolean(state.day.note)
    };
    renderCalendar();

    if (typeof state.day.weight === "number" && state.day.weight > 0) {
      state.latestWeight = state.day.weight;
      renderWeightCard();
      renderConditionCard();
    }

    try {
      await Api.post(
        "/api/pets/" + encodeURIComponent(state.petId) + "/daily-log",
        body
      );
      Ui.setFormMessage($("page-message"), "");
      Ui.toast("기록이 저장됐어요");
      loadCalorieAvg();
    } catch (error) {
      console.error("기록 저장 실패:", error);
      Ui.setFormMessage(
        $("page-message"),
        Api.toMessage(error, "저장하지 못했습니다."),
        "danger"
      );
    }
  }


  /* ==========================================================
     식사 목록 (하루 상세)
     ========================================================== */

  function createMealListItem(meal, index) {
    var li = Ui.createEl("li", "meal-list__item");

    var head = Ui.createEl("div", "meal-list__head");
    head.appendChild(Ui.createEl("span", "meal-list__time", meal.time || "-"));

    var names = (meal.items || []).map(function (item) { return item.name; }).join(", ");
    head.appendChild(Ui.createEl("span", "meal-list__foods", names || "-"));

    var total = (meal.items || []).reduce(function (sum, item) {
      return sum + (item.calories || 0);
    }, 0);
    head.appendChild(Ui.createEl("span", "meal-list__calories", Ui.formatNumber(total) + " kcal"));

    var remove = Ui.createEl("button", "meal-list__remove", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", (meal.time || "") + " 식사 삭제");
    remove.addEventListener("click", function () {
      state.day.meals.splice(index, 1);
      renderMealList();
      saveDay();
    });
    head.appendChild(remove);
    li.appendChild(head);

    if (meal.photos && meal.photos.length) {
      var photos = Ui.createEl("div", "meal-list__photos");
      meal.photos.forEach(function (photo) {
        var thumb = Ui.createEl("div", "meal-list__photo");
        var img = document.createElement("img");
        img.src = photo.url;
        img.alt = "";
        thumb.appendChild(img);
        photos.appendChild(thumb);
      });
      li.appendChild(photos);
    }

    return li;
  }

  function renderMealList() {
    Ui.renderList($("meal-list"), state.day.meals, createMealListItem, $("meal-list-empty"));
  }

  function createWalkListItem(walk, index) {
    var li = Ui.createEl("li", "walk-list__item");
    var head = Ui.createEl("div", "walk-list__head");
    head.appendChild(Ui.createEl("span", "walk-list__time", walk.time || "-"));
    head.appendChild(Ui.createEl("span", "walk-list__memo", walk.memo || "메모 없음"));

    var remove = Ui.createEl("button", "walk-list__remove", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", (walk.time || "") + " 산책 삭제");
    remove.addEventListener("click", function () {
      state.day.walks.splice(index, 1);
      renderWalkList();
      saveDay();
    });
    head.appendChild(remove);
    li.appendChild(head);
    return li;
  }

  function renderWalkList() {
    Ui.renderList($("walk-list"), state.day.walks, createWalkListItem, $("walk-list-empty"));
  }


  /* ==========================================================
     지표 3카드
     ========================================================== */

  function renderWeightCard() {
    $("weight-value").textContent =
      typeof state.latestWeight === "number" ? state.latestWeight + " kg" : "-";
  }

  function renderConditionCard() {
    var valueEl = $("condition-value");
    var hintEl = $("condition-hint");
    valueEl.classList.remove.apply(valueEl.classList, CONDITION_CLASSES);

    if (typeof state.latestWeight !== "number") {
      valueEl.textContent = "-";
      hintEl.textContent = "체중을 기록하면 표시돼요";
      return;
    }

    var result = Breed.assessBodyCondition(state.latestWeight, state.petBreed);

    if (result.status === "unknown") {
      valueEl.textContent = "표준 없음";
      valueEl.classList.add("metric-card__value--unknown");
      hintEl.textContent = "믹스견이거나 등록된 품종 표준이 없어요. 체중 추이만 참고해주세요";
      return;
    }

    valueEl.textContent = CONDITION_LABEL[result.status];
    valueEl.classList.add("metric-card__value--" + result.status);
    hintEl.textContent = "품종 표준체중 대비 " + Math.round(result.ratio * 100) + "%";
  }

  async function loadLatestWeight() {
    state.latestWeight = state.petWeightProfile;
    renderWeightCard();
    renderConditionCard();

    if (!state.petId) return;

    try {
      var data = await Api.get(
        "/api/pets/" + encodeURIComponent(state.petId) + "/weight?range=week"
      );
      var list = Api.toList(data);
      if (list.length && typeof list[list.length - 1].weight === "number") {
        state.latestWeight = list[list.length - 1].weight;
      }
    } catch (error) {
      if (error.status !== 404) console.error("체중 로딩 실패:", error);
    }

    renderWeightCard();
    renderConditionCard();
  }

  async function loadCalorieAvg() {
    var valueEl = $("calorie-avg-value");
    var hintEl = $("calorie-avg-hint");
    valueEl.classList.remove.apply(valueEl.classList, CONDITION_CLASSES);

    if (!state.petId) {
      valueEl.textContent = "-";
      return;
    }

    try {
      var data = await Api.get(
        "/api/pets/" + encodeURIComponent(state.petId) +
        "/daily-log/calorie-stats?days=" + CALORIE_AVG_DAYS
      );
      var avgKcal = data && typeof data.avgKcal === "number" ? data.avgKcal : null;

      if (!avgKcal || typeof state.latestWeight !== "number") {
        valueEl.textContent = "-";
        hintEl.textContent = "기록이 쌓이면 표시돼요";
        return;
      }

      var result = Breed.assessCalorieIntake(avgKcal, state.latestWeight);
      valueEl.textContent = Ui.formatNumber(Math.round(avgKcal)) + " kcal";
      valueEl.classList.add("metric-card__value--" + result.status);
      hintEl.textContent =
        "하루 필요 열량(" + Ui.formatNumber(result.mer) + " kcal) 대비 " +
        CALORIE_LABEL[result.status] + " · " + Math.round(result.ratio * 100) + "%";
    } catch (error) {
      /* 신규 엔드포인트 - 백엔드 연동 전에는 404 가 정상 */
      if (error.status !== 404) console.error("급여 평균 로딩 실패:", error);
      valueEl.textContent = "-";
      hintEl.textContent = "기록이 쌓이면 표시돼요";
    }
  }


  /* ==========================================================
     식사 추가 모달 - 음식 검색 (diet.js 에서 이식)
     ========================================================== */

  function createDraftFoodItem(item, index) {
    var li = Ui.createEl("li", "food-log__item" + (item.isToxic ? " food-log__item--toxic" : ""));

    var info = Ui.createEl("div", "food-log__info");
    info.appendChild(Ui.createEl("span", "food-log__name", item.name));
    info.appendChild(Ui.createEl("span", "food-log__meta", Ui.formatNumber(item.amountG) + "g"));
    li.appendChild(info);

    if (item.calories !== null && item.calories !== undefined) {
      li.appendChild(Ui.createEl("span", "food-log__calories", Ui.formatNumber(item.calories) + " kcal"));
    }

    var remove = Ui.createEl("button", "food-log__remove", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", item.name + " 빼기");
    remove.addEventListener("click", function () {
      state.mealDraft.items.splice(index, 1);
      renderMealDraftFoods();
    });
    li.appendChild(remove);

    return li;
  }

  function renderMealDraftFoods() {
    Ui.renderList($("meal-food-list"), state.mealDraft.items, createDraftFoodItem, $("meal-food-list-empty"));
    $("meal-save-btn").disabled = state.mealDraft.items.length === 0;
  }

  function createFoodResultItem(food) {
    var li = document.createElement("li");
    var btn = Ui.createEl("button", "food-result__button");
    btn.type = "button";
    btn.appendChild(Ui.createEl("span", "", food.name));

    if (food.isToxic) {
      btn.appendChild(Ui.createEl("span", "food-result__toxic", "위험"));
    }
    btn.appendChild(Ui.createEl("span", "food-result__meta",
      Ui.formatNumber(food.caloriesPer100g) + " kcal/100g"));

    btn.addEventListener("click", function () {
      Ui.$$(".food-result__button", $("meal-food-result")).forEach(function (el) {
        el.classList.remove("is-selected");
      });
      btn.classList.add("is-selected");
      pickMealFood(food);
    });

    li.appendChild(btn);
    return li;
  }

  function pickMealFood(food) {
    state.mealPicked = food;
    $("meal-picked-name").textContent = food.name;
    $("meal-picked-meta").textContent =
      Ui.formatNumber(food.caloriesPer100g) + " kcal/100g" + (food.isToxic ? " · 급여 금지" : "");
    $("meal-food-picked").hidden = false;
    $("meal-food-amount").value = "100";
    $("meal-food-amount").focus();
  }

  async function searchMealFood(keyword) {
    try {
      var data = await Api.get("/api/food-items?keyword=" + encodeURIComponent(keyword));
      var list = Api.toList(data);
      Ui.renderList($("meal-food-result"), list, createFoodResultItem, null);
      $("meal-food-result-empty").hidden = list.length > 0;
    } catch (error) {
      console.error("음식 검색 실패:", error);
      Ui.clearChildren($("meal-food-result"));
      $("meal-food-result-empty").hidden = false;
      Ui.setFormMessage(
        $("meal-form-message"),
        Api.toMessage(error, "검색하지 못했습니다."),
        "danger"
      );
    }
  }

  function renderMealPhotoPreview() {
    var wrap = $("meal-photo-preview");
    Ui.clearChildren(wrap);

    state.mealDraft.photos.forEach(function (photo, index) {
      var item = Ui.createEl("div", "meal-photo-preview__item");
      var img = document.createElement("img");
      img.src = photo.url;
      img.alt = "";
      item.appendChild(img);

      var remove = Ui.createEl("button", "meal-photo-preview__remove", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", (index + 1) + "번째 사진 삭제");
      remove.addEventListener("click", function () {
        URL.revokeObjectURL(photo.url);
        state.mealDraft.photos.splice(index, 1);
        renderMealPhotoPreview();
      });
      item.appendChild(remove);

      wrap.appendChild(item);
    });

    $("meal-photo-input").disabled = state.mealDraft.photos.length >= MAX_PHOTOS;
  }

  function openMealModal() {
    var form = $("meal-form");
    form.reset();

    Ui.setFormMessage($("meal-form-message"), "");
    Ui.setFieldError($("meal-food-amount"), $("meal-food-amount-error"), "");
    Ui.setFieldError($("meal-time"), $("meal-time-error"), "");

    Ui.clearChildren($("meal-food-result"));
    $("meal-food-result-empty").hidden = true;
    $("meal-food-picked").hidden = true;
    state.mealPicked = null;

    state.mealDraft = { items: [], photos: [] };
    renderMealDraftFoods();
    renderMealPhotoPreview();

    $("meal-time").value = nowTimeString();

    $("meal-modal").showModal();
    $("meal-food-search").focus();
  }

  function initMealModal() {
    var modal = $("meal-modal");
    var form = $("meal-form");
    var mealSubmitted = false;

    Ui.$$("[data-modal-close]", modal).forEach(function (btn) {
      btn.addEventListener("click", function () { modal.close(); });
    });

    /* 취소/ESC 로 닫힐 때는 아직 저장 전인 사진 objectURL 을 해제
       (제출로 닫힌 경우는 state.day.meals 가 계속 참조하므로 유지) */
    modal.addEventListener("close", function () {
      if (!mealSubmitted) {
        state.mealDraft.photos.forEach(function (photo) { URL.revokeObjectURL(photo.url); });
      }
      mealSubmitted = false;
    });

    $("add-meal-btn").addEventListener("click", openMealModal);

    /* 디바운스 - 타자마다 요청하지 않음 */
    $("meal-food-search").addEventListener("input", function () {
      var keyword = $("meal-food-search").value.trim();

      window.clearTimeout(state.searchTimer);
      if (keyword.length < MIN_KEYWORD_LENGTH) {
        Ui.clearChildren($("meal-food-result"));
        $("meal-food-result-empty").hidden = true;
        return;
      }

      state.searchTimer = window.setTimeout(function () {
        searchMealFood(keyword);
      }, SEARCH_DEBOUNCE_MS);
    });

    /* 검색창에서 Enter 로 폼이 제출되지 않게 함 */
    $("meal-food-search").addEventListener("keydown", function (event) {
      if (event.key === "Enter") event.preventDefault();
    });

    $("meal-food-add-btn").addEventListener("click", function () {
      if (!state.mealPicked) return;

      var amount = Number($("meal-food-amount").value);
      if (!amount || amount <= 0 || amount > MAX_AMOUNT_G) {
        Ui.setFieldError($("meal-food-amount"), $("meal-food-amount-error"),
          "1에서 " + Ui.formatNumber(MAX_AMOUNT_G) + " 사이로 입력해주세요.");
        $("meal-food-amount").focus();
        return;
      }
      Ui.setFieldError($("meal-food-amount"), $("meal-food-amount-error"), "");

      state.mealDraft.items.push({
        foodItemId: state.mealPicked.foodItemId,
        name: state.mealPicked.name,
        amountG: amount,
        /* 칼로리는 서버가 다시 계산해서 내려줌 - 여기선 임시 표시용 */
        calories: Math.round((state.mealPicked.caloriesPer100g || 0) * amount / 100),
        isToxic: Boolean(state.mealPicked.isToxic),
        toxicReason: state.mealPicked.toxicReason
      });

      state.mealPicked = null;
      $("meal-food-picked").hidden = true;
      $("meal-food-search").value = "";
      Ui.clearChildren($("meal-food-result"));
      $("meal-food-result-empty").hidden = true;

      renderMealDraftFoods();
    });

    /* 사진 - 최대 4장, 로컬 미리보기만 (업로드는 백엔드 연동 시) */
    $("meal-photo-input").addEventListener("change", function (event) {
      var files = Array.prototype.slice.call(event.target.files || []);
      var remaining = MAX_PHOTOS - state.mealDraft.photos.length;

      if (files.length > remaining) {
        Ui.setFormMessage(
          $("meal-form-message"),
          "사진은 최대 " + MAX_PHOTOS + "장까지 첨부할 수 있어요.",
          "warning"
        );
      }

      files.slice(0, remaining).forEach(function (file) {
        state.mealDraft.photos.push({ file: file, url: URL.createObjectURL(file) });
      });

      event.target.value = "";
      renderMealPhotoPreview();
    });

    form.addEventListener("submit", function (event) {
      /* 없으면 페이지가 새로고침되며 입력값이 사라짐 */
      event.preventDefault();

      var time = $("meal-time").value;
      if (!time) {
        Ui.setFieldError($("meal-time"), $("meal-time-error"), "시간을 입력해주세요.");
        $("meal-time").focus();
        return;
      }
      Ui.setFieldError($("meal-time"), $("meal-time-error"), "");

      if (!state.mealDraft.items.length) {
        Ui.setFormMessage($("meal-form-message"), "음식을 하나 이상 담아주세요.", "danger");
        return;
      }

      state.day.meals.push({
        time: time,
        items: state.mealDraft.items,
        photos: state.mealDraft.photos.map(function (photo) { return { url: photo.url }; })
      });
      sortByTime(state.day.meals);

      mealSubmitted = true;
      modal.close();
      renderMealList();
      saveDay();
    });
  }


  /* ==========================================================
     산책 추가 모달 - 수동 입력만 (삼성 헬스 등 연동 안 함)
     ========================================================== */

  function openWalkModal() {
    var form = $("walk-form");
    form.reset();
    Ui.setFormMessage($("walk-form-message"), "");
    Ui.setFieldError($("walk-time"), $("walk-time-error"), "");
    $("walk-time").value = nowTimeString();

    $("walk-modal").showModal();
    $("walk-time").focus();
  }

  function initWalkModal() {
    var modal = $("walk-modal");

    Ui.$$("[data-modal-close]", modal).forEach(function (btn) {
      btn.addEventListener("click", function () { modal.close(); });
    });

    $("add-walk-btn").addEventListener("click", openWalkModal);

    $("walk-form").addEventListener("submit", function (event) {
      event.preventDefault();

      var time = $("walk-time").value;
      if (!time) {
        Ui.setFieldError($("walk-time"), $("walk-time-error"), "시간을 입력해주세요.");
        $("walk-time").focus();
        return;
      }
      Ui.setFieldError($("walk-time"), $("walk-time-error"), "");

      state.day.walks.push({ time: time, memo: $("walk-memo").value.trim() });
      sortByTime(state.day.walks);

      modal.close();
      renderWalkList();
      saveDay();
    });
  }


  /* ==========================================================
     체중 추이 모달 (Chart.js)
     ========================================================== */

  function setWeightTabActive(range) {
    Ui.$$(".period-tab", $("weight-period-tabs")).forEach(function (tab) {
      tab.classList.toggle("is-active", tab.getAttribute("data-range") === range);
    });
  }

  function renderWeightChart(list) {
    var canvas = $("weight-trend-chart");
    if (!canvas || typeof Chart === "undefined") return;

    var labels = list.map(function (row) { return row.date || row.label || "-"; });
    var values = list.map(function (row) { return row.weight; });

    /* 다시 그릴 때는 반드시 파괴 후 생성 - 없으면 메모리 누수 + 툴팁 중복 */
    if (state.weightChart) state.weightChart.destroy();

    state.weightChart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "체중 (kg)",
          data: values,
          borderColor: "#F2701F",
          backgroundColor: "rgba(242, 112, 31, 0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#F2701F"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: false } }
      }
    });
  }

  async function loadWeightChart(range) {
    if (!state.petId) return;

    var empty = $("weight-trend-empty");
    var wrap = document.querySelector("#weight-modal .chart-wrap");

    try {
      var data = await Api.get(
        "/api/pets/" + encodeURIComponent(state.petId) + "/weight?range=" + encodeURIComponent(range)
      );
      var list = Api.toList(data);

      if (!list.length) {
        empty.hidden = false;
        wrap.hidden = true;
        return;
      }

      empty.hidden = true;
      wrap.hidden = false;
      renderWeightChart(list);
    } catch (error) {
      if (error.status !== 404) console.error("체중 추이 로딩 실패:", error);
      empty.hidden = false;
      wrap.hidden = true;
    }
  }

  function initWeightModal() {
    var modal = $("weight-modal");

    Ui.$$("[data-modal-close]", modal).forEach(function (btn) {
      btn.addEventListener("click", function () { modal.close(); });
    });

    $("weight-card").addEventListener("click", function () {
      state.weightChartRange = "week";
      setWeightTabActive("week");
      modal.showModal();
      loadWeightChart("week");
    });

    Ui.$$(".period-tab", $("weight-period-tabs")).forEach(function (tab) {
      tab.addEventListener("click", function () {
        var range = tab.getAttribute("data-range");
        state.weightChartRange = range;
        setWeightTabActive(range);
        loadWeightChart(range);
      });
    });
  }


  /* ==========================================================
     아이 목록 / 초기화
     ========================================================== */

  function applyPet(pet) {
    state.petId = pet ? pet.petId : null;
    state.petBreed = pet && pet.breed ? pet.breed : null;
    state.petWeightProfile = pet && typeof pet.weight === "number" ? pet.weight : null;
  }

  function loadAllForPet() {
    loadMonthSummary();
    loadDayDetail(state.selectedDate);
    loadLatestWeight();
    loadCalorieAvg();
  }

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

      /* 아이가 없으면 이 페이지가 성립하지 않음 - 체중/품종이 있어야 계산 가능 */
      var hasPet = state.pets.length > 0;
      $("daily-log-layout").hidden = !hasPet;
      Ui.toggleEmptyState($("no-pet-empty"), hasPet);

      if (hasPet) {
        applyPet(state.pets[0]);
        select.value = state.petId;
      }
      return hasPet;
    } catch (error) {
      console.error("아이 목록 로딩 실패:", error);
      $("daily-log-layout").hidden = true;
      Ui.setFormMessage(
        $("page-message"),
        Api.toMessage(error, "아이 목록을 불러오지 못했습니다."),
        "danger"
      );
      return false;
    }
  }

  document.addEventListener("DOMContentLoaded", async function () {
    /* 로그인 필수 페이지 - 비로그인이면 로그인 화면으로 이동 */
    if (!Auth.requireAuth()) return;

    var today = todayParts();
    state.viewYear = today.y;
    state.viewMonth = today.m;
    state.selectedDate = todayString();
    applyDayToForm();

    initMealModal();
    initWalkModal();
    initWeightModal();

    Ui.$$(".poop-btn", $("poop-buttons")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var value = btn.getAttribute("data-poop");
        state.day.poop = state.day.poop === value ? null : value;
        setPoopActive(state.day.poop);
      });
    });

    $("save-day-btn").addEventListener("click", saveDay);

    $("prev-month-btn").addEventListener("click", function () { changeMonth(-1); });
    $("next-month-btn").addEventListener("click", function () { changeMonth(1); });

    $("pet-select").addEventListener("change", function () {
      var petId = $("pet-select").value;
      var pet = state.pets.filter(function (p) { return String(p.petId) === petId; })[0];
      applyPet(pet || { petId: petId });
      loadAllForPet();
    });

    var hasPet = await loadPets();
    if (hasPet) loadAllForPet();
  });
})();
