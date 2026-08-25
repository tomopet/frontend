/* ============================================================
   TOMOPET | scripts/breed-standards.js
   검색 키워드: 품종, 표준체중, 비만도, 급여량, 칼로리, RER, MER, 계산

   품종별 표준체중과 급여량/비만도 계산 로직입니다.

   [확인 필요] 품종 표준체중은 임시(mock) 데이터입니다.
     백엔드 /api/breeds/standards 연동 시 이 표를 대체하세요.
     계산 공식(RER/MER)은 수의학 표준이므로 백엔드도 동일하게 써야 합니다.

   표준체중 출처: 각 품종 견종표준(FCI/KC) 성견 평균 범위의 중앙값.
   국내 반려견 등록 상위 품종 위주로 우선 수록.
   ============================================================ */

(function () {
  "use strict";

  /* 품종 표준체중(kg) - [min, max] 성견 기준
     key 는 소문자 영문/한글 모두 허용하도록 조회 시 정규화 */
  var BREED_WEIGHTS = {
    "말티즈": [2.0, 3.5],
    "푸들": [3.0, 6.0],          /* 토이~미니어처 기준 (스탠다드 제외) */
    "포메라니안": [1.9, 3.5],
    "시츄": [4.0, 7.2],
    "치와와": [1.5, 3.0],
    "요크셔테리어": [2.0, 3.2],
    "비숑프리제": [5.0, 8.0],
    "웰시코기": [10.0, 14.0],
    "닥스훈트": [4.0, 9.0],       /* 미니어처~스탠다드 폭 넓음 */
    "골든리트리버": [25.0, 34.0],
    "래브라도리트리버": [25.0, 36.0],
    "진돗개": [15.0, 23.0],
    "비글": [9.0, 14.0],
    "보더콜리": [14.0, 20.0],
    "시바견": [8.0, 11.0],
    "코커스패니얼": [12.0, 16.0],
    "프렌치불독": [8.0, 14.0],
    "슈나우저": [5.4, 9.1],       /* 미니어처 기준 */
    "페키니즈": [3.2, 6.4],
    "파피용": [2.3, 4.5]
  };

  /* 표준이 없는 경우(믹스견/기타) 판정을 건너뛰기 위한 표시 */
  var UNKNOWN_BREED = null;

  /* ----------------------------------------------------------
     체중 → 하루 필요 열량 (수의학 표준)
       RER = 70 × 체중^0.75
       MER = RER × 활동계수
     활동계수 기본값 1.6 (중성화한 성견) - 추후 프로필에서 조정
     ---------------------------------------------------------- */

  var ACTIVITY_FACTOR_DEFAULT = 1.6;

  function calcRER(weightKg) {
    return 70 * Math.pow(weightKg, 0.75);
  }

  function calcMER(weightKg, activityFactor) {
    var factor = activityFactor || ACTIVITY_FACTOR_DEFAULT;
    return calcRER(weightKg) * factor;
  }

  /* ----------------------------------------------------------
     품종 조회 - 표준체중 [min, max] 또는 null
     ---------------------------------------------------------- */

  function getStandardWeight(breed) {
    if (!breed) return UNKNOWN_BREED;
    var key = String(breed).replace(/\s/g, "");
    return BREED_WEIGHTS[key] || UNKNOWN_BREED;
  }

  /* ----------------------------------------------------------
     비만도 판정 - 현재 체중을 품종 표준 범위와 비교

     표준 중앙값 대비 비율로 판정
       85% 미만    저체중 (under)
       85 ~ 115%   적정   (normal)
       115% 초과   과체중 (over)
     표준 없으면 status: "unknown"
     ---------------------------------------------------------- */

  function assessBodyCondition(weightKg, breed) {
    var std = getStandardWeight(breed);
    if (!std) {
      return { status: "unknown", ratio: null, standardMid: null };
    }
    var mid = (std[0] + std[1]) / 2;
    var ratio = weightKg / mid;
    var status;
    if (ratio < 0.85) status = "under";
    else if (ratio > 1.15) status = "over";
    else status = "normal";
    return { status: status, ratio: ratio, standardMid: mid, standardRange: std };
  }

  /* ----------------------------------------------------------
     급여 평균 판정 - 최근 평균 섭취 열량을 MER 과 비교

       90% 미만    부족 (under)
       90 ~ 110%   적정 (normal)
       110% 초과   과다 (over)
     ---------------------------------------------------------- */

  function assessCalorieIntake(avgKcal, weightKg, activityFactor) {
    var mer = calcMER(weightKg, activityFactor);
    var ratio = avgKcal / mer;
    var status;
    if (ratio < 0.9) status = "under";
    else if (ratio > 1.1) status = "over";
    else status = "normal";
    return { status: status, ratio: ratio, mer: Math.round(mer) };
  }

  /* 다른 스크립트에서 쓰도록 전역으로 노출 (프로젝트 공통 방식) */
  window.TomopetBreedStandards = {
    getStandardWeight: getStandardWeight,
    calcRER: calcRER,
    calcMER: calcMER,
    assessBodyCondition: assessBodyCondition,
    assessCalorieIntake: assessCalorieIntake,
    ACTIVITY_FACTOR_DEFAULT: ACTIVITY_FACTOR_DEFAULT,
    knownBreeds: function () { return Object.keys(BREED_WEIGHTS); }
  };
})();
