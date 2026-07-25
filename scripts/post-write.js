(function () {
  "use strict";

  // [공통] 페이지 전용 코드는 공용 API/UI/인증 모듈의 공개 메서드만 사용한다.
  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var Auth = window.TomopetAuth;
  var $ = Ui.$;

  // 이미지·태그 제한과 새 글 임시 저장 키를 한곳에서 관리한다.
  var MAX_IMAGES = 3;
  var MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  var ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
  var MAX_TAGS = 5;
  var DRAFT_KEY = "tomopet_post_draft";

  // 작성/수정 모드와 사용자가 편집 중인 태그·이미지·제출 상태를 보관한다.
  var postId = null;
  var isEditMode = false;
  var tags = [];
  var selectedFiles = [];
  var existingImageUrls = [];
  var previewUrls = [];
  var isDirty = false;
  var isSubmitting = false;
  var editAvailable = true;

  // 반복 조회하지 않도록 폼에서 사용하는 DOM 요소를 초기화 시점에 참조한다.
  var form = $("post-form");
  var messageEl = $("post-write-message");
  var titleInput = $("post-title-input");
  var titleCounter = $("post-title-counter");
  var titleError = $("post-title-error");
  var contentInput = $("post-content-input");
  var contentCounter = $("post-content-counter");
  var contentError = $("post-content-error");
  var categoryInputs = document.querySelectorAll('input[name="category"]');
  var imageInput = $("post-image-input");
  var imageNameEl = $("post-image-name");
  var imageError = $("post-image-error");
  var imagePreviewWrap = $("post-image-preview-wrap");
  var imagePreviewList = $("post-image-preview-list");
  var tagInput = $("post-tag-input");
  var tagError = $("post-tag-error");
  var tagList = $("post-tag-list");
  var submitButton = $("post-submit-button");

  // 글 작성·수정은 로그인 필수이므로 페이지 초기화 전에 인증 상태를 확인한다.
  function requirePageAuth() {
    if (!Auth.requireAuth()) return false;
    if (Auth.isLoggedIn()) return true;

    window.location.replace(Auth.loginUrl ? Auth.loginUrl() : "./login.html");
    return false;
  }

  // ?postId=가 있으면 수정 모드, 없으면 새 글 작성 모드로 분기하기 위한 값을 읽는다.
  function getPostId() {
    var params = new URLSearchParams(window.location.search);
    return (params.get("postId") || "").trim() || null;
  }

  // 입력값 길이와 HTML maxlength를 함께 표시해 남은 작성 범위를 예측할 수 있게 한다.
  function updateCounter(input, counter) {
    counter.textContent = input.value.length + " / " + input.maxLength;
  }

  // 제목과 본문 카운터를 초기 로드·초안 복원 뒤 한 번에 동기화한다.
  function updateAllCounters() {
    updateCounter(titleInput, titleCounter);
    updateCounter(contentInput, contentCounter);
  }

  // 저장되지 않은 변경이 있음을 기록해 페이지 이탈 경고의 기준으로 사용한다.
  function markDirty() {
    isDirty = true;
  }

  // 배열 또는 JSON/쉼표 문자열 태그를 중복 없는 최대 5개의 내부 배열로 정규화한다.
  function normalizeTags(value) {
    if (!value) return [];

    var rawTags = [];
    if (Array.isArray(value)) {
      rawTags = value;
    } else {
      try {
        var parsed = JSON.parse(value);
        rawTags = Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        rawTags = String(value).split(",");
      }
    }

    var normalized = [];
    rawTags.forEach(function (rawTag) {
      var tag = String(rawTag || "").trim().replace(/^#/, "");
      if (
        tag &&
        tag.length <= 20 &&
        normalized.indexOf(tag) === -1
      ) {
        normalized.push(tag);
      }
    });

    return normalized.slice(0, MAX_TAGS);
  }

  // 수정 API가 반환할 수 있는 여러 이미지 필드 형태를 기존 이미지 URL 배열로 통합한다.
  function normalizeImageUrls(post) {
    var rawImages = [];

    if (post && Array.isArray(post.images)) {
      rawImages = post.images;
    } else if (post && Array.isArray(post.imageUrls)) {
      rawImages = post.imageUrls;
    } else if (post && post.imageUrl) {
      rawImages = [post.imageUrl];
    }

    return rawImages.map(function (image) {
      if (typeof image === "string") return image;
      return image && (image.imageUrl || image.url);
    }).filter(function (url) {
      return typeof url === "string" && url.length > 0;
    }).slice(0, MAX_IMAGES);
  }

  // 현재 태그 배열을 안전한 DOM 노드로 다시 그리고 각 태그의 제거 동작을 연결한다.
  function renderTags() {
    Ui.clearChildren(tagList);

    tags.forEach(function (tag, index) {
      var item = Ui.createEl("li", "post-write__tag", "#" + tag);
      var removeButton = Ui.createEl("button", "post-write__tag-remove", "×");
      removeButton.type = "button";
      removeButton.setAttribute("aria-label", "#" + tag + " 태그 삭제");
      removeButton.addEventListener("click", function () {
        // 삭제 후 즉시 화면과 새 글 임시 저장 내용을 같은 상태로 맞춘다.
        tags.splice(index, 1);
        renderTags();
        markDirty();
        saveDraft();
      });
      item.appendChild(removeButton);
      tagList.appendChild(item);
    });
  }

  // 입력 태그의 공백·#을 정리하고 길이, 중복, 최대 개수를 검증한 뒤 목록에 추가한다.
  function addTag(rawValue) {
    var tag = rawValue.trim().replace(/^#/, "");

    if (!tag) {
      Ui.setFieldError(tagInput, tagError, "태그를 입력해주세요.");
      return false;
    }
    if (tag.length > 20) {
      Ui.setFieldError(tagInput, tagError, "태그는 20자 이내로 입력해주세요.");
      return false;
    }
    if (tags.indexOf(tag) !== -1) {
      Ui.setFieldError(tagInput, tagError, "이미 추가된 태그입니다.");
      return false;
    }
    if (tags.length >= MAX_TAGS) {
      Ui.setFieldError(
        tagInput,
        tagError,
        "태그는 최대 " + MAX_TAGS + "개까지 추가할 수 있습니다."
      );
      return false;
    }

    tags.push(tag);
    Ui.setFieldError(tagInput, tagError, "");
    renderTags();
    markDirty();
    saveDraft();
    return true;
  }

  // 사용이 끝난 단일 미리보기 object URL을 해제하고 추적 배열에서도 제거한다.
  function releasePreviewUrl(url) {
    URL.revokeObjectURL(url);
    previewUrls = previewUrls.filter(function (item) {
      return item !== url;
    });
  }

  // 페이지 이동이나 미리보기 재렌더링 전에 남은 모든 object URL을 해제해 메모리 누수를 막는다.
  function revokePreviewUrls() {
    previewUrls.forEach(function (url) {
      URL.revokeObjectURL(url);
    });
    previewUrls = [];
  }

  // 유지할 기존 이미지 수와 새로 선택한 파일명을 한 줄의 접근 가능한 상태 텍스트로 표시한다.
  function updateImageName() {
    if (selectedFiles.length === 0 && existingImageUrls.length === 0) {
      imageNameEl.textContent = "선택된 이미지 없음";
      return;
    }

    var parts = [];
    if (existingImageUrls.length > 0) {
      parts.push("기존 이미지 " + existingImageUrls.length + "장 유지");
    }
    if (selectedFiles.length > 0) {
      parts.push(selectedFiles.map(function (file) {
        return file.name;
      }).join(", "));
    }
    imageNameEl.textContent = parts.join(" · ");
  }

  // 기존 URL 이미지와 새 파일 미리보기를 같은 목록에 렌더링하고 각각의 삭제 동작을 연결한다.
  function renderImagePreviews() {
    revokePreviewUrls();
    Ui.clearChildren(imagePreviewList);

    existingImageUrls.forEach(function (url, index) {
      var item = Ui.createEl("li", "post-write__preview-item");
      var image = Ui.createEl("img", "post-write__preview-image");
      image.src = url;
      image.alt = "기존 게시글 이미지 " + (index + 1);

      var removeButton = Ui.createEl("button", "post-write__preview-remove", "삭제");
      removeButton.type = "button";
      removeButton.setAttribute("aria-label", "기존 이미지 " + (index + 1) + " 삭제");
      removeButton.addEventListener("click", function () {
        existingImageUrls.splice(index, 1);
        renderImagePreviews();
        markDirty();
      });

      item.appendChild(image);
      item.appendChild(removeButton);
      imagePreviewList.appendChild(item);
    });

    selectedFiles.forEach(function (file, index) {
      // 로컬 File 객체는 브라우저가 읽을 수 있는 임시 object URL로 변환한다.
      var url = URL.createObjectURL(file);
      previewUrls.push(url);

      var item = Ui.createEl("li", "post-write__preview-item");
      var image = Ui.createEl("img", "post-write__preview-image");
      image.src = url;
      image.alt = file.name + " 미리보기";
      // 로드 성공/실패 어느 경우에도 임시 URL을 한 번만 해제한다.
      image.addEventListener("load", function () {
        releasePreviewUrl(url);
      }, { once: true });
      image.addEventListener("error", function () {
        releasePreviewUrl(url);
      }, { once: true });

      var removeButton = Ui.createEl("button", "post-write__preview-remove", "삭제");
      removeButton.type = "button";
      removeButton.setAttribute("aria-label", file.name + " 이미지 삭제");
      removeButton.addEventListener("click", function () {
        selectedFiles.splice(index, 1);
        imageInput.value = "";
        renderImagePreviews();
        markDirty();
      });

      item.appendChild(image);
      item.appendChild(removeButton);
      imagePreviewList.appendChild(item);
    });

    imagePreviewWrap.hidden =
      existingImageUrls.length === 0 && selectedFiles.length === 0;
    updateImageName();
  }

  // 새로 선택한 파일을 기존/선택 이미지와 합산해 개수, 용량, MIME 형식을 순서대로 검사한다.
  function validateImageFiles(files) {
    if (files.length === 0) return true;

    if (
      existingImageUrls.length +
      selectedFiles.length +
      files.length > MAX_IMAGES
    ) {
      Ui.setFieldError(
        imageInput,
        imageError,
        "이미지는 최대 " + MAX_IMAGES + "장까지 첨부할 수 있습니다."
      );
      return false;
    }

    for (var index = 0; index < files.length; index += 1) {
      var file = files[index];

      if (file.size > MAX_IMAGE_SIZE) {
        Ui.setFieldError(
          imageInput,
          imageError,
          file.name + " 파일 크기는 5MB 이하로 제한됩니다."
        );
        return false;
      }
      if (ALLOWED_MIME_TYPES.indexOf(file.type) === -1) {
        Ui.setFieldError(
          imageInput,
          imageError,
          file.name + "은(는) JPG, PNG, WEBP 이미지만 선택할 수 있습니다."
        );
        return false;
      }
    }

    Ui.setFieldError(imageInput, imageError, "");
    return true;
  }

  // file input 변경 시 FileList를 배열로 바꾸고 검증된 파일만 현재 선택 목록에 누적한다.
  function handleImageChange(event) {
    var files = Array.prototype.slice.call(event.target.files || []);

    if (!validateImageFiles(files)) {
      event.target.value = "";
      return;
    }

    selectedFiles = selectedFiles.concat(files);
    event.target.value = "";
    renderImagePreviews();
    markDirty();
  }

  // 제목·본문·카테고리의 필수값과 최대 길이를 검사하고 첫 오류 필드로 포커스를 이동한다.
  function validateForm() {
    var title = titleInput.value.trim();
    var content = contentInput.value.trim();
    var category = document.querySelector('input[name="category"]:checked');
    var valid = true;

    if (!title) {
      Ui.setFieldError(titleInput, titleError, "제목을 입력해주세요.");
      valid = false;
    } else if (title.length > 100) {
      Ui.setFieldError(titleInput, titleError, "제목은 100자 이내로 입력해주세요.");
      valid = false;
    } else {
      Ui.setFieldError(titleInput, titleError, "");
    }

    if (!content) {
      Ui.setFieldError(contentInput, contentError, "내용을 입력해주세요.");
      valid = false;
    } else if (content.length > 5000) {
      Ui.setFieldError(contentInput, contentError, "내용은 5000자 이내로 입력해주세요.");
      valid = false;
    } else {
      Ui.setFieldError(contentInput, contentError, "");
    }

    if (!category) {
      Ui.setFormMessage(messageEl, "카테고리를 선택해주세요.", "danger");
      valid = false;
    } else {
      Ui.setFormMessage(messageEl, "");
    }

    if (!valid) Ui.focusFirstError(form);
    return valid;
  }

  // [API 연동] 텍스트, 태그, 유지할 기존 이미지 URL, 새 파일을 multipart FormData로 묶는다.
  function buildFormData() {
    var data = new FormData();
    var category = document.querySelector('input[name="category"]:checked');

    data.append("category", category.value);
    data.append("title", titleInput.value.trim());
    data.append("content", contentInput.value.trim());
    data.append("tags", JSON.stringify(tags));
    data.append("existingImageUrls", JSON.stringify(existingImageUrls));
    selectedFiles.forEach(function (file) {
      data.append("images", file);
    });

    return data;
  }

  // 새 글 작성 중인 텍스트 정보만 localStorage에 임시 저장하며 File 객체는 저장하지 않는다.
  function saveDraft() {
    if (isEditMode) return;

    try {
      var category = document.querySelector('input[name="category"]:checked');
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        category: category ? category.value : "",
        title: titleInput.value,
        content: contentInput.value,
        tags: tags
      }));
    } catch (error) {
      console.warn("임시 저장 실패:", error);
    }
  }

  // 새 글 모드에서만 임시 저장 값을 복원하고 카운터·태그 UI를 내부 상태와 동기화한다.
  function restoreDraft() {
    if (isEditMode) return;

    try {
      var raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;

      var draft = JSON.parse(raw);
      if (draft.category) {
        Array.prototype.forEach.call(categoryInputs, function (input) {
          input.checked = input.value === draft.category;
        });
      }
      titleInput.value = draft.title || "";
      contentInput.value = draft.content || "";
      tags = normalizeTags(draft.tags);
      renderTags();
      updateAllCounters();
      isDirty = false;
    } catch (error) {
      console.warn("임시 저장 복원 실패:", error);
    }
  }

  // 게시 완료 후 남은 초안이 다시 나타나지 않도록 저장 키를 제거한다.
  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.warn("임시 저장 삭제 실패:", error);
    }
  }

  // 수정 대상 작성자와 현재 사용자를 비교하되 authorId가 없는 구형 응답은 기존 동작을 유지한다.
  function isCurrentUserOwner(post) {
    var user = Auth.getUser();
    if (!post || post.authorId === undefined || post.authorId === null) return true;
    return Boolean(
      user &&
      user.userId !== undefined &&
      String(user.userId) === String(post.authorId)
    );
  }

  // [API 연동] 수정 모드에서 기존 게시글을 불러와 폼을 채우고 본인 글이 아니면 폼을 차단한다.
  async function loadPostForEdit() {
    if (!isEditMode) return;

    editAvailable = true;
    Ui.setLoading(submitButton, true, "불러오는 중...");
    Ui.setFormMessage(messageEl, "");

    try {
      var response = await Api.get("/api/posts/" + encodeURIComponent(postId));
      var post = response && response.post ? response.post : response;

      if (!post || typeof post !== "object") {
        throw new Error("게시글 응답 형식이 올바르지 않습니다.");
      }
      if (!isCurrentUserOwner(post)) {
        // 권한 없는 사용자가 URL을 직접 입력해 들어온 경우 편집 폼 자체를 숨긴다.
        editAvailable = false;
        form.hidden = true;
        Ui.setFormMessage(messageEl, "본인이 작성한 게시글만 수정할 수 있습니다.", "danger");
        return;
      }

      if (post.category) {
        Array.prototype.forEach.call(categoryInputs, function (input) {
          input.checked = input.value === post.category;
        });
      }
      titleInput.value = post.title || "";
      contentInput.value = post.content || "";
      tags = normalizeTags(post.tags);
      existingImageUrls = normalizeImageUrls(post);
      selectedFiles = [];
      renderTags();
      renderImagePreviews();
      updateAllCounters();
      isDirty = false;
    } catch (error) {
      editAvailable = false;
      form.hidden = true;
      console.error("게시글 불러오기 실패:", error);
      Ui.setFormMessage(
        messageEl,
        Api.toMessage(error, "게시글을 불러오지 못했습니다."),
        "danger"
      );
    } finally {
      if (editAvailable) Ui.setLoading(submitButton, false);
    }
  }

  // 작성/수정에 따라 POST 또는 PUT 업로드를 실행하고 성공한 게시글 상세 화면으로 이동한다.
  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || !editAvailable || !validateForm()) return;

    isSubmitting = true;
    Ui.setLoading(submitButton, true, isEditMode ? "수정 중..." : "게시 중...");

    try {
      var data = buildFormData();
      var response;

      if (isEditMode) {
        // 공용 upload가 FormData의 multipart boundary를 브라우저에 맡기도록 Content-Type을 직접 지정하지 않는다.
        response = await Api.upload(
          "/api/posts/" + encodeURIComponent(postId),
          data,
          { method: "PUT" }
        );
      } else {
        response = await Api.upload("/api/posts", data);
      }

      clearDraft();
      isDirty = false;
      revokePreviewUrls();

      var savedPostId = response && response.postId ? response.postId : postId;
      window.location.href = savedPostId
        ? "./post-detail.html?postId=" + encodeURIComponent(savedPostId)
        : "./community.html";
    } catch (error) {
      console.error("게시글 저장 실패:", error);
      Ui.setFormMessage(
        messageEl,
        Api.toMessage(error, "게시글을 저장하지 못했습니다."),
        "danger"
      );
    } finally {
      isSubmitting = false;
      Ui.setLoading(submitButton, false);
    }
  }

  // 저장되지 않은 변경이 있을 때만 브라우저 기본 이탈 확인 창을 활성화한다.
  function handleBeforeUnload(event) {
    if (!isDirty || isSubmitting) return undefined;

    event.preventDefault();
    event.returnValue = "";
    return "";
  }

  // 폼 입력, 카테고리, 이미지, 태그 키보드 조작과 페이지 수명주기 이벤트를 연결한다.
  function bindEvents() {
    form.addEventListener("submit", handleSubmit);

    titleInput.addEventListener("input", function () {
      updateCounter(titleInput, titleCounter);
      Ui.setFieldError(titleInput, titleError, "");
      markDirty();
      saveDraft();
    });

    contentInput.addEventListener("input", function () {
      updateCounter(contentInput, contentCounter);
      Ui.setFieldError(contentInput, contentError, "");
      markDirty();
      saveDraft();
    });

    Array.prototype.forEach.call(categoryInputs, function (input) {
      input.addEventListener("change", function () {
        markDirty();
        saveDraft();
      });
    });

    imageInput.addEventListener("change", handleImageChange);

    tagInput.addEventListener("keydown", function (event) {
      // Enter는 태그 추가에 사용하므로 폼 전체 제출을 막는다.
      if (event.key === "Enter") {
        event.preventDefault();
        if (addTag(tagInput.value)) tagInput.value = "";
        return;
      }

      if (
        event.key === "Backspace" &&
        tagInput.value === "" &&
        tags.length > 0
      ) {
        // 빈 입력에서 Backspace를 누르면 가장 마지막 태그를 빠르게 제거한다.
        tags.pop();
        renderTags();
        markDirty();
        saveDraft();
      }
    });

    tagInput.addEventListener("input", function () {
      Ui.setFieldError(tagInput, tagError, "");
    });

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", revokePreviewUrls);
  }

  // 인증 확인 후 URL에 따라 작성/수정 화면 문구와 데이터를 초기화한다.
  function init() {
    if (!requirePageAuth()) return;

    postId = getPostId();
    isEditMode = Boolean(postId);

    $("post-image-limit").textContent =
      "JPG, PNG, WEBP · 최대 3장 · 장당 5MB";

    if (isEditMode) {
      $("post-write-title").textContent = "게시글 수정";
      $("post-write-description").textContent = "작성한 이야기를 수정할 수 있어요.";
      submitButton.textContent = "수정하기";
    } else {
      restoreDraft();
    }

    bindEvents();
    updateAllCounters();
    updateImageName();
    loadPostForEdit();
  }

  // defer로 로드된 페이지 스크립트는 DOM 준비 완료 시점에 한 번만 초기화한다.
  document.addEventListener("DOMContentLoaded", init);
})();
