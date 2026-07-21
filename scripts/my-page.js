/* ============================================================
   TOMOPET | scripts/my-page.js
   검색 키워드: 마이페이지, 반려견 등록, 아이 관리, 프로필, 회원 정보
   마이페이지 - 반려견 관리 + 내 정보 관리

   나이는 저장하지 않고 생일(birthDate)로 계산합니다.
   활동량(activityLevel)은 백엔드의 DER 계산에 쓰입니다.

   README 4번 REST API 표준 문법을 따릅니다.
     async 함수 + try / catch + console.error("...실패:", error)

   모달은 <dialog> 를 사용합니다.
     showModal()  열기 (배경 딤 / ESC / 포커스 트랩 자동)
     close()      닫기

   주의: <form method="dialog"> 를 쓰지 않습니다.
        자동으로 닫히면 API 요청을 보낼 수 없기 때문입니다.

   엔드포인트
     GET     /api/users/me              프로필 조회
     PUT     /api/users/me              프로필 수정 (FormData)
     PUT     /api/users/me/password     비밀번호 변경
     DELETE  /api/users/me              회원 탈퇴
     GET     /api/users/me/pets         반려견 목록
     POST    /api/pets                  반려견 등록 (FormData)
     PUT     /api/pets/:petId           반려견 수정 (FormData)
     DELETE  /api/pets/:petId           반려견 삭제
     GET     /api/breeds                품종 목록
   ============================================================ */

(function () {
  "use strict";

  var Api = window.TomopetApi;
  var Ui = window.TomopetUi;
  var Auth = window.TomopetAuth;
  var $ = Ui.$;

  /* 업로드 제한 - 서버에서도 반드시 재검증해야 함 (클라이언트 검증은 우회 가능) */
  var MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  var ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

  /* 비밀번호 규칙 - login.js 와 동일하게 유지 */
  var PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  var SEX_LABEL = { MALE: "남아", FEMALE: "여아" };
  var ACTIVITY_LABEL = { LOW: "활동량 낮음", MEDIUM: "활동량 보통", HIGH: "활동량 높음" };

  /* 화면 상태 - 서버가 준 값을 그대로 보관 */
  var state = {
    user: null,
    pets: [],
    editingPetId: null,   /* null 이면 등록, 값이 있으면 수정 */
    deletingPetId: null,
    allergies: [],        /* 모달에서 편집 중인 알레르기 배열 */
    photoFile: null,      /* 반려견 모달에서 고른 파일 */
    profilePhotoFile: null,
    previewUrl: null      /* createObjectURL 결과 - 해제 대상 */
  };


  /* ==========================================================
     생일 -> 나이 계산

     나이를 저장하지 않는 이유
       저장하면 매년 직접 고쳐야 하고, 아무도 고치지 않아
       1년 뒤 DER(하루 권장 칼로리) 계산이 틀어짐
     ========================================================== */

  function calcAge(birthDate) {
    if (!birthDate) return null;

    var birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;

    var now = new Date();
    var months = (now.getFullYear() - birth.getFullYear()) * 12 +
                 (now.getMonth() - birth.getMonth());

    /* 생일이 아직 안 지난 달이면 한 달 빼기 */
    if (now.getDate() < birth.getDate()) months -= 1;
    if (months < 0) return null;

    return { years: Math.floor(months / 12), months: months % 12 };
  }

  function formatAge(birthDate) {
    var age = calcAge(birthDate);
    if (!age) return null;

    if (age.years === 0) return age.months + "개월";
    if (age.months === 0) return age.years + "살";
    return age.years + "살 " + age.months + "개월";
  }


  /* ==========================================================
     모달 공통

     data-modal-close 가 붙은 버튼은 자동으로 부모 모달을 닫음
     ========================================================== */

  function openModal(modal) {
    modal.showModal();
  }

  function closeModal(modal) {
    modal.close();
  }

  function bindModalClose(modal) {
    Ui.$$("[data-modal-close]", modal).forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeModal(modal);
      });
    });
  }

  /* 미리보기 URL 해제 - 안 하면 이미지를 바꿀 때마다 메모리가 쌓임 */
  function revokePreview() {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = null;
    }
  }


  /* ==========================================================
     이미지 검증 + 미리보기
     ========================================================== */

  function validateImage(file) {
    if (ALLOWED_IMAGE_TYPES.indexOf(file.type) === -1) {
      return "JPG, PNG, WEBP 파일만 올릴 수 있어요.";
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return "5MB 이하 파일만 올릴 수 있어요.";
    }
    return null;
  }

  /* 아바타 요소에 이미지를 채움. url 이 없으면 이니셜 표시 */
  function renderAvatar(el, url, fallbackText) {
    Ui.clearChildren(el);

    if (url) {
      var img = document.createElement("img");
      img.src = url;
      img.alt = "";
      el.appendChild(img);
      return;
    }
    /* 사진이 없으면 첫 글자 - 사용자 입력이므로 textContent 로 */
    el.textContent = (fallbackText || "?").charAt(0);
  }

  function bindPhotoInput(inputEl, previewEl, messageEl, onPick) {
    inputEl.addEventListener("change", function () {
      var file = inputEl.files && inputEl.files[0];
      if (!file) return;

      var error = validateImage(file);
      if (error) {
        Ui.setFormMessage(messageEl, error, "danger");
        inputEl.value = "";
        return;
      }

      Ui.setFormMessage(messageEl, "");
      revokePreview();

      state.previewUrl = URL.createObjectURL(file);
      renderAvatar(previewEl, state.previewUrl, "");
      onPick(file);
    });
  }


  /* ==========================================================
     알레르기 태그 입력

     화면에서는 칩으로 보여주고 서버에는 배열로 보냄
     ========================================================== */

  function renderAllergyChips() {
    var box = $("pet-allergy-box");
    var input = $("pet-allergy-input");

    /* 입력창은 남기고 칩만 제거 */
    Ui.$$(".tag-chip", box).forEach(function (chip) {
      chip.remove();
    });

    state.allergies.forEach(function (name, index) {
      var chip = Ui.createEl("span", "tag-chip", name);

      var remove = Ui.createEl("button", "tag-chip__remove");
      remove.type = "button";
      remove.setAttribute("aria-label", name + " 삭제");
      remove.textContent = "×";
      remove.addEventListener("click", function () {
        state.allergies.splice(index, 1);
        renderAllergyChips();
        input.focus();
      });

      chip.appendChild(remove);
      box.insertBefore(chip, input);
    });
  }

  function addAllergy(value) {
    var name = value.trim();
    if (!name) return;
    /* 중복 방지 */
    if (state.allergies.indexOf(name) !== -1) return;

    state.allergies.push(name);
    renderAllergyChips();
  }

  function initAllergyInput() {
    var input = $("pet-allergy-input");

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        /* 폼 제출을 막고 태그만 추가 */
        event.preventDefault();
        addAllergy(input.value);
        input.value = "";
        return;
      }
      /* 입력창이 비었을 때 Backspace 로 마지막 칩 삭제 */
      if (event.key === "Backspace" && input.value === "" && state.allergies.length) {
        state.allergies.pop();
        renderAllergyChips();
      }
    });

    /* 쉼표로도 구분 - 붙여넣기 대응 */
    input.addEventListener("input", function () {
      if (input.value.indexOf(",") === -1) return;

      input.value.split(",").forEach(addAllergy);
      input.value = "";
    });
  }


  /* ==========================================================
     반려견 카드
     ========================================================== */

  function createPetCard(pet) {
    var li = Ui.createEl("li", "pet-card");

    var photo = Ui.createEl("span", "avatar avatar--xl pet-card__photo");
    photo.setAttribute("aria-hidden", "true");
    renderAvatar(photo, pet.imageUrl, pet.name);
    li.appendChild(photo);

    li.appendChild(Ui.createEl("p", "pet-card__name", pet.name || "이름 없음"));

    /* 품종 · 나이 · 성별 - 값이 없는 항목은 건너뜀
       나이는 저장값이 아니라 생일로 계산함 */
    var meta = [];
    if (pet.breed) meta.push(pet.breed);

    var ageText = formatAge(pet.birthDate);
    if (ageText) meta.push(ageText);

    if (SEX_LABEL[pet.sex]) meta.push(SEX_LABEL[pet.sex]);
    li.appendChild(Ui.createEl("p", "pet-card__meta", meta.join(" · ") || "정보 없음"));

    var actions = Ui.createEl("div", "pet-card__actions");

    var editBtn = Ui.createEl("button", "btn btn--secondary btn--sm", "수정");
    editBtn.type = "button";
    editBtn.addEventListener("click", function () {
      openPetModal(pet);
    });
    actions.appendChild(editBtn);

    var deleteBtn = Ui.createEl("button", "btn btn--danger btn--sm", "삭제");
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", pet.name + " 삭제");
    deleteBtn.addEventListener("click", function () {
      openDeleteModal(pet);
    });
    actions.appendChild(deleteBtn);

    li.appendChild(actions);
    return li;
  }

  /* 목록 끝에 붙는 등록 유도 카드 */
  function createAddCard() {
    var li = document.createElement("li");

    var btn = Ui.createEl("button", "pet-add-card");
    btn.type = "button";

    var circle = Ui.createEl("span", "pet-add-card__circle", "+");
    circle.setAttribute("aria-hidden", "true");
    btn.appendChild(circle);
    btn.appendChild(Ui.createEl("span", "", "아이 추가"));

    btn.addEventListener("click", function () {
      openPetModal(null);
    });

    li.appendChild(btn);
    return li;
  }

  function renderPets() {
    var list = $("pet-list");
    var empty = $("pet-empty");

    Ui.clearChildren(list);

    if (!state.pets.length) {
      /* 한 마리도 없으면 빈 상태만 노출 */
      Ui.toggleEmptyState(empty, false);
      list.hidden = true;
      return;
    }

    list.hidden = false;
    Ui.toggleEmptyState(empty, true);

    var fragment = document.createDocumentFragment();
    state.pets.forEach(function (pet) {
      fragment.appendChild(createPetCard(pet));
    });
    fragment.appendChild(createAddCard());
    list.appendChild(fragment);
  }


  /* ==========================================================
     데이터 로드
     ========================================================== */

  async function loadProfile() {
    try {
      var user = await Api.get("/api/users/me");
      state.user = user;

      $("profile-nickname").textContent = user.nickname || "-";
      $("profile-email").textContent = user.email || "-";
      renderAvatar($("profile-avatar"), user.profileImageUrl, user.nickname);
    } catch (error) {
      console.error("프로필 로딩 실패:", error);
      Ui.setFormMessage(
        $("page-message"),
        Api.toMessage(error, "내 정보를 불러오지 못했습니다."),
        "danger"
      );
    }
  }

  async function loadPets() {
    try {
      var data = await Api.get("/api/users/me/pets");
      state.pets = Api.toList(data);
      renderPets();
    } catch (error) {
      console.error("반려견 목록 로딩 실패:", error);
      /* 실패해도 화면이 깨지지 않도록 빈 상태를 노출 */
      state.pets = [];
      renderPets();
    }
  }

  /* 품종 자동완성 - 실패해도 직접 입력이 가능하므로 조용히 넘어감 */
  async function loadBreeds() {
    try {
      var data = await Api.get("/api/breeds");
      var list = Api.toList(data);
      var datalist = $("breed-options");

      Ui.clearChildren(datalist);
      list.forEach(function (breed) {
        var option = document.createElement("option");
        /* 문자열 배열과 객체 배열 모두 대응 */
        option.value = typeof breed === "string" ? breed : breed.name;
        datalist.appendChild(option);
      });
    } catch (error) {
      console.error("품종 목록 로딩 실패:", error);
    }
  }


  /* ==========================================================
     모달 1 - 반려견 등록 / 수정
     ========================================================== */

  function openPetModal(pet) {
    var modal = $("pet-modal");
    var form = $("pet-form");

    form.reset();
    Ui.setFormMessage($("pet-form-message"), "");
    Ui.setFieldError($("pet-name"), $("pet-name-error"), "");
    Ui.setFieldError($("pet-birth"), $("pet-birth-error"), "");
    Ui.setFieldError($("pet-weight"), $("pet-weight-error"), "");

    revokePreview();
    state.photoFile = null;
    state.editingPetId = pet ? pet.petId : null;
    state.allergies = pet && Array.isArray(pet.allergies) ? pet.allergies.slice() : [];

    $("pet-modal-title").textContent = pet ? "반려견 수정" : "반려견 등록";
    $("pet-save-btn").textContent = pet ? "수정" : "저장";

    if (pet) {
      $("pet-name").value = pet.name || "";
      $("pet-breed").value = pet.breed || "";
      $("pet-birth").value = pet.birthDate || "";
      $("pet-weight").value = pet.weight !== null && pet.weight !== undefined ? pet.weight : "";
      $("pet-neutered").checked = Boolean(pet.neutered);

      if (pet.sex === "MALE") $("pet-sex-male").checked = true;
      if (pet.sex === "FEMALE") $("pet-sex-female").checked = true;

      /* 활동량 - 값이 없으면 기본 MEDIUM */
      var activity = pet.activityLevel || "MEDIUM";
      var activityInput = $("pet-activity-" + activity.toLowerCase());
      if (activityInput) activityInput.checked = true;
    }

    renderAvatar($("pet-photo-preview"), pet ? pet.imageUrl : null, pet ? pet.name : "");
    renderAllergyChips();

    var ageText = pet ? formatAge(pet.birthDate) : null;
    $("pet-age-display").textContent = ageText ? "만 " + ageText : "모르면 비워두세요";

    openModal(modal);
    $("pet-name").focus();
  }

  function validatePetForm() {
    var valid = true;

    var name = $("pet-name").value.trim();
    if (!name) {
      Ui.setFieldError($("pet-name"), $("pet-name-error"), "이름을 입력해주세요.");
      valid = false;
    } else {
      Ui.setFieldError($("pet-name"), $("pet-name-error"), "");
    }

    /* 생일 - 미래 날짜와 비현실적으로 오래된 날짜를 막음 */
    var birth = $("pet-birth").value;
    if (birth) {
      var birthDate = new Date(birth);
      var now = new Date();
      var oldest = new Date();
      oldest.setFullYear(now.getFullYear() - 30);

      if (birthDate > now) {
        Ui.setFieldError($("pet-birth"), $("pet-birth-error"), "미래 날짜는 입력할 수 없어요.");
        valid = false;
      } else if (birthDate < oldest) {
        Ui.setFieldError($("pet-birth"), $("pet-birth-error"), "생일을 다시 확인해주세요.");
        valid = false;
      } else {
        Ui.setFieldError($("pet-birth"), $("pet-birth-error"), "");
      }
    } else {
      Ui.setFieldError($("pet-birth"), $("pet-birth-error"), "");
    }

    var weight = $("pet-weight").value;
    if (weight !== "" && (Number(weight) <= 0 || Number(weight) > 100)) {
      Ui.setFieldError($("pet-weight"), $("pet-weight-error"), "0에서 100 사이로 입력해주세요.");
      valid = false;
    } else {
      Ui.setFieldError($("pet-weight"), $("pet-weight-error"), "");
    }

    return valid;
  }

  function buildPetFormData() {
    var formData = new FormData();

    formData.append("name", $("pet-name").value.trim());
    formData.append("breed", $("pet-breed").value.trim());
    formData.append("neutered", $("pet-neutered").checked);

    /* 빈 문자열을 보내면 서버가 0 으로 오해할 수 있으므로 값이 있을 때만
       생일은 모를 수 있으므로(유기견 입양 등) 선택 항목 */
    var birth = $("pet-birth").value;
    if (birth !== "") formData.append("birthDate", birth);

    var weight = $("pet-weight").value;
    if (weight !== "") formData.append("weight", weight);

    var sex = document.querySelector("input[name='sex']:checked");
    if (sex) formData.append("sex", sex.value);

    /* 활동량 - DER 계산에 필요하므로 항상 전송 (기본 MEDIUM) */
    var activity = document.querySelector("input[name='activityLevel']:checked");
    formData.append("activityLevel", activity ? activity.value : "MEDIUM");

    /* 배열은 같은 키를 반복해서 보냄 - Spring 의 List<String> 에 바인딩됨
       비어 있으면 키 자체를 보내지 않아 서버가 빈 배열로 처리 */
    state.allergies.forEach(function (item) {
      formData.append("allergies", item);
    });

    /* 사진을 새로 고르지 않았으면 키를 넣지 않음 - 기존 사진 유지 */
    if (state.photoFile) formData.append("image", state.photoFile);

    return formData;
  }

  function initPetModal() {
    var modal = $("pet-modal");
    var form = $("pet-form");

    bindModalClose(modal);
    initAllergyInput();

    bindPhotoInput(
      $("pet-photo-input"),
      $("pet-photo-preview"),
      $("pet-form-message"),
      function (file) { state.photoFile = file; }
    );

    /* 모달이 닫힐 때 미리보기 URL 정리 */
    modal.addEventListener("close", revokePreview);

    /* 생일을 고르면 계산된 나이를 힌트에 표시 */
    $("pet-birth").addEventListener("change", function () {
      var ageText = formatAge($("pet-birth").value);
      $("pet-age-display").textContent = ageText ? "만 " + ageText : "모르면 비워두세요";
    });

    $("add-pet-btn").addEventListener("click", function () {
      openPetModal(null);
    });
    $("pet-empty-add-btn").addEventListener("click", function () {
      openPetModal(null);
    });

    form.addEventListener("submit", async function (event) {
      /* 없으면 페이지가 새로고침되며 입력값이 사라짐 */
      event.preventDefault();

      if (!validatePetForm()) {
        Ui.focusFirstError(form);
        return;
      }

      var saveBtn = $("pet-save-btn");
      Ui.setLoading(saveBtn, true, "저장 중...");

      try {
        var formData = buildPetFormData();

        if (state.editingPetId) {
          await Api.upload("/api/pets/" + encodeURIComponent(state.editingPetId), formData, { method: "PUT" });
        } else {
          await Api.upload("/api/pets", formData);
        }

        closeModal(modal);
        await loadPets();
      } catch (error) {
        console.error("반려견 저장 실패:", error);
        Ui.setFormMessage(
          $("pet-form-message"),
          Api.toMessage(error, "저장하지 못했습니다."),
          "danger"
        );
      } finally {
        Ui.setLoading(saveBtn, false);
      }
    });
  }


  /* ==========================================================
     모달 2 - 반려견 삭제 확인
     ========================================================== */

  function openDeleteModal(pet) {
    state.deletingPetId = pet.petId;

    Ui.setFormMessage($("pet-delete-message"), "");
    /* 이름은 사용자 입력이므로 textContent 로 삽입 */
    $("pet-delete-desc").textContent =
      pet.name + " 를 정말 삭제할까요? 건강 기록도 함께 사라지며 되돌릴 수 없어요.";

    openModal($("pet-delete-modal"));
  }

  function initDeleteModal() {
    var modal = $("pet-delete-modal");
    bindModalClose(modal);

    $("pet-delete-confirm-btn").addEventListener("click", async function () {
      var btn = $("pet-delete-confirm-btn");
      Ui.setLoading(btn, true, "삭제 중...");

      try {
        await Api.del("/api/pets/" + encodeURIComponent(state.deletingPetId));
        closeModal(modal);
        await loadPets();
      } catch (error) {
        console.error("반려견 삭제 실패:", error);
        Ui.setFormMessage(
          $("pet-delete-message"),
          Api.toMessage(error, "삭제하지 못했습니다."),
          "danger"
        );
      } finally {
        Ui.setLoading(btn, false);
      }
    });
  }


  /* ==========================================================
     모달 3 - 프로필 수정
     ========================================================== */

  function initProfileModal() {
    var modal = $("profile-modal");
    var form = $("profile-form");

    bindModalClose(modal);
    modal.addEventListener("close", revokePreview);

    bindPhotoInput(
      $("profile-photo-input"),
      $("profile-photo-preview"),
      $("profile-form-message"),
      function (file) { state.profilePhotoFile = file; }
    );

    $("edit-profile-btn").addEventListener("click", function () {
      if (!state.user) return;

      form.reset();
      Ui.setFormMessage($("profile-form-message"), "");
      Ui.setFieldError($("profile-nickname-input"), $("profile-nickname-error"), "");

      revokePreview();
      state.profilePhotoFile = null;

      $("profile-nickname-input").value = state.user.nickname || "";
      $("profile-email-input").value = state.user.email || "";
      renderAvatar($("profile-photo-preview"), state.user.profileImageUrl, state.user.nickname);

      openModal(modal);
      $("profile-nickname-input").focus();
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var nickname = $("profile-nickname-input").value.trim();
      if (nickname.length < 2 || nickname.length > 12) {
        Ui.setFieldError(
          $("profile-nickname-input"),
          $("profile-nickname-error"),
          "닉네임은 2자 이상 12자 이하로 입력해주세요."
        );
        $("profile-nickname-input").focus();
        return;
      }
      Ui.setFieldError($("profile-nickname-input"), $("profile-nickname-error"), "");

      var saveBtn = $("profile-save-btn");
      Ui.setLoading(saveBtn, true, "저장 중...");

      try {
        var formData = new FormData();
        formData.append("nickname", nickname);
        if (state.profilePhotoFile) formData.append("image", state.profilePhotoFile);

        var updated = await Api.upload("/api/users/me", formData, { method: "PUT" });

        /* 헤더의 프로필 표시도 갱신되도록 세션을 덮어씀 */
        Auth.setSession(Auth.getToken(), updated);

        closeModal(modal);
        await loadProfile();
      } catch (error) {
        console.error("프로필 수정 실패:", error);

        /* 409 는 닉네임 중복 */
        if (error.status === 409) {
          Ui.setFieldError(
            $("profile-nickname-input"),
            $("profile-nickname-error"),
            "이미 사용 중인 닉네임입니다."
          );
        } else {
          Ui.setFormMessage(
            $("profile-form-message"),
            Api.toMessage(error, "저장하지 못했습니다."),
            "danger"
          );
        }
      } finally {
        Ui.setLoading(saveBtn, false);
      }
    });
  }


  /* ==========================================================
     모달 4 - 비밀번호 변경

     비밀번호 찾기와 다릅니다.
     로그인 상태이므로 현재 비밀번호 확인이 필요합니다.
     ========================================================== */

  function validatePasswordForm() {
    var valid = true;

    var current = $("current-password").value;
    if (!current) {
      Ui.setFieldError($("current-password"), $("current-password-error"), "현재 비밀번호를 입력해주세요.");
      valid = false;
    } else {
      Ui.setFieldError($("current-password"), $("current-password-error"), "");
    }

    var next = $("new-password").value;
    if (!PASSWORD_PATTERN.test(next)) {
      Ui.setFieldError(
        $("new-password"),
        $("new-password-error"),
        "8자 이상, 영문·숫자·특수문자를 포함해주세요."
      );
      valid = false;
    } else if (next === current) {
      Ui.setFieldError($("new-password"), $("new-password-error"), "현재 비밀번호와 다르게 설정해주세요.");
      valid = false;
    } else {
      Ui.setFieldError($("new-password"), $("new-password-error"), "");
    }

    if ($("new-password-confirm").value !== next) {
      Ui.setFieldError($("new-password-confirm"), $("new-password-confirm-error"), "비밀번호가 일치하지 않아요.");
      valid = false;
    } else {
      Ui.setFieldError($("new-password-confirm"), $("new-password-confirm-error"), "");
    }

    return valid;
  }

  function initPasswordModal() {
    var modal = $("password-modal");
    var form = $("password-form");

    bindModalClose(modal);

    $("change-password-btn").addEventListener("click", function () {
      form.reset();
      Ui.setFormMessage($("password-form-message"), "");
      Ui.setFieldError($("current-password"), $("current-password-error"), "");
      Ui.setFieldError($("new-password"), $("new-password-error"), "");
      Ui.setFieldError($("new-password-confirm"), $("new-password-confirm-error"), "");

      openModal(modal);
      $("current-password").focus();
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!validatePasswordForm()) {
        Ui.focusFirstError(form);
        return;
      }

      var saveBtn = $("password-save-btn");
      Ui.setLoading(saveBtn, true, "변경 중...");

      try {
        /* 여기서의 401 은 토큰 만료가 아니라 현재 비밀번호 오류이므로
           api.js 의 자동 리다이렉트를 끔 */
        await Api.put(
          "/api/users/me/password",
          {
            currentPassword: $("current-password").value,
            newPassword: $("new-password").value
          },
          { skipAuthRedirect: true }
        );

        closeModal(modal);
        Ui.setFormMessage($("page-message"), "비밀번호가 변경되었습니다.", "success");
      } catch (error) {
        console.error("비밀번호 변경 실패:", error);

        /* 401/400 은 현재 비밀번호 불일치 */
        if (error.status === 401 || error.status === 400) {
          Ui.setFieldError(
            $("current-password"),
            $("current-password-error"),
            "현재 비밀번호가 올바르지 않습니다."
          );
          $("current-password").focus();
        } else {
          Ui.setFormMessage(
            $("password-form-message"),
            Api.toMessage(error, "변경하지 못했습니다."),
            "danger"
          );
        }
      } finally {
        Ui.setLoading(saveBtn, false);
      }
    });
  }


  /* ==========================================================
     모달 5 - 회원 탈퇴

     되돌릴 수 없으므로 confirm() 대신 닉네임 입력으로 확인
     ========================================================== */

  function initWithdrawModal() {
    var modal = $("withdraw-modal");
    var form = $("withdraw-form");
    var input = $("withdraw-confirm-input");
    var confirmBtn = $("withdraw-confirm-btn");

    bindModalClose(modal);

    $("withdraw-btn").addEventListener("click", function () {
      if (!state.user) return;

      form.reset();
      Ui.setFormMessage($("withdraw-form-message"), "");
      Ui.setFieldError(input, $("withdraw-error"), "");
      confirmBtn.disabled = true;

      /* 닉네임은 사용자 입력이므로 textContent 로 */
      $("withdraw-nickname-hint").textContent = state.user.nickname || "";

      openModal(modal);
      input.focus();
    });

    /* 닉네임이 정확히 일치할 때만 버튼 활성화 */
    input.addEventListener("input", function () {
      var expected = state.user ? state.user.nickname : "";
      confirmBtn.disabled = input.value.trim() !== expected;
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var expected = state.user ? state.user.nickname : "";
      if (input.value.trim() !== expected) {
        Ui.setFieldError(input, $("withdraw-error"), "닉네임이 일치하지 않아요.");
        return;
      }

      Ui.setLoading(confirmBtn, true, "처리 중...");

      try {
        await Api.del("/api/users/me");

        /* 세션을 지우고 홈으로 - 뒤로가기로 돌아올 수 없도록 replace */
        Auth.clearSession();
        window.location.replace("./index.html");
      } catch (error) {
        console.error("회원 탈퇴 실패:", error);
        Ui.setFormMessage(
          $("withdraw-form-message"),
          Api.toMessage(error, "탈퇴 처리에 실패했습니다."),
          "danger"
        );
        Ui.setLoading(confirmBtn, false);
      }
    });
  }


  /* ==========================================================
     로그아웃
     ========================================================== */

  function initLogout() {
    $("logout-btn").addEventListener("click", function () {
      Auth.logout();
    });
  }


  /* ==========================================================
     초기화
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    /* 로그인 필수 페이지 - 비로그인이면 로그인 화면으로 이동 */
    if (!Auth.requireAuth()) return;

    initPetModal();
    initDeleteModal();
    initProfileModal();
    initPasswordModal();
    initWithdrawModal();
    initLogout();

    /* 세 요청은 서로 독립적이므로 병렬로 보냄
       각 로더가 자체적으로 try / catch 하므로
       하나가 실패해도 나머지는 정상 렌더링됨 */
    loadProfile();
    loadPets();
    loadBreeds();
  });

  /* 페이지를 떠날 때 남은 미리보기 URL 정리 */
  window.addEventListener("pagehide", revokePreview);
})();
