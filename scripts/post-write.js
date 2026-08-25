/* ============================================================
   TOMOPET | scripts/post-write.js
   검색 키워드: 글쓰기, 게시글 작성, 수정, 이미지 업로드, 미리보기, 태그, 임시저장, 이탈 경고
   커뮤니티 게시글 작성 / 수정

   의존
     layout.js  window.TomopetAuth
     api.js     window.TomopetApi
     ui.js      window.TomopetUi

   연동 엔드포인트
     GET  /api/posts/:postId    수정 모드에서 기존 값을 채울 때
     POST /api/posts            새 글 (FormData)
     PUT  /api/posts/:postId    수정  (FormData)

   ?postId= 가 있으면 수정 모드로 동작함
   홈과 목록이 쓰는 이름과 같아야 상세의 "수정하기" 링크가 이어짐

   이미지는 FormData 로 보냄
   Content-Type 을 직접 넣으면 boundary 가 빠져 서버가 파싱하지 못하므로
   api.js 의 Api.upload 가 헤더를 자동으로 생략함

   임시저장은 새 글 모드에서만 동작함
   수정 모드에서도 저장하면 원본과 초안이 뒤섞여 어느 쪽이 최신인지 알 수 없음
   File 객체는 직렬화되지 않으므로 이미지는 저장되지 않음
   ============================================================ */

(function () {
  "use strict";

  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var Auth = window.TomopetAuth;
  var $ = Ui.$;

  /* 마크업의 안내 문구(post-write.html #post-image-limit)와 반드시 같아야 함
     둘이 어긋나면 "5MB 까지" 라고 써놓고 거부하는 화면이 됨 */
  var MAX_IMAGE_COUNT = 3;
  var MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  var ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

  var MAX_TAG_COUNT = 5;
  var MAX_TITLE_LENGTH = 100;
  var MAX_CONTENT_LENGTH = 5000;

  var DRAFT_KEY = "tomopet_post_draft";

  var state = {
    postId: null,        /* null 이면 새 글, 값이 있으면 수정 */
    images: [],          /* [{ file, url }] - url 은 미리보기용 objectURL */
    tags: [],
    submitting: false,
    dirty: false         /* 저장하지 않은 변경이 있는지 */
  };


  /* ==========================================================
     글자 수 카운터

     maxlength 가 입력을 막아주지만 남은 글자를 보여주지 않으면
     사용자는 왜 더 안 써지는지 알 수 없음
     ========================================================== */

  function updateCounter(inputId, counterId, max) {
    var value = $(inputId).value;
    $(counterId).textContent = value.length + " / " + max;
  }

  function initCounters() {
    var title = $("post-title-input");
    var content = $("post-content-input");

    title.addEventListener("input", function () {
      updateCounter("post-title-input", "post-title-counter", MAX_TITLE_LENGTH);
      Ui.setFieldError(title, $("post-title-error"), "");
      state.dirty = true;
    });

    content.addEventListener("input", function () {
      updateCounter("post-content-input", "post-content-counter", MAX_CONTENT_LENGTH);
      Ui.setFieldError(content, $("post-content-error"), "");
      state.dirty = true;
    });
  }


  /* ==========================================================
     이미지

     미리보기는 objectURL 로 만들고 목록에서 빼면 즉시 해제함
     해제하지 않으면 이미지를 바꿀 때마다 메모리가 누적됨
     ========================================================== */

  function renderImageName() {
    var name = $("post-image-name");

    if (!state.images.length) {
      name.textContent = "선택된 이미지 없음";
      return;
    }

    name.textContent = state.images.length + "장 선택됨 (최대 " + MAX_IMAGE_COUNT + "장)";
  }

  function createPreviewItem(image, index) {
    var li = Ui.createEl("li", "post-write__preview-item");

    var img = document.createElement("img");
    img.className = "post-write__preview-image";
    img.src = image.url;
    img.alt = (index + 1) + "번째 선택한 이미지";
    li.appendChild(img);

    var remove = Ui.createEl("button", "btn btn--danger btn--sm post-write__preview-remove", "빼기");
    remove.type = "button";
    remove.setAttribute("aria-label", (index + 1) + "번째 이미지 빼기");
    remove.addEventListener("click", function () {
      /* 미리보기에서 빠지는 순간 해제해야 누수가 없음 */
      URL.revokeObjectURL(image.url);
      state.images.splice(index, 1);
      state.dirty = true;
      renderImages();
    });
    li.appendChild(remove);

    return li;
  }

  function renderImages() {
    var wrap = $("post-image-preview-wrap");

    Ui.renderList($("post-image-preview-list"), state.images, createPreviewItem, null);
    wrap.hidden = state.images.length === 0;

    renderImageName();
  }

  /* 형식과 용량을 확인함
     서버도 반드시 검증해야 함 - 클라이언트 검증은 우회됨 */
  function validateImage(file) {
    if (ALLOWED_IMAGE_TYPES.indexOf(file.type) === -1) {
      return "JPG, PNG, WEBP 형식만 올릴 수 있습니다.";
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return "이미지 한 장은 5MB 를 넘을 수 없습니다.";
    }

    return "";
  }

  function initImages() {
    var input = $("post-image-input");
    var errorEl = $("post-image-error");

    input.addEventListener("change", function (event) {
      var files = Array.prototype.slice.call(event.target.files || []);
      var messages = [];

      files.forEach(function (file) {
        if (state.images.length >= MAX_IMAGE_COUNT) {
          messages.push("이미지는 최대 " + MAX_IMAGE_COUNT + "장까지 올릴 수 있습니다.");
          return;
        }

        var invalid = validateImage(file);
        if (invalid) {
          messages.push(file.name + ": " + invalid);
          return;
        }

        state.images.push({ file: file, url: URL.createObjectURL(file) });
        state.dirty = true;
      });

      /* 같은 파일을 다시 고를 수 있도록 비움
         비우지 않으면 change 가 발생하지 않아 두 번째 선택이 무시됨 */
      event.target.value = "";

      /* 중복 문구는 한 번만 보여줌 */
      var unique = messages.filter(function (msg, i) {
        return messages.indexOf(msg) === i;
      });

      errorEl.textContent = unique.join(" ");
      errorEl.hidden = unique.length === 0;

      renderImages();
    });
  }


  /* ==========================================================
     태그

     Enter 로 추가하고, 입력란이 비어 있을 때 Backspace 로 마지막 태그를 지움
     ========================================================== */

  function createTagItem(tag, index) {
    var li = Ui.createEl("li", "post-write__tag");
    li.appendChild(Ui.createEl("span", null, "#" + tag));

    var remove = Ui.createEl("button", "post-write__tag-remove", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", tag + " 태그 삭제");
    remove.addEventListener("click", function () {
      state.tags.splice(index, 1);
      state.dirty = true;
      renderTags();
    });
    li.appendChild(remove);

    return li;
  }

  function renderTags() {
    Ui.renderList($("post-tag-list"), state.tags, createTagItem, null);
  }

  function addTag(raw) {
    var errorEl = $("post-tag-error");
    /* 사용자가 # 을 붙여 입력해도 받아들이되 저장은 순수 태그명으로 통일함 */
    var tag = raw.trim().replace(/^#+/, "").trim();

    if (!tag) return false;

    if (state.tags.length >= MAX_TAG_COUNT) {
      errorEl.textContent = "태그는 최대 " + MAX_TAG_COUNT + "개까지 추가할 수 있습니다.";
      errorEl.hidden = false;
      return false;
    }

    if (state.tags.indexOf(tag) !== -1) {
      errorEl.textContent = "이미 추가한 태그입니다.";
      errorEl.hidden = false;
      return false;
    }

    if (/\s/.test(tag)) {
      errorEl.textContent = "태그에는 띄어쓰기를 넣을 수 없습니다.";
      errorEl.hidden = false;
      return false;
    }

    errorEl.textContent = "";
    errorEl.hidden = true;

    state.tags.push(tag);
    state.dirty = true;
    renderTags();
    return true;
  }

  function initTags() {
    var input = $("post-tag-input");

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        /* 태그 하나 넣으려다 글이 통째로 등록되는 것을 막음 */
        event.preventDefault();
        if (addTag(input.value)) input.value = "";
        return;
      }

      /* 입력란이 비어 있을 때만 마지막 태그를 지움
           글자를 지우려던 Backspace 가 태그를 삭제하면 안 됨 */
      if (event.key === "Backspace" && input.value === "" && state.tags.length) {
        state.tags.pop();
        state.dirty = true;
        renderTags();
      }
    });

    /* 태그를 입력하다 그냥 나가는 경우가 많아 포커스가 빠질 때도 확정함 */
    input.addEventListener("blur", function () {
      if (addTag(input.value)) input.value = "";
    });
  }


  /* ==========================================================
     임시저장

     새 글 모드에서만 동작함
     이미지는 File 객체라 직렬화되지 않으므로 저장 대상에서 제외함
     localStorage 는 사파리 프라이빗 모드 등에서 예외를 던지므로
     모든 접근을 try / catch 로 감쌈
     ========================================================== */

  function isDraftEnabled() {
    return !state.postId;
  }

  function readDraft() {
    try {
      var raw = window.localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error("임시저장 읽기 실패:", error);
      return null;
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.error("임시저장 제거 실패:", error);
    }
  }

  function getSelectedCategory() {
    var checked = document.querySelector("input[name='category']:checked");
    return checked ? checked.value : "free";
  }

  function saveDraft() {
    if (!isDraftEnabled()) return;

    var draft = {
      category: getSelectedCategory(),
      title: $("post-title-input").value,
      content: $("post-content-input").value,
      tags: state.tags.slice(),
      savedAt: new Date().toISOString()
    };

    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      $("post-draft-status").textContent = "임시저장됨";
      Ui.toast("임시저장했어요");
      /* 저장했으므로 이탈 경고를 띄울 이유가 없음 */
      state.dirty = false;
    } catch (error) {
      console.error("임시저장 실패:", error);
      Ui.toast("임시저장하지 못했습니다.", "danger");
    }
  }

  function applyDraft(draft) {
    var radio = document.querySelector(
      "input[name='category'][value='" + draft.category + "']"
    );
    if (radio) radio.checked = true;

    $("post-title-input").value = draft.title || "";
    $("post-content-input").value = draft.content || "";
    state.tags = Array.isArray(draft.tags) ? draft.tags.slice() : [];

    renderTags();
    updateCounter("post-title-input", "post-title-counter", MAX_TITLE_LENGTH);
    updateCounter("post-content-input", "post-content-counter", MAX_CONTENT_LENGTH);

    $("post-draft-restore").hidden = true;
    $("post-draft-status").textContent = "임시저장을 불러왔습니다";
    state.dirty = false;
  }

  function initDraft() {
    /* 수정 모드에서는 임시저장을 쓰지 않으므로 버튼 자체를 감춤
       눌러도 아무 일이 없는 버튼은 고장으로 인식됨 */
    if (!isDraftEnabled()) {
      $("post-draft-save").hidden = true;
      $("post-draft-restore").hidden = true;
      return;
    }

    $("post-draft-save").addEventListener("click", saveDraft);

    $("post-draft-discard").addEventListener("click", function () {
      clearDraft();
      $("post-draft-restore").hidden = true;
      $("post-draft-status").textContent = "";
    });

    var draft = readDraft();
    if (!draft) return;

    $("post-draft-load").addEventListener("click", function () {
      applyDraft(draft);
    });

    /* 언제 저장한 글인지 알아야 불러올지 판단할 수 있음 */
    $("post-draft-text").textContent =
      Ui.formatRelativeTime(draft.savedAt) + "에 임시저장한 글이 있습니다. (이미지는 저장되지 않습니다)";
    $("post-draft-restore").hidden = false;
  }


  /* ==========================================================
     수정 모드

     기존 이미지는 서버에 있는 URL 이라 File 객체로 만들 수 없음
     새로 고르지 않으면 그대로 두라는 뜻으로 서버에 알림
     ========================================================== */

  function applyEditMode(post) {
    $("post-write-title").textContent = "글 수정";
    $("post-write-description").textContent = "내용을 다듬어 다시 올려보세요.";
    $("post-submit-button").textContent = "수정하기";
    document.title = "게시글 수정 | TOMOPET";

    var radio = document.querySelector(
      "input[name='category'][value='" + post.category + "']"
    );
    if (radio) radio.checked = true;

    $("post-title-input").value = post.title || "";
    $("post-content-input").value = post.content || "";

    state.tags = Array.isArray(post.tags) ? post.tags.slice() : [];
    renderTags();

    updateCounter("post-title-input", "post-title-counter", MAX_TITLE_LENGTH);
    updateCounter("post-content-input", "post-content-counter", MAX_CONTENT_LENGTH);

    var existing = Array.isArray(post.imageUrls)
      ? post.imageUrls.length
      : (post.imageUrl ? 1 : 0);

    if (existing) {
      $("post-image-name").textContent =
        "기존 이미지 " + existing + "장 (새로 고르면 교체됩니다)";
    }

    /* 불러온 값은 사용자가 고친 것이 아니므로 이탈 경고 대상이 아님 */
    state.dirty = false;
  }

  async function loadPostForEdit() {
    try {
      var post = await Api.get("/api/posts/" + encodeURIComponent(state.postId));
      applyEditMode(post);
    } catch (error) {
      console.error("게시글 로딩 실패:", error);
      Ui.setFormMessage(
        $("post-write-message"),
        Api.toMessage(error, "수정할 게시글을 불러오지 못했습니다."),
        "danger"
      );
    }
  }


  /* ==========================================================
     검증 및 제출
     ========================================================== */

  function validateForm() {
    var title = $("post-title-input");
    var content = $("post-content-input");
    var valid = true;

    if (!title.value.trim()) {
      Ui.setFieldError(title, $("post-title-error"), "제목을 입력해주세요.");
      valid = false;
    } else {
      Ui.setFieldError(title, $("post-title-error"), "");
    }

    if (!content.value.trim()) {
      Ui.setFieldError(content, $("post-content-error"), "내용을 입력해주세요.");
      valid = false;
    } else {
      Ui.setFieldError(content, $("post-content-error"), "");
    }

    return valid;
  }

  function buildFormData() {
    var formData = new FormData();

    formData.append("category", getSelectedCategory());
    formData.append("title", $("post-title-input").value.trim());
    formData.append("content", $("post-content-input").value.trim());

    /* 태그는 같은 이름으로 여러 번 붙임
       서버는 이것을 배열로 받음 */
    state.tags.forEach(function (tag) {
      formData.append("tags", tag);
    });

    state.images.forEach(function (image) {
      formData.append("images", image.file);
    });

    return formData;
  }

  function initSubmit() {
    var form = $("post-form");
    var submitBtn = $("post-submit-button");

    form.addEventListener("submit", async function (event) {
      /* 없으면 페이지가 새로고침되며 작성한 내용이 사라짐 */
      event.preventDefault();

      if (state.submitting) return;
      if (!validateForm()) {
        Ui.focusFirstError(form);
        return;
      }

      state.submitting = true;
      /* 없으면 연타로 같은 글이 여러 번 등록됨 */
      Ui.setLoading(submitBtn, true, state.postId ? "수정 중..." : "등록 중...");

      try {
        var formData = buildFormData();
        var data;

        if (state.postId) {
          data = await Api.upload(
            "/api/posts/" + encodeURIComponent(state.postId),
            formData,
            { method: "PUT" }
          );
        } else {
          data = await Api.upload("/api/posts", formData);
        }

        /* 등록에 성공했으면 초안을 남겨둘 이유가 없음 */
        if (isDraftEnabled()) clearDraft();

        /* 저장이 끝났으므로 이탈 경고를 끄고 이동함 */
        state.dirty = false;

        var newId = state.postId || (data && data.postId);
        window.location.replace(
          newId
            ? "./post-detail.html?postId=" + encodeURIComponent(newId)
            : "./community.html"
        );
      } catch (error) {
        console.error(state.postId ? "게시글 수정 실패:" : "게시글 등록 실패:", error);
        Ui.setFormMessage(
          $("post-write-message"),
          Api.toMessage(error, "저장하지 못했습니다."),
          "danger"
        );
      } finally {
        state.submitting = false;
        Ui.setLoading(submitBtn, false);
      }
    });
  }


  /* ==========================================================
     이탈 경고

     브라우저가 문구를 직접 정하므로 내용은 지정할 수 없고
     returnValue 를 채우는 것만으로 기본 경고창이 뜸
     ========================================================== */

  function initLeaveWarning() {
    window.addEventListener("beforeunload", function (event) {
      if (!state.dirty || state.submitting) return;

      event.preventDefault();
      /* 일부 브라우저는 returnValue 가 채워져야 경고를 띄움 */
      event.returnValue = "";
    });
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    /* 로그인 필수 페이지 - 비로그인이면 로그인 화면으로 이동 */
    if (!Auth.requireAuth()) return;

    var params = new URLSearchParams(window.location.search);
    /* "id" 가 아니라 "postId" - 상세의 "수정하기" 링크가 이 이름을 씀 */
    state.postId = params.get("postId");

    /* 카테고리를 바꾼 것도 저장하지 않은 변경임 */
    Ui.$$("input[name='category']").forEach(function (radio) {
      radio.addEventListener("change", function () {
        state.dirty = true;
      });
    });

    initCounters();
    initImages();
    initTags();
    initSubmit();
    initLeaveWarning();

    updateCounter("post-title-input", "post-title-counter", MAX_TITLE_LENGTH);
    updateCounter("post-content-input", "post-content-counter", MAX_CONTENT_LENGTH);
    renderImages();
    renderTags();

    if (state.postId) {
      loadPostForEdit();
    }

    /* 수정 모드 여부를 확인한 뒤에 초안 UI 를 결정함 */
    initDraft();
  });
})();
