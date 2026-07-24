/* 검색 키워드: AI 상담, 채팅, 대화 */
/* ============================================================
   TOMOPET | scripts/ai-chat.js
   AI 식재료 안전성 상담 채팅 — API 연동 및 인터랙션 제어

   담당: 협업자
   로드 방식: defer (문서 순서 보장)

   의존 모듈 (로드 순서 고정 필수)
     layout.js   즉시 실행 — window.TomopetAuth 정의
     api.js      defer — window.TomopetApi 정의
     ui.js       defer — window.TomopetUi 정의

   연동 엔드포인트
     GET  /api/chats                    대화 목록
     POST /api/chats                    새 대화 생성
     GET  /api/chats/:chatId/messages   메시지 목록
     POST /api/chats/:chatId/messages   메시지 전송
   ============================================================ */

(function () {
  "use strict";

  /* 공통 모듈 참조 — login.js / password-reset.js 와 동일한 패턴 */
  var Api = window.TomopetApi;
  var Ui  = window.TomopetUi;

  /* ==========================================================
     $ 헬퍼
     Ui 모듈이 없는 초기 실행 환경을 대비해 직접 정의
     ========================================================== */
  var $ = (Ui && Ui.$) ? Ui.$ : function (id) {
    return document.getElementById(id);
  };

  /* ==========================================================
     프로토타입 모드 플래그
     <body data-backend-ready="false"> 값을 읽어 API 호출 여부 결정
     ========================================================== */
  var backendReady = document.body.dataset.backendReady === "true";

  /* ==========================================================
     전역 상태
     ========================================================== */
  var activeChatId = "demo-1";
  var attachedFile = null;

  /* ==========================================================
     폴백 모의 데이터
     ========================================================== */
  var mockConversations = [
    { chatId: "demo-1", title: "브로콜리 급여 문의",   updatedAt: "오늘 21:42" },
    { chatId: "demo-2", title: "닭가슴살 조리 방법",   updatedAt: "어제"       },
    { chatId: "demo-3", title: "포도 한 알 섭취",      updatedAt: "7월 11일"  },
    { chatId: "demo-4", title: "사료 교체 시기",        updatedAt: "7월 8일"   }
  ];

  var mockMessages = {
    "demo-1": [
      {
        role: "assistant",
        content: "식재료 사진이나 이름, 조리 상태, 예상 급여량을 알려주세요.",
        time: "21:40"
      },
      {
        role: "user",
        content: "삶은 브로콜리를 8kg 강아지에게 조금 먹여도 될까요?",
        time: "21:41"
      },
      {
        role: "assistant",
        content: "양념 없이 충분히 익힌 브로콜리는 소량 급여할 수 있습니다. " +
                 "처음에는 한두 조각 정도로 시작하고, 구토나 설사 여부를 확인하세요. " +
                 "줄기 부분은 질길 수 있어 작게 잘라 주는 편이 좋습니다.",
        time: "21:42"
      }
    ],
    "demo-2": [
      {
        role: "assistant",
        content: "닭가슴살은 소금과 양념 없이 완전히 익힌 뒤 지방과 뼈를 제거해 소량 급여하세요.",
        time: "어제"
      }
    ],
    "demo-3": [
      {
        role: "assistant",
        content: "포도와 건포도는 강아지에게 위험할 수 있습니다. " +
                 "섭취했다면 양이 적어도 바로 동물병원에 문의하세요.",
        time: "7월 11일"
      }
    ],
    "demo-4": [
      {
        role: "assistant",
        content: "사료는 보통 7일 정도에 걸쳐 기존 사료와 새 사료의 비율을 " +
                 "단계적으로 바꾸는 방법이 권장됩니다.",
        time: "7월 8일"
      }
    ]
  };

  /* ==========================================================
     시간 포맷터
     ========================================================== */
  function formatTime() {
    return new Intl.DateTimeFormat("ko-KR", {
      hour:   "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date());
  }

  /* ==========================================================
     백엔드 상태 배지 업데이트
     ========================================================== */
  function updateBackendBadge() {
    var badge = $("backend-status-badge");
    if (!badge) return;

    if (backendReady) {
      badge.textContent = "백엔드 연동 완료";
      badge.classList.add("is-ready");
    } else {
      badge.textContent = "백엔드 연동 대기";
      badge.classList.remove("is-ready");
    }
  }

  /* ==========================================================
     메시지 DOM 생성 및 로그에 추가
     [중요] AI 응답 문자열은 textContent 로만 삽입 (innerHTML 금지)
     ========================================================== */
  function appendMessage(role, content, time, attachmentName) {
    var item = document.createElement("article");
    item.className = "message message--" + role;

    /* 아바타 */
    var avatar = document.createElement("div");
    avatar.className   = "message__avatar";
    avatar.textContent = role === "assistant" ? "AI" : "나";
    avatar.setAttribute("aria-hidden", "true");

    /* 메시지 본문 영역 */
    var body = document.createElement("div");
    body.className = "message__body";

    /* 첨부 파일 카드 (파일이 있을 때만 추가) */
    if (attachmentName) {
      var card  = document.createElement("div");
      card.className = "attachment-card";

      var thumb = document.createElement("div");
      thumb.className   = "attachment-card__thumb";
      thumb.textContent = "📷";
      thumb.setAttribute("aria-hidden", "true");

      var name = document.createElement("span");
      name.className   = "attachment-card__name";
      name.textContent = attachmentName;

      card.append(thumb, name);
      body.appendChild(card);
    }

    /* 말풍선 */
    var bubble = document.createElement("div");
    bubble.className   = "message__bubble";
    bubble.textContent = content;
    body.appendChild(bubble);

    /* AI 응답에만 면책 문구 추가 */
    if (role === "assistant") {
      var disclaimer = document.createElement("p");
      disclaimer.className   = "message__disclaimer";
      disclaimer.textContent = "AI 분석 결과는 참고 정보이며 수의학적 진단이 아닙니다.";
      body.appendChild(disclaimer);
    }

    /* 시간 표시 */
    var timeEl = document.createElement("p");
    timeEl.className   = "message__time";
    timeEl.textContent = time || formatTime();
    body.appendChild(timeEl);

    item.append(avatar, body);

    var chatLog = $("chat-log");
    if (chatLog) {
      chatLog.appendChild(item);
      chatLog.scrollTop = chatLog.scrollHeight;
    }
  }

  /* ==========================================================
     메시지 목록 전체 렌더링
     ========================================================== */
  function renderMessages(messages) {
    var chatLog = $("chat-log");
    if (!chatLog) return;
    chatLog.replaceChildren();

    messages.forEach(function (msg) {
      appendMessage(msg.role, msg.content, msg.time, msg.attachmentName);
    });
  }

  /* ==========================================================
     대화 목록 렌더링
     ========================================================== */
  function renderConversations(conversations) {
    var list = $("conversation-list");
    if (!list) return;
    list.replaceChildren();

    conversations.forEach(function (conv) {
      var button = document.createElement("button");
      button.className   = "conversation-item" +
                           (conv.chatId === activeChatId ? " is-active" : "");
      button.type        = "button";
      button.dataset.chatId = conv.chatId;

      var title = document.createElement("span");
      title.className   = "conversation-item__title";
      title.textContent = conv.title;

      var meta = document.createElement("span");
      meta.className   = "conversation-item__meta";
      meta.textContent = conv.updatedAt;

      button.append(title, meta);

      button.addEventListener("click", function () {
        selectConversation(conv.chatId);
      });

      list.appendChild(button);
    });
  }

  /* ==========================================================
     대화 전환
     ========================================================== */
  async function selectConversation(chatId) {
    activeChatId = chatId;
    renderConversations(mockConversations);

    if (!backendReady || !Api) {
      renderMessages(mockMessages[chatId] || []);
      return;
    }

    try {
      var data = await Api.get("/api/chats/" + chatId + "/messages");
      var msgs = Api.toList ? Api.toList(data) : data;
      renderMessages(Array.isArray(msgs) ? msgs : []);
    } catch (error) {
      console.error("메시지 로딩 실패:", error);
      renderMessages(mockMessages[chatId] || []);
    }
  }

  /* ==========================================================
     대화 목록 초기 로딩
     ========================================================== */
  async function loadConversations() {
    if (!backendReady || !Api) {
      renderConversations(mockConversations);
      renderMessages(mockMessages[activeChatId] || []);
      return;
    }

    try {
      var data = await Api.get("/api/chats");
      var list = Api.toList ? Api.toList(data) : data;

      if (Array.isArray(list) && list.length > 0) {
        mockConversations = list;
        renderConversations(list);
        selectConversation(list[0].chatId);
      } else {
        renderConversations(mockConversations);
        renderMessages(mockMessages[activeChatId] || []);
      }
    } catch (error) {
      console.error("대화 목록 로딩 실패:", error);
      renderConversations(mockConversations);
      renderMessages(mockMessages[activeChatId] || []);
    }
  }

  /* ==========================================================
     첨부 파일 초기화
     ========================================================== */
  function clearAttachment() {
    attachedFile = null;

    var imageInput = $("image-input");
    if (imageInput) imageInput.value = "";

    var attachmentName = $("attachment-name");
    if (attachmentName) attachmentName.textContent = "첨부된 사진 없음";

    var removeBtn = $("remove-attachment");
    if (removeBtn) removeBtn.hidden = true;
  }

  /* ==========================================================
     전송 버튼 로딩 상태 전환
     ========================================================== */
  function setSending(isSending) {
    var button = $("send-button");
    if (!button) return;
    button.disabled    = isSending;
    button.textContent = isSending ? "전송 중" : "보내기";
  }

  /* ==========================================================
     메시지 전송
     ========================================================== */
  async function sendMessage(event) {
    event.preventDefault();

    var input   = $("message-input");
    var content = input ? input.value.trim() : "";
    if (!content) return;

    var attachmentName = attachedFile ? attachedFile.name : "";

    /* 사용자 메시지 추가 */
    appendMessage("user", content, formatTime(), attachmentName);

    if (input) input.value = "";
    setSending(true);

    try {
      if (backendReady && Api) {
        var response = await Api.post(
          "/api/chats/" + activeChatId + "/messages",
          { content: content }
        );
        appendMessage(
          "assistant",
          String(response.content || response.message || "응답을 받았습니다."),
          formatTime()
        );
        clearAttachment();
      } else {
        window.setTimeout(function () {
          appendMessage(
            "assistant",
            "현재 화면은 백엔드 연동 전 시안입니다. " +
            "실제 서비스에서는 식재료 종류, 조리 상태, " +
            "급여량과 반려견 정보를 바탕으로 참고 답변을 제공합니다.",
            formatTime()
          );
          setSending(false);
        }, 450);
        clearAttachment();
        return;
      }
    } catch (error) {
      console.error("메시지 전송 실패:", error);
      appendMessage(
        "assistant",
        "메시지를 전송하지 못했습니다. 잠시 후 다시 시도하세요.",
        formatTime()
      );
    } finally {
      if (backendReady) setSending(false);
    }
  }

  /* ==========================================================
     새 대화 생성
     ========================================================== */
  async function createConversation() {
    if (backendReady && Api) {
      try {
        var created = await Api.post("/api/chats", { title: "새 상담" });
        activeChatId = created.chatId;
        await loadConversations();
      } catch (error) {
        console.error("새 대화 생성 실패:", error);
      }
    } else {
      var newId = "demo-" + String(mockConversations.length + 1);
      mockConversations.unshift({
        chatId:    newId,
        title:      "새 상담",
        updatedAt: "방금"
      });
      mockMessages[newId] = [{
        role:    "assistant",
        content: "궁금한 식재료와 급여량을 입력하세요.",
        time:    formatTime()
      }];
      activeChatId = newId;
      renderConversations(mockConversations);
      renderMessages(mockMessages[newId]);
    }

    var input = $("message-input");
    if (input) input.focus();
  }

  /* ==========================================================
     DOMContentLoaded — 이벤트 바인딩 및 초기화
     ========================================================== */
  document.addEventListener("DOMContentLoaded", function () {

    /* 인증 가드 바이패스 처리 */
    if (Api && window.TomopetAuth &&
        typeof window.TomopetAuth.requireAuth === "function") {
      if (!window.TomopetAuth.requireAuth()) return;
    }

    /* Ui 모듈 재바인딩 */
    if (Ui && Ui.$) $ = Ui.$;

    /* 백엔드 상태 표시 업데이트 */
    updateBackendBadge();

    /* 폼 제출 바인딩 */
    var messageForm = $("message-form");
    if (messageForm) {
      messageForm.addEventListener("submit", sendMessage);
    }

    /* 새 대화 버튼 바인딩 */
    var newChatBtn = $("new-chat-button");
    if (newChatBtn) {
      newChatBtn.addEventListener("click", createConversation);
    }

    /* 현재 대화 초기화 버튼 바인딩 */
    var clearChatBtn = $("clear-chat-button");
    if (clearChatBtn) {
      clearChatBtn.addEventListener("click", function () {
        mockMessages[activeChatId] = [];
        renderMessages([]);
      });
    }

    /* 파일 첨부 인풋 이벤트 */
    var imageInput = $("image-input");
    if (imageInput) {
      imageInput.addEventListener("change", function (event) {
        var file = event.target.files && event.target.files[0]
          ? event.target.files[0]
          : null;

        attachedFile = file;

        var attachmentName = $("attachment-name");
        if (attachmentName) {
          attachmentName.textContent = file ? file.name : "첨부된 사진 없음";
        }

        var removeBtn = $("remove-attachment");
        if (removeBtn) removeBtn.hidden = !file;
      });
    }

    /* 첨부 파일 삭제 버튼 */
    var removeAttachment = $("remove-attachment");
    if (removeAttachment) {
      removeAttachment.addEventListener("click", clearAttachment);
    }

    /* 입력창 키 이벤트 (Enter / Shift+Enter) */
    var messageInput = $("message-input");
    if (messageInput) {
      messageInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          var form = $("message-form");
          if (form) {
            if (typeof form.requestSubmit === "function") {
              form.requestSubmit();
            } else {
              sendMessage(event);
            }
          }
        }
      });
    }

    /* 최초 데이터 로드 */
    loadConversations();
  });

})();