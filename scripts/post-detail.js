(function () {
  "use strict";

  // 전역 변수 선언
  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var $ = Ui.$;
  var postId = null;
  var currentPost = null;
  var pendingCommentId = null;
  var likePending = false;

  // URL에서 게시글 ID 추출
  function getPostId() {
    var urlParams = new URLSearchParams(window.location.search);
    var id = urlParams.get("postId");
    if (!id) {
      Ui.setFormMessage($("post-detail-message"), "잘못된 접근입니다. 게시글 번호를 확인해주세요.", "danger");
      return null;
    }
    return id;
  }

  // 이미지 URL 정규화
  function normalizeImageUrls(post) {
    var images = [];
    if (post.images && Array.isArray(post.images)) {
      images = post.images;
    } else if (post.imageUrls && Array.isArray(post.imageUrls)) {
      images = post.imageUrls;
    } else if (post.imageUrl) {
      images = [post.imageUrl];
    }

    return images.map(function (img) {
      if (typeof img === "string") {
        return { imageUrl: img };
      }
      if (img && !img.imageUrl && img.url) {
        return { imageUrl: img.url };
      }
      return img;
    }).filter(function (img) {
      return img && img.imageUrl;
    });
  }

  // 게시글 렌더링
  function renderPost(post) {
    if (!post) return;

    currentPost = post;

    var categoryEl = $("post-category");
    var titleEl = $("post-title");
    var authorEl = $("post-author");
    var createdAtEl = $("post-created-at");
    var imageGalleryEl = $("post-image-gallery");
    var contentEl = $("post-content");
    var likeButtonEl = $("post-like-button");
    var likeCountEl = $("post-like-count");
    var ownerActionsEl = $("post-owner-actions");
    var editLinkEl = $("post-edit-link");

    // 카테고리 렌더링
    var categoryLabels = {
      gallery: "갤러리",
      recipe: "레시피",
      free: "자유"
    };
    categoryEl.textContent = categoryLabels[post.category] || "";

    // 제목 렌더링
    titleEl.textContent = post.title || "제목 없음";

    // 작성자 렌더링
    authorEl.textContent = post.authorNickname || "익명";

    // 작성일 렌더링
    createdAtEl.textContent = Ui.formatDate(post.createdAt);

    // 이미지 렌더링
    var images = normalizeImageUrls(post);
    if (images.length > 0) {
      Ui.clearChildren(imageGalleryEl);
      images.forEach(function (img) {
        var imgEl = Ui.createEl("img", "post-detail__image");
        imgEl.src = img.imageUrl;
        imgEl.alt = "게시글 이미지";
        imageGalleryEl.appendChild(imgEl);
      });
      imageGalleryEl.hidden = false;
    } else {
      imageGalleryEl.hidden = true;
    }

    // 내용 렌더링
    contentEl.textContent = post.content || "";

    // 좋아요 상태 렌더링
    var isLiked = Boolean(post.likedByMe || post.isLiked);
    var likeCount = Math.max(0, Number(post.likeCount) || 0);
    likeButtonEl.classList.toggle("is-liked", isLiked);
    likeButtonEl.setAttribute("aria-pressed", String(isLiked));
    likeCountEl.textContent = likeCount;

    // 소유자 액션 렌더링
    var currentUser = window.TomopetAuth.getUser();
    if (currentUser && String(currentUser.userId) === String(post.authorId)) {
      ownerActionsEl.hidden = false;
      editLinkEl.href = "./post-write.html?postId=" + encodeURIComponent(postId);
    } else {
      ownerActionsEl.hidden = true;
    }

    // 게시글 및 댓글 섹션 표시
    $("post-detail").hidden = false;
    $("comments-section").hidden = false;
  }

  // 댓글 항목 생성
  function createCommentItem(comment) {
    var commentEl = Ui.createEl("li", "comments__item");
    var commentId = comment.commentId !== undefined ? comment.commentId : comment.id;
    if (commentId !== undefined && commentId !== null) {
      commentEl.id = "comment-" + commentId;
    }

    var headerEl = Ui.createEl("div", "comments__item-header");
    var authorEl = Ui.createEl("span", "comments__author");
    authorEl.textContent = comment.authorNickname || "익명";
    headerEl.appendChild(authorEl);

    var dateEl = Ui.createEl("span", "comments__date");
    dateEl.textContent = Ui.formatDate(comment.createdAt);
    headerEl.appendChild(dateEl);

    commentEl.appendChild(headerEl);

    var contentEl = Ui.createEl("p", "comments__content");
    contentEl.textContent = comment.content || "";
    commentEl.appendChild(contentEl);

    // 삭제 버튼 추가
    var currentUser = window.TomopetAuth.getUser();
    if (currentUser && commentId !== undefined && commentId !== null && String(currentUser.userId) === String(comment.authorId)) {
      var deleteButtonEl = Ui.createEl("button", "comments__delete");
      deleteButtonEl.type = "button";
      deleteButtonEl.textContent = "삭제";
      deleteButtonEl.onclick = function () {
        pendingCommentId = commentId;
        $("comment-delete-dialog").showModal();
      };
      commentEl.appendChild(deleteButtonEl);
    }

    return commentEl;
  }

  // 댓글 목록 렌더링
  function renderComments(comments) {
    var commentListEl = $("comment-list");
    var commentCountEl = $("comment-count");
    var commentEmptyEl = $("comment-empty");

    if (!comments || comments.length === 0) {
      commentCountEl.textContent = "0개";
      commentEmptyEl.hidden = false;
      Ui.clearChildren(commentListEl);
      return;
    }

    commentCountEl.textContent = Ui.formatNumber(comments.length) + "개";
    commentEmptyEl.hidden = true;
    Ui.renderList(commentListEl, comments, createCommentItem);
  }

  // 게시글 로드
  async function loadPost() {
    try {
      var post = await Api.get("/api/posts/" + encodeURIComponent(postId));
      renderPost(post);
      await loadComments();
    } catch (error) {
      console.error("게시글 로드 실패:", error);
      Ui.setFormMessage($("post-detail-message"), Api.toMessage(error), "danger");
      $("post-detail").hidden = true;
      $("comments-section").hidden = true;
    }
  }

  // 댓글 로드
  async function loadComments() {
    try {
      var comments = await Api.get("/api/posts/" + encodeURIComponent(postId) + "/comments");
      comments = Api.toList(comments);
      renderComments(comments);
    } catch (error) {
      console.error("댓글 로드 실패:", error);
      Ui.setFormMessage($("post-detail-message"), "댓글을 불러오는 중 오류가 발생했습니다.", "danger");
    }
  }

  // 좋아요 처리
  async function handleLike() {
    if (likePending) return;

    likePending = true;
    var likeButtonEl = $("post-like-button");
    var likeCountEl = $("post-like-count");

    // UI 상태 변경 (옵티미스틱 업데이트)
    var isLiked = likeButtonEl.classList.contains("is-liked");
    likeButtonEl.classList.toggle("is-liked", !isLiked);
    likeButtonEl.setAttribute("aria-pressed", !isLiked);
    var currentCount = parseInt(likeCountEl.textContent) || 0;
    likeCountEl.textContent = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
    likeButtonEl.disabled = true;

    try {
      await Api.post("/api/posts/" + encodeURIComponent(postId) + "/like", {});
      // 좋아요 성공 시 상태 유지
    } catch (error) {
      console.error("좋아요 처리 실패:", error);
      // 상태 롤백
      likeButtonEl.classList.toggle("is-liked", isLiked);
      likeButtonEl.setAttribute("aria-pressed", isLiked);
      likeCountEl.textContent = currentCount;
      Ui.setFormMessage($("post-detail-message"), Api.toMessage(error, "좋아요 처리에 실패했습니다."), "danger");
    } finally {
      likePending = false;
      likeButtonEl.disabled = false;
    }
  }

  // 댓글 제출 처리
  async function handleCommentSubmit(event) {
    event.preventDefault();
    var contentEl = $("comment-content");
    var errorEl = $("comment-content-error");
    var submitButtonEl = $("comment-submit-button");

    var content = contentEl.value.trim();
    if (!content) {
      Ui.setFieldError(contentEl, errorEl, "댓글 내용을 입력해주세요.");
      return;
    }

    Ui.setFieldError(contentEl, errorEl, "");
    Ui.setLoading(submitButtonEl, true, "댓글 등록 중...");

    try {
      await Api.post("/api/posts/" + encodeURIComponent(postId) + "/comments", {
        content: content
      });
      contentEl.value = "";
      Ui.setFieldError(contentEl, errorEl, "");
      await loadComments();
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      Ui.setFormMessage($("post-detail-message"), Api.toMessage(error, "댓글 등록에 실패했습니다."), "danger");
    } finally {
      Ui.setLoading(submitButtonEl, false, "등록");
    }
  }

  // 게시글 삭제 확인
  async function confirmPostDelete() {
    var dialog = $("post-delete-dialog");
    var confirmButton = $("post-delete-confirm");

    // 확인 버튼 잠금
    Ui.setLoading(confirmButton, true, "삭제 중...");

    try {
      await Api.del("/api/posts/" + encodeURIComponent(postId));
      dialog.close();
      window.location.href = "./community.html";
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
      Ui.setFormMessage($("post-detail-message"), Api.toMessage(error, "게시글 삭제에 실패했습니다."), "danger");
      Ui.setLoading(confirmButton, false, "삭제");
    }
  }

  // 댓글 삭제 확인
  async function confirmCommentDelete() {
    if (pendingCommentId === null || pendingCommentId === undefined) return;

    var dialog = $("comment-delete-dialog");
    var confirmButton = $("comment-delete-confirm");

    // 확인 버튼 잠금
    Ui.setLoading(confirmButton, true, "삭제 중...");

    try {
      await Api.del("/api/posts/" + encodeURIComponent(postId) + "/comments/" + encodeURIComponent(pendingCommentId));
      Ui.setLoading(confirmButton, false);
      dialog.close();
      pendingCommentId = null;
      await loadComments();
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      Ui.setFormMessage($("post-detail-message"), Api.toMessage(error, "댓글 삭제에 실패했습니다."), "danger");
      Ui.setLoading(confirmButton, false, "삭제");
    }
  }

  // 이벤트 바인딩
  function bindEvents() {
    $("post-like-button").onclick = handleLike;
    $("comment-form").onsubmit = handleCommentSubmit;
    $("post-delete-button").onclick = function () {
      $("post-delete-dialog").showModal();
    };
    $("post-delete-cancel").onclick = function () {
      $("post-delete-dialog").close();
    };
    $("post-delete-confirm").onclick = confirmPostDelete;
    $("comment-delete-cancel").onclick = function () {
      $("comment-delete-dialog").close();
      pendingCommentId = null;
    };
    $("comment-delete-confirm").onclick = confirmCommentDelete;
    $("comment-focus-button").onclick = function () {
      $("comment-content").focus();
    };
  }

  // DOM 로드 후 초기화
  document.addEventListener("DOMContentLoaded", function () {
    postId = getPostId();
    if (!postId) return;

    bindEvents();
    loadPost();
  });
})();
