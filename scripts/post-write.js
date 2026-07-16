(function() {
  "use strict";

  // API 및 UI 유틸리티 별칭
  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var $ = Ui.$;

  // 상수 정의
  var MAX_IMAGES = 3;
  var MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  var ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
  var MAX_TAGS = 5;
  var DRAFT_KEY = "tomopet_post_draft";

  // 상태 변수
  var postId = null;
  var isEditMode = false;
  var tags = [];
  var selectedFiles = [];
  var existingImageUrls = [];
  var previewUrls = [];
  var isDirty = false;
  var isSubmitting = false;

  // DOM 요소
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

  // postId 가져오기
  function getPostId() {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("postId");
  }

  // 카운터 업데이트
  function updateCounter(input, counter) {
    var length = input.value.length;
    counter.textContent = length + " / " + input.maxLength;
  }

  // 모든 카운터 업데이트
  function updateAllCounters() {
    updateCounter(titleInput, titleCounter);
    updateCounter(contentInput, contentCounter);
  }

  // 태그 정규화
  function normalizeTags(value) {
    if (!value) return [];
    var rawTags = [];
    if (Array.isArray(value)) {
      rawTags = value;
    } else {
      try {
        var parsed = JSON.parse(value);
        rawTags = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        rawTags = value.split(",");
      }
    }

    var normalized = [];
    rawTags.forEach(function (tag) {
      var cleanTag = String(tag || "").trim().replace(/^#/, "");
      if (cleanTag && cleanTag.length <= 20 && normalized.indexOf(cleanTag) === -1) {
        normalized.push(cleanTag);
      }
    });
    return normalized.slice(0, MAX_TAGS);
  }

  // 서버 응답의 기존 이미지 URL 정규화
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

  // 태그 추가
  function addTag(rawValue) {
    var tag = rawValue.trim().replace(/^#/, "");
    if (!tag) {
      Ui.setFieldError(tagInput, tagError, "태그를 입력해주세요.");
      return;
    }
    if (tag.length > 20) {
      Ui.setFieldError(tagInput, tagError, "태그는 20자 이내로 입력해주세요.");
      return;
    }
    if (tags.includes(tag)) {
      Ui.setFieldError(tagInput, tagError, "이미 추가된 태그입니다.");
      return;
    }
    if (tags.length >= MAX_TAGS) {
      Ui.setFieldError(tagInput, tagError, "태그는 최대 " + MAX_TAGS + "개까지 추가할 수 있습니다.");
      return;
    }
    tags.push(tag);
    Ui.setFieldError(tagInput, tagError, "");
    renderTags();
    markDirty();
    saveDraft();
  }

  // 태그 제거
  function removeTag(index) {
    tags.splice(index, 1);
    renderTags();
    markDirty();
    saveDraft();
  }

  // 태그 렌더링
  function renderTags() {
    Ui.clearChildren(tagList);
    tags.forEach(function(tag, index) {
      var li = Ui.createEl("li", "post-write__tag");
      li.textContent = "#" + tag;
      var removeBtn = Ui.createEl("button", "post-write__tag-remove", "");
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", "#" + tag + " 태그 삭제");
      removeBtn.textContent = "×";
      removeBtn.onclick = function() {
        removeTag(index);
      };
      li.appendChild(removeBtn);
      tagList.appendChild(li);
    });
  }

  // 이미지 파일 유효성 검사
  function validateImageFiles(files) {
    if (files.length === 0) return true;
    if (existingImageUrls.length + selectedFiles.length + files.length > MAX_IMAGES) {
      Ui.setFieldError(imageInput, imageError, "이미지는 최대 " + MAX_IMAGES + "개까지 첨부할 수 있습니다.");
      return false;
    }
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (file.size > MAX_IMAGE_SIZE) {
        Ui.setFieldError(imageInput, imageError, file.name + " 파일 크기는 5MB 이하로 제한됩니다.");
        return false;
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        Ui.setFieldError(imageInput, imageError, file.name + "은(는) 허용되지 않는 이미지 형식입니다.");
        return false;
      }
    }
    Ui.setFieldError(imageInput, imageError, "");
    return true;
  }

  // 미리보기 URL 해제
  function revokePreviewUrls() {
    previewUrls.forEach(function(url) {
      URL.revokeObjectURL(url);
    });
    previewUrls = [];
  }

  // 이미지 미리보기 렌더링
  function renderImagePreviews() {
    revokePreviewUrls();
    Ui.clearChildren(imagePreviewList);
    if (selectedFiles.length === 0) {
      imagePreviewWrap.hidden = existingImageUrls.length === 0;
    } else {
      imagePreviewWrap.hidden = false;
    }

    existingImageUrls.forEach(function (url, index) {
      var li = Ui.createEl("li", "post-write__preview-item");
      var img = Ui.createEl("img", "post-write__preview-image");
      img.src = url;
      img.alt = "기존 게시글 이미지 " + (index + 1);
      var removeBtn = Ui.createEl("button", "post-write__preview-remove", "삭제");
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", "기존 이미지 " + (index + 1) + " 삭제");
      removeBtn.onclick = function () {
        existingImageUrls.splice(index, 1);
        renderImagePreviews();
        markDirty();
      };
      li.appendChild(img);
      li.appendChild(removeBtn);
      imagePreviewList.appendChild(li);
    });

    selectedFiles.forEach(function(file, index) {
      var url = URL.createObjectURL(file);
      previewUrls.push(url);
      var li = Ui.createEl("li", "post-write__preview-item");
      var img = Ui.createEl("img", "post-write__preview-image");
      img.src = url;
      img.alt = file.name + " 미리보기";
      var removeBtn = Ui.createEl("button", "post-write__preview-remove", "");
      removeBtn.type = "button";
      removeBtn.textContent = "삭제";
      removeBtn.setAttribute("aria-label", file.name + " 이미지 삭제");
      removeBtn.onclick = function() {
        selectedFiles.splice(index, 1);
        renderImagePreviews();
        updateImageName();
        markDirty();
        imageInput.value = "";
      };
      li.appendChild(img);
      li.appendChild(removeBtn);
      imagePreviewList.appendChild(li);
    });
    updateImageName();
  }

  // 이미지 변경 핸들러
  function handleImageChange(event) {
    var files = Array.from(event.target.files);
    if (!validateImageFiles(files)) return;
    selectedFiles = selectedFiles.concat(files);
    renderImagePreviews();
    event.target.value = "";
    markDirty();
  }

  // 폼 유효성 검사
  function validateForm() {
    var isValid = true;
    var title = titleInput.value.trim();
    var content = contentInput.value.trim();
    var category = document.querySelector('input[name="category"]:checked');
    var titleErrorText = "";
    var contentErrorText = "";
    var imageErrorText = "";
    var tagErrorText = "";

    if (!title) {
      titleErrorText = "제목을 입력해주세요.";
      isValid = false;
    } else if (title.length > 100) {
      titleErrorText = "제목은 100자 이내로 입력해주세요.";
      isValid = false;
    }

    if (!content) {
      contentErrorText = "내용을 입력해주세요.";
      isValid = false;
    } else if (content.length > 5000) {
      contentErrorText = "내용은 5000자 이내로 입력해주세요.";
      isValid = false;
    }

    if (!category) {
      Ui.setFormMessage(messageEl, "카테고리를 선택해주세요.", "danger");
      isValid = false;
    }

    Ui.setFieldError(titleInput, titleError, titleErrorText);
    Ui.setFieldError(contentInput, contentError, contentErrorText);
    Ui.setFieldError(imageInput, imageError, imageErrorText);
    Ui.setFieldError(tagInput, tagError, tagErrorText);

    if (!isValid) {
      Ui.focusFirstError(form);
    }

    return isValid;
  }

  // FormData 빌드
  function buildFormData() {
    var formData = new FormData();
    var category = document.querySelector('input[name="category"]:checked').value;
    var title = titleInput.value.trim();
    var content = contentInput.value.trim();
    formData.append("category", category);
    formData.append("title", title);
    formData.append("content", content);
    formData.append("tags", JSON.stringify(tags));
    formData.append("existingImageUrls", JSON.stringify(existingImageUrls));
    selectedFiles.forEach(function(file) {
      formData.append("images", file);
    });
    return formData;
  }

  // 임시 저장
  function saveDraft() {
    if (isEditMode) return;
    try {
      var draft = {
        category: document.querySelector('input[name="category"]:checked')
          ? document.querySelector('input[name="category"]:checked').value
          : "",
        title: titleInput.value,
        content: contentInput.value,
        tags: tags
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn("임시 저장 실패:", e);
    }
  }

  // 임시 저장 복원
  function restoreDraft() {
    if (isEditMode) return;
    try {
      var draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        var parsed = JSON.parse(draft);
        if (parsed.category) {
          Array.prototype.forEach.call(categoryInputs, function (input) {
            input.checked = input.value === parsed.category;
          });
        }
        titleInput.value = parsed.title || "";
        contentInput.value = parsed.content || "";
        tags = normalizeTags(parsed.tags).slice(0, MAX_TAGS);
        renderTags();
        updateAllCounters();
        isDirty = false;
      }
    } catch (e) {
      console.warn("임시 저장 복원 실패:", e);
    }
  }

  // 임시 저장 삭제
  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.warn("임시 저장 삭제 실패:", e);
    }
  }

  // 수정 모드에서 게시글 불러오기
  async function loadPostForEdit() {
    if (!isEditMode) return;
    try {
      var response = await Api.get("/api/posts/" + encodeURIComponent(postId));
      var post = response.post || response;
      if (post.category) {
        Array.prototype.forEach.call(categoryInputs, function (input) {
          input.checked = input.value === post.category;
        });
      }
      titleInput.value = post.title || "";
      contentInput.value = post.content || "";
      tags = normalizeTags(post.tags).slice(0, MAX_TAGS);
      existingImageUrls = normalizeImageUrls(post);
      renderTags();
      renderImagePreviews();
      updateAllCounters();
      isDirty = false;
    } catch (error) {
      Ui.setFormMessage(messageEl, "게시글을 불러오지 못했습니다.", "danger");
      console.error("게시글 불러오기 실패:", error);
    }
  }

  // 폼 제출 핸들러
  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;

    isSubmitting = true;
    Ui.setLoading(submitButton, true, isEditMode ? "수정 중..." : "게시 중...");

    try {
      var formData = buildFormData();
      var response;
      if (isEditMode) {
        response = await Api.put("/api/posts/" + encodeURIComponent(postId), formData);
      } else {
        response = await Api.upload("/api/posts", formData);
      }

      clearDraft();
      isDirty = false;
      revokePreviewUrls();
      var savedPostId = response && response.postId ? response.postId : postId;
      if (savedPostId) {
        window.location.href = "./post-detail.html?postId=" + encodeURIComponent(savedPostId);
      } else {
        window.location.href = "./community.html";
      }
    } catch (error) {
      var message = Api.toMessage(error);
      Ui.setFormMessage(messageEl, message, "danger");
      console.error("게시글 저장 실패:", error);
    } finally {
      isSubmitting = false;
      Ui.setLoading(submitButton, false);
    }
  }

  // 페이지 종료 이벤트 핸들러
  function handleBeforeUnload(event) {
    if (isDirty && !isSubmitting) {
      event.preventDefault();
      event.returnValue = "";
      return "";
    }
  }

  // 이벤트 바인딩
  function bindEvents() {
    // 폼 제출
    form.addEventListener("submit", handleSubmit);

    // 제목 입력
    titleInput.addEventListener("input", function() {
      updateCounter(titleInput, titleCounter);
      markDirty();
      saveDraft();
    });

    // 내용 입력
    contentInput.addEventListener("input", function() {
      updateCounter(contentInput, contentCounter);
      markDirty();
      saveDraft();
    });

    // 카테고리 변경
    categoryInputs.forEach(function(input) {
      input.addEventListener("change", function() {
        markDirty();
        saveDraft();
      });
    });

    // 이미지 입력
    imageInput.addEventListener("change", handleImageChange);

    // 태그 입력
    tagInput.addEventListener("keydown", function(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        addTag(tagInput.value);
        tagInput.value = "";
      } else if (event.key === "Backspace" && tagInput.value === "") {
        if (tags.length > 0) {
          removeTag(tags.length - 1);
        }
      }
    });

    // 페이지 종료 이벤트
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", function() {
      revokePreviewUrls();
    });
  }

  // 더티 상태 표시
  function markDirty() {
    isDirty = true;
  }

  // 이미지 이름 업데이트
  function updateImageName() {
    if (selectedFiles.length === 0 && existingImageUrls.length === 0) {
      imageNameEl.textContent = "이미지 파일을 선택해주세요.";
    } else if (selectedFiles.length === 0) {
      imageNameEl.textContent = "기존 이미지 " + existingImageUrls.length + "장 유지";
    } else {
      imageNameEl.textContent = selectedFiles.map(function (file) {
        return file.name;
      }).join(", ") + (existingImageUrls.length ? " · 기존 " + existingImageUrls.length + "장 유지" : "");
    }
  }

  // 초기화
  function init() {
    if (!window.TomopetAuth.requireAuth()) return;
    postId = getPostId();
    isEditMode = !!postId;
    if (isEditMode) {
      $("post-write-title").textContent = "게시글 수정";
      $("post-write-description").textContent = "작성한 이야기를 수정할 수 있어요.";
      $("post-submit-button").textContent = "수정하기";
    } else {
      restoreDraft();
    }
    $("post-image-limit").textContent = "JPG, PNG, WEBP · 최대 3장 · 장당 5MB";
    bindEvents();
    updateAllCounters();
    loadPostForEdit();
  }

  // 초기 실행
  document.addEventListener("DOMContentLoaded", init);
})();
