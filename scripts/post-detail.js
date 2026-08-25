/* ============================================================
   TOMOPET | scripts/post-detail.js
   검색 키워드: 게시글 상세, 댓글, 좋아요, 삭제, 본인 글, 이미지 갤러리
   커뮤니티 게시글 상세

   의존
     layout.js  window.TomopetAuth
     api.js     window.TomopetApi
     ui.js      window.TomopetUi

   연동 엔드포인트
     GET    /api/posts/:postId
     DELETE /api/posts/:postId
     POST   /api/posts/:postId/like
     GET    /api/posts/:postId/comments
     POST   /api/posts/:postId/comments
     DELETE /api/posts/:postId/comments/:commentId

   진입 경로는 ./post-detail.html?postId=123 하나뿐임
   홈(index.js)과 목록(community.js)이 이 형식으로 링크를 만들므로
   "id" 나 "no" 로 바꾸면 두 화면에서 넘어온 사용자가 빈 화면을 봄

   좋아요는 응답을 기다리지 않고 먼저 화면을 바꿈
   응답을 기다리면 누른 뒤 반응이 없는 것처럼 느껴지므로
   실패했을 때 원래대로 되돌리는 방식을 씀
   ============================================================ */

(function () {
  "use strict";

  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var Auth = window.TomopetAuth;
  var $ = Ui.$;

  /* 카테고리 코드 -> 배지 표시 정보
     색상은 components.css 의 .badge--* 가 담당함 (post-detail.css 주석 참고)
     서버 값이 목록에 없으면 배지를 생략하므로
     예상치 못한 값이 그대로 노출되지 않음 */
  var CATEGORY_BADGE = {
    gallery: { label: "갤러리", className: "badge badge--gallery" },
    recipe: { label: "레시피", className: "badge badge--recipe" },
    free: { label: "자유", className: "badge badge--free" }
  };

  var state = {
    postId: null,
    post: null,
    liked: false,
    likeCount: 0,
    likePending: false,      /* 연타로 요청이 겹치는 것을 막음 */
    deletingCommentId: null  /* 댓글 삭제 확인 모달이 겨냥한 댓글 */
  };


  /* ==========================================================
     게시글 렌더링

     제목, 본문, 닉네임은 사용자 입력이므로 textContent 로만 삽입함
     ========================================================== */

  function renderCategory(category) {
    var el = $("post-category");
    var badge = CATEGORY_BADGE[category];

    if (!badge) {
      el.className = "post-detail__category";
      el.textContent = "";
      el.hidden = true;
      return;
    }

    el.hidden = false;
    el.className = "post-detail__category " + badge.className;
    el.textContent = badge.label;
  }

  /* 서버가 imageUrls 배열을 주기도 하고 imageUrl 하나만 주기도 하므로
     항상 배열로 통일해서 다룸 */
  function toImageList(post) {
    if (Array.isArray(post.imageUrls)) return post.imageUrls.filter(Boolean);
    if (post.imageUrl) return [post.imageUrl];
    return [];
  }

  function renderImages(post) {
    var gallery = $("post-image-gallery");
    Ui.clearChildren(gallery);

    var images = toImageList(post);
    if (!images.length) {
      /* 이미지가 없으면 빈 격자가 남지 않도록 통째로 숨김 */
      gallery.hidden = true;
      return;
    }

    images.forEach(function (url, index) {
      var img = document.createElement("img");
      img.className = "post-detail__image";
      img.src = url;
      /* 본문을 보조하는 이미지이므로 순번으로 구분함 */
      img.alt = (post.title || "게시글") + " 이미지 " + (index + 1);
      img.loading = "lazy";
      gallery.appendChild(img);
    });

    gallery.hidden = false;
  }

  /* 본인 글일 때만 수정/삭제를 노출함
     서버도 권한을 검사하지만, 눌러도 403 이 나는 버튼을 보여줄 이유가 없음 */
  function renderOwnerActions(post) {
    var actions = $("post-owner-actions");
    var me = Auth.getUser();

    var isOwner = Boolean(me && post.authorId && me.userId === post.authorId);
    actions.hidden = !isOwner;

    if (isOwner) {
      /* 수정 화면이 어떤 글인지 알아야 하므로 postId 를 붙임 */
      $("post-edit-link").href =
        "./post-write.html?postId=" + encodeURIComponent(state.postId);
    }
  }

  function renderLike(post) {
    var button = $("post-like-button");

    state.liked = Boolean(post.liked);
    state.likeCount = post.likeCount || 0;

    button.classList.toggle("is-liked", state.liked);
    button.setAttribute("aria-pressed", state.liked ? "true" : "false");
    /* 버튼 안의 "좋아요" 글자를 지우지 않도록 숫자 span 만 갱신함 */
    $("post-like-count").textContent = Ui.formatNumber(state.likeCount);
  }

  function renderPost(post) {
    state.post = post;

    renderCategory(post.category);
    $("post-title").textContent = post.title || "제목 없음";
    $("post-author").textContent = post.authorNickname || "익명";

    var time = $("post-created-at");
    time.textContent = Ui.formatDate(post.createdAt);
    /* datetime 속성이 있어야 스크린리더와 검색엔진이 날짜로 인식함 */
    if (post.createdAt) time.setAttribute("datetime", post.createdAt);

    $("post-content").textContent = post.content || "";

    renderImages(post);
    renderOwnerActions(post);
    renderLike(post);

    $("post-detail").hidden = false;
    $("comments-section").hidden = false;
  }

  async function loadPost() {
    try {
      var post = await Api.get("/api/posts/" + encodeURIComponent(state.postId));
      renderPost(post);
      return true;
    } catch (error) {
      console.error("게시글 로딩 실패:", error);

      /* 본문을 못 불러왔으면 댓글도 의미가 없으므로 둘 다 숨긴 채로 둠 */
      $("post-detail").hidden = true;
      $("comments-section").hidden = true;

      Ui.setFormMessage(
        $("post-detail-message"),
        Api.toMessage(error, "게시글을 불러오지 못했습니다."),
        "danger"
      );
      return false;
    }
  }


  /* ==========================================================
     좋아요

     먼저 화면을 바꾸고 실패하면 되돌림
     ========================================================== */

  function applyLike(liked, count) {
    var button = $("post-like-button");

    state.liked = liked;
    state.likeCount = count;

    button.classList.toggle("is-liked", liked);
    button.setAttribute("aria-pressed", liked ? "true" : "false");
    $("post-like-count").textContent = Ui.formatNumber(count);
  }

  async function toggleLike() {
    /* 요청이 오가는 중에 또 누르면 카운트가 어긋남 */
    if (state.likePending) return;
    state.likePending = true;

    var prevLiked = state.liked;
    var prevCount = state.likeCount;
    var nextLiked = !prevLiked;

    /* 0 아래로 내려가지 않도록 방어 */
    var nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    applyLike(nextLiked, nextCount);

    try {
      var data = await Api.post("/api/posts/" + encodeURIComponent(state.postId) + "/like");

      /* 서버가 확정값을 주면 그것으로 맞춤
         여러 기기에서 눌렀을 때 화면과 서버가 어긋나는 것을 막음 */
      if (data && typeof data.likeCount === "number") {
        applyLike(
          typeof data.liked === "boolean" ? data.liked : nextLiked,
          data.likeCount
        );
      }
    } catch (error) {
      console.error("좋아요 실패:", error);
      applyLike(prevLiked, prevCount);
      Ui.toast(Api.toMessage(error, "좋아요를 처리하지 못했습니다."), "danger");
    } finally {
      state.likePending = false;
    }
  }


  /* ==========================================================
     게시글 삭제

     confirm() 은 너무 쉽게 눌리므로 <dialog> 로 한 번 더 확인함
     ========================================================== */

  function initPostDelete() {
    var dialog = $("post-delete-dialog");
    var confirmBtn = $("post-delete-confirm");

    $("post-delete-button").addEventListener("click", function () {
      dialog.showModal();
    });

    $("post-delete-cancel").addEventListener("click", function () {
      dialog.close();
    });

    confirmBtn.addEventListener("click", async function () {
      Ui.setLoading(confirmBtn, true, "삭제 중...");

      try {
        await Api.del("/api/posts/" + encodeURIComponent(state.postId));
        dialog.close();
        /* 삭제된 글에 머무를 수 없으므로 목록으로 보냄 */
        window.location.replace("./community.html");
      } catch (error) {
        console.error("게시글 삭제 실패:", error);
        dialog.close();
        Ui.setFormMessage(
          $("post-detail-message"),
          Api.toMessage(error, "게시글을 삭제하지 못했습니다."),
          "danger"
        );
      } finally {
        Ui.setLoading(confirmBtn, false);
      }
    });
  }


  /* ==========================================================
     댓글
     ========================================================== */

  function createCommentItem(comment) {
    var li = Ui.createEl("li", "comments__item");

    var header = Ui.createEl("div", "comments__item-header");
    header.appendChild(
      Ui.createEl("span", "comments__author", comment.authorNickname || "익명")
    );

    var date = Ui.createEl("time", "comments__date", Ui.formatRelativeTime(comment.createdAt));
    if (comment.createdAt) date.setAttribute("datetime", comment.createdAt);
    header.appendChild(date);

    li.appendChild(header);
    li.appendChild(Ui.createEl("p", "comments__content", comment.content || ""));

    /* 본인 댓글에만 삭제 버튼을 붙임 */
    var me = Auth.getUser();
    var isOwner = Boolean(me && comment.authorId && me.userId === comment.authorId);

    if (isOwner) {
      var remove = Ui.createEl("button", "btn btn--danger btn--sm comments__delete", "삭제");
      remove.type = "button";
      remove.setAttribute("aria-label", (comment.authorNickname || "내") + " 댓글 삭제");
      remove.addEventListener("click", function () {
        state.deletingCommentId = comment.commentId;
        $("comment-delete-dialog").showModal();
      });
      li.appendChild(remove);
    }

    return li;
  }

  function renderComments(comments) {
    Ui.renderList($("comment-list"), comments, createCommentItem, $("comment-empty"));
    $("comment-count").textContent = comments.length + "개";
  }

  async function loadComments() {
    try {
      var data = await Api.get(
        "/api/posts/" + encodeURIComponent(state.postId) + "/comments"
      );
      renderComments(Api.toList(data));
    } catch (error) {
      console.error("댓글 로딩 실패:", error);
      /* 댓글을 못 불러와도 본문은 볼 수 있어야 하므로 빈 목록으로 둠 */
      renderComments([]);
    }
  }

  function initCommentForm() {
    var form = $("comment-form");
    var input = $("comment-content");
    var submitBtn = $("comment-submit-button");

    input.addEventListener("input", function () {
      Ui.setFieldError(input, $("comment-content-error"), "");
    });

    $("comment-focus-button").addEventListener("click", function () {
      input.focus();
    });

    form.addEventListener("submit", async function (event) {
      /* 없으면 페이지가 새로고침되며 작성 중인 댓글이 사라짐 */
      event.preventDefault();

      var content = input.value.trim();
      if (!content) {
        Ui.setFieldError(input, $("comment-content-error"), "댓글 내용을 입력해주세요.");
        input.focus();
        return;
      }
      Ui.setFieldError(input, $("comment-content-error"), "");

      /* 없으면 연타로 같은 댓글이 여러 번 등록됨 */
      Ui.setLoading(submitBtn, true, "등록 중...");

      try {
        await Api.post(
          "/api/posts/" + encodeURIComponent(state.postId) + "/comments",
          { content: content }
        );

        form.reset();
        Ui.setFormMessage($("post-detail-message"), "");
        Ui.toast("댓글을 등록했어요");

        /* 서버가 매긴 commentId 와 작성 시각이 필요하므로 다시 불러옴 */
        await loadComments();
      } catch (error) {
        console.error("댓글 등록 실패:", error);
        Ui.setFormMessage(
          $("post-detail-message"),
          Api.toMessage(error, "댓글을 등록하지 못했습니다."),
          "danger"
        );
      } finally {
        Ui.setLoading(submitBtn, false);
      }
    });
  }

  function initCommentDelete() {
    var dialog = $("comment-delete-dialog");
    var confirmBtn = $("comment-delete-confirm");

    $("comment-delete-cancel").addEventListener("click", function () {
      state.deletingCommentId = null;
      dialog.close();
    });

    confirmBtn.addEventListener("click", async function () {
      if (!state.deletingCommentId) {
        dialog.close();
        return;
      }

      Ui.setLoading(confirmBtn, true, "삭제 중...");

      try {
        await Api.del(
          "/api/posts/" + encodeURIComponent(state.postId) +
          "/comments/" + encodeURIComponent(state.deletingCommentId)
        );
        dialog.close();
        Ui.toast("댓글을 삭제했어요");
        await loadComments();
      } catch (error) {
        console.error("댓글 삭제 실패:", error);
        dialog.close();
        Ui.setFormMessage(
          $("post-detail-message"),
          Api.toMessage(error, "댓글을 삭제하지 못했습니다."),
          "danger"
        );
      } finally {
        state.deletingCommentId = null;
        Ui.setLoading(confirmBtn, false);
      }
    });
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", async function () {
    var params = new URLSearchParams(window.location.search);
    /* "id" 가 아니라 "postId" - 홈과 목록이 이 이름으로 링크를 만듦 */
    state.postId = params.get("postId");

    if (!state.postId) {
      Ui.setFormMessage(
        $("post-detail-message"),
        "잘못된 접근입니다. 목록에서 게시글을 선택해주세요.",
        "danger"
      );
      return;
    }

    $("post-like-button").addEventListener("click", toggleLike);
    initPostDelete();
    initCommentForm();
    initCommentDelete();

    /* 본문을 못 불러왔으면 댓글 요청은 보내지 않음 */
    var loaded = await loadPost();
    if (loaded) loadComments();
  });
})();
