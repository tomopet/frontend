(function () {
  "use strict";

  // [공통] 페이지 스크립트는 직접 fetch하거나 DOM 유틸리티를 재구현하지 않고 공용 API/UI/인증 모듈을 사용한다.
  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var Auth = window.TomopetAuth;
  var $ = Ui.$;

  // 현재 게시글과 삭제 대상을 보관하고, 좋아요 중복 요청은 별도 플래그로 잠근다.
  var postId = null;
  var pendingCommentId = null;
  var likePending = false;

  // API의 영문 카테고리 값을 화면에 표시할 한글 라벨로 변환한다.
  var CATEGORY_LABELS = {
    gallery: "갤러리",
    recipe: "레시피",
    free: "자유"
  };

  // 목록/홈이 전달하는 정확한 계약인 ?postId= 값을 읽고, 없으면 페이지 안에 접근 오류를 표시한다.
  function getPostId() {
    var params = new URLSearchParams(window.location.search);
    var id = (params.get("postId") || "").trim();

    if (!id) {
      Ui.setFormMessage(
        $("post-detail-message"),
        "잘못된 접근입니다. 게시글 번호를 확인해주세요.",
        "danger"
      );
      return null;
    }

    return id;
  }

  // 공개 상세 조회는 허용하되 좋아요·댓글·삭제 같은 변경 동작 직전에만 로그인을 요구한다.
  function requireActionAuth() {
    if (!Auth.requireAuth()) return false;
    if (Auth.isLoggedIn()) return true;

    window.location.replace(Auth.loginUrl ? Auth.loginUrl() : "./login.html");
    return false;
  }

  // 현재 로그인 사용자와 작성자 ID를 문자열로 맞춰 비교해 숫자/문자열 응답 차이를 흡수한다.
  function isOwnedByCurrentUser(authorId) {
    var user = Auth.getUser();
    return Boolean(
      user &&
      user.userId !== undefined &&
      authorId !== undefined &&
      String(user.userId) === String(authorId)
    );
  }

  // 상세 API가 허용하는 images, imageUrls, imageUrl 세 형태를 URL 문자열 배열 하나로 정규화한다.
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
    });
  }

  // 기존 갤러리를 비운 뒤 안전한 DOM 생성 방식으로 첨부 이미지와 대체 텍스트를 다시 구성한다.
  function renderImages(post) {
    var gallery = $("post-image-gallery");
    var imageUrls = normalizeImageUrls(post);

    Ui.clearChildren(gallery);
    gallery.hidden = imageUrls.length === 0;

    imageUrls.forEach(function (url, index) {
      var image = Ui.createEl("img", "post-detail__image");
      image.src = url;
      image.alt = (post.title || "게시글") + " 첨부 이미지 " + (index + 1);
      gallery.appendChild(image);
    });
  }

  // 게시글 본문, 메타 정보, 이미지, 좋아요 상태와 작성자 전용 액션을 한 번에 화면에 반영한다.
  function renderPost(post) {
    if (!post || typeof post !== "object") {
      throw new Error("게시글 응답 형식이 올바르지 않습니다.");
    }

    $("post-category").textContent = CATEGORY_LABELS[post.category] || "";
    $("post-title").textContent = post.title || "제목 없음";
    $("post-author").textContent = post.authorNickname || "익명";

    var createdAt = $("post-created-at");
    createdAt.textContent = Ui.formatDate(post.createdAt);
    if (post.createdAt) {
      createdAt.dateTime = post.createdAt;
    } else {
      createdAt.removeAttribute("datetime");
    }

    $("post-content").textContent = post.content || "";
    renderImages(post);

    var likeButton = $("post-like-button");
    var liked = Boolean(post.likedByMe || post.isLiked);
    likeButton.classList.toggle("is-liked", liked);
    likeButton.setAttribute("aria-pressed", String(liked));
    $("post-like-count").textContent = String(Math.max(0, Number(post.likeCount) || 0));

    var ownerActions = $("post-owner-actions");
    var isOwner = isOwnedByCurrentUser(post.authorId);
    ownerActions.hidden = !isOwner;
    if (isOwner) {
      $("post-edit-link").href =
        "./post-write.html?postId=" + encodeURIComponent(postId);
    }

    $("post-detail").hidden = false;
    $("comments-section").hidden = false;
  }

  // 댓글 한 건의 작성자·작성일·본문을 만들고, 본인 댓글에만 삭제 버튼을 연결한다.
  function createCommentItem(comment) {
    comment = comment && typeof comment === "object" ? comment : {};

    var item = Ui.createEl("li", "comments__item");
    var commentId = comment.commentId !== undefined ? comment.commentId : comment.id;

    if (commentId !== undefined && commentId !== null) {
      item.id = "comment-" + commentId;
    }

    var header = Ui.createEl("div", "comments__item-header");
    header.appendChild(
      Ui.createEl("span", "comments__author", comment.authorNickname || "익명")
    );
    header.appendChild(
      Ui.createEl("span", "comments__date", Ui.formatDate(comment.createdAt))
    );
    item.appendChild(header);
    item.appendChild(
      Ui.createEl("p", "comments__content", comment.content || "")
    );

    if (
      commentId !== undefined &&
      commentId !== null &&
      isOwnedByCurrentUser(comment.authorId)
    ) {
      var deleteButton = Ui.createEl("button", "comments__delete", "삭제");
      deleteButton.type = "button";
      deleteButton.setAttribute("aria-label", "댓글 삭제");
      deleteButton.addEventListener("click", function () {
        // 실제 삭제는 확인 dialog에서 수행하므로 여기서는 대상 ID만 기억한다.
        pendingCommentId = commentId;
        $("comment-delete-dialog").showModal();
      });
      item.appendChild(deleteButton);
    }

    return item;
  }

  // 댓글 응답을 배열로 방어 정규화하고 개수, 목록, 빈 상태를 공용 렌더러로 갱신한다.
  function renderComments(comments) {
    var list = Array.isArray(comments) ? comments : [];
    $("comment-count").textContent = Ui.formatNumber(list.length) + "개";
    Ui.renderList($("comment-list"), list, createCommentItem, $("comment-empty"));
  }

  // [API 연동] 현재 게시글의 댓글을 불러오며 실패해도 게시글 본문은 유지하고 오류 배너만 표시한다.
  async function loadComments() {
    try {
      var data = await Api.get(
        "/api/posts/" + encodeURIComponent(postId) + "/comments"
      );
      renderComments(Api.toList(data));
    } catch (error) {
      console.error("댓글 로딩 실패:", error);
      renderComments([]);
      Ui.setFormMessage(
        $("post-detail-message"),
        Api.toMessage(error, "댓글을 불러오지 못했습니다."),
        "danger"
      );
    }
  }

  // [API 연동] 게시글 상세를 먼저 그린 다음 댓글을 순서대로 불러와 초기 화면을 완성한다.
  async function loadPost() {
    Ui.setFormMessage($("post-detail-message"), "");

    try {
      var data = await Api.get("/api/posts/" + encodeURIComponent(postId));
      var post = data && data.post ? data.post : data;
      renderPost(post);
      await loadComments();
    } catch (error) {
      console.error("게시글 로딩 실패:", error);
      $("post-detail").hidden = true;
      $("comments-section").hidden = true;
      Ui.setFormMessage(
        $("post-detail-message"),
        Api.toMessage(error, "게시글을 불러오지 못했습니다."),
        "danger"
      );
    }
  }

  // 좋아요는 화면을 먼저 갱신하는 낙관적 처리이며, API 실패 시 이전 상태와 개수로 되돌린다.
  async function handleLike() {
    if (likePending || !requireActionAuth()) return;

    var button = $("post-like-button");
    var count = $("post-like-count");
    var wasLiked = button.classList.contains("is-liked");
    var previousCount = Math.max(0, Number(count.textContent) || 0);

    likePending = true;
    button.disabled = true;
    // 서버 응답을 기다리지 않고 즉시 피드백을 주되 아래 catch에서 반드시 롤백한다.
    button.classList.toggle("is-liked", !wasLiked);
    button.setAttribute("aria-pressed", String(!wasLiked));
    count.textContent = String(wasLiked ? Math.max(0, previousCount - 1) : previousCount + 1);

    try {
      var result = await Api.post(
        "/api/posts/" + encodeURIComponent(postId) + "/like",
        {}
      );

      if (result && result.likeCount !== undefined) {
        // 서버가 최종 개수를 반환하면 낙관적으로 계산한 값을 서버 기준으로 보정한다.
        count.textContent = String(Math.max(0, Number(result.likeCount) || 0));
      }
      if (result && (result.likedByMe !== undefined || result.isLiked !== undefined)) {
        var serverLiked = Boolean(
          result.likedByMe !== undefined ? result.likedByMe : result.isLiked
        );
        button.classList.toggle("is-liked", serverLiked);
        button.setAttribute("aria-pressed", String(serverLiked));
      }
    } catch (error) {
      console.error("좋아요 처리 실패:", error);
      button.classList.toggle("is-liked", wasLiked);
      button.setAttribute("aria-pressed", String(wasLiked));
      count.textContent = String(previousCount);
      Ui.setFormMessage(
        $("post-detail-message"),
        Api.toMessage(error, "좋아요 처리에 실패했습니다."),
        "danger"
      );
    } finally {
      likePending = false;
      button.disabled = false;
    }
  }

  // 댓글 제출은 빈 문자열을 차단하고 요청 중 버튼을 잠근 뒤 성공 시 목록 전체를 새로 불러온다.
  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!requireActionAuth()) return;

    var input = $("comment-content");
    var errorEl = $("comment-content-error");
    var submitButton = $("comment-submit-button");
    var content = input.value.trim();

    if (!content) {
      Ui.setFieldError(input, errorEl, "댓글 내용을 입력해주세요.");
      input.focus();
      return;
    }

    Ui.setFieldError(input, errorEl, "");
    Ui.setLoading(submitButton, true, "댓글 등록 중...");

    try {
      await Api.post(
        "/api/posts/" + encodeURIComponent(postId) + "/comments",
        { content: content }
      );
      input.value = "";
      await loadComments();
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      Ui.setFormMessage(
        $("post-detail-message"),
        Api.toMessage(error, "댓글 등록에 실패했습니다."),
        "danger"
      );
    } finally {
      Ui.setLoading(submitButton, false);
    }
  }

  // 게시글 삭제 확인 버튼의 실제 API 호출을 담당하며 성공하면 커뮤니티 목록으로 이동한다.
  async function confirmPostDelete() {
    if (!requireActionAuth()) return;

    var dialog = $("post-delete-dialog");
    var button = $("post-delete-confirm");
    Ui.setLoading(button, true, "삭제 중...");

    try {
      await Api.del("/api/posts/" + encodeURIComponent(postId));
      dialog.close();
      window.location.href = "./community.html";
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
      Ui.setFormMessage(
        $("post-detail-message"),
        Api.toMessage(error, "게시글 삭제에 실패했습니다."),
        "danger"
      );
      Ui.setLoading(button, false);
    }
  }

  // 기억해 둔 댓글 ID를 이용해 삭제하고, 성공하면 ID를 비운 뒤 최신 댓글 목록을 다시 표시한다.
  async function confirmCommentDelete() {
    if (
      pendingCommentId === null ||
      pendingCommentId === undefined ||
      !requireActionAuth()
    ) {
      return;
    }

    var dialog = $("comment-delete-dialog");
    var button = $("comment-delete-confirm");
    Ui.setLoading(button, true, "삭제 중...");

    try {
      await Api.del(
        "/api/posts/" + encodeURIComponent(postId) +
        "/comments/" + encodeURIComponent(pendingCommentId)
      );
      dialog.close();
      pendingCommentId = null;
      await loadComments();
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      Ui.setFormMessage(
        $("post-detail-message"),
        Api.toMessage(error, "댓글 삭제에 실패했습니다."),
        "danger"
      );
    } finally {
      Ui.setLoading(button, false);
    }
  }

  // 정적 HTML에 있는 좋아요·댓글·두 삭제 dialog의 이벤트를 한 곳에서 연결한다.
  function bindEvents() {
    $("post-like-button").addEventListener("click", handleLike);
    $("comment-form").addEventListener("submit", handleCommentSubmit);
    $("post-delete-button").addEventListener("click", function () {
      $("post-delete-dialog").showModal();
    });
    $("post-delete-cancel").addEventListener("click", function () {
      $("post-delete-dialog").close();
    });
    $("post-delete-confirm").addEventListener("click", confirmPostDelete);
    $("comment-delete-cancel").addEventListener("click", function () {
      $("comment-delete-dialog").close();
      pendingCommentId = null;
    });
    $("comment-delete-confirm").addEventListener("click", confirmCommentDelete);
    $("comment-focus-button").addEventListener("click", function () {
      $("comment-content").focus();
    });
    $("comment-content").addEventListener("input", function () {
      Ui.setFieldError($("comment-content"), $("comment-content-error"), "");
    });
  }

  // DOM 준비 후 postId를 먼저 검증해 잘못된 접근에서는 API 요청과 이벤트 연결을 모두 중단한다.
  document.addEventListener("DOMContentLoaded", function () {
    postId = getPostId();
    if (!postId) return;

    bindEvents();
    loadPost();
  });
})();
