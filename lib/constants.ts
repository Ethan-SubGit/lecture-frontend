/**
 * 애플리케이션 전역 상수.
 * 매직 넘버·매직 문자열을 코드에 흩뿌리지 않기 위해 한곳에 모은다.
 */

/** 인증 토큰을 담는 쿠키 이름. middleware(서버)와 fetch 래퍼(클라이언트)가 공유한다. */
export const ACCESS_TOKEN_COOKIE = "access_token";

/** 로그인 화면 경로. */
export const LOGIN_PATH = "/login";

/** 로그인 후 기본 착지 경로. next 파라미터가 없거나 안전하지 않을 때 사용한다. */
export const DEFAULT_AUTHED_PATH = "/dashboard";

/** 로그인 리다이렉트에 쓰는 쿼리 파라미터 이름. */
export const NEXT_QUERY_KEY = "next";
export const REASON_QUERY_KEY = "reason";

/** 세션 만료로 로그인 화면에 도달했음을 표시하는 reason 값. */
export const EXPIRED_REASON = "expired";

/** 성적 조회 기본 페이지 크기와 선택 가능한 값 (spec.md 5.3 / 수용 기준). */
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

/** 클라이언트 목록(강의/학과/학점환산기준)의 페이지 크기. 서버 페이지네이션이 없어 프론트에서 자른다. */
export const CLIENT_PAGE_SIZE = 20;

/** 업로드 허용 확장자 (spec.md 5.2 / 가정 7). */
export const ALLOWED_EXCEL_EXTENSIONS = [".xlsx", ".xls"] as const;

/** 학기 코드 형식: YY10 / YY11 / YY20 / YY21 의 4자리 (spec.md 가정 12). */
export const TERM_CODE_PATTERN = /^\d{2}(10|11|20|21)$/;

/** 서버가 term 미입력 시 적용하는 기본 학기 코드. 화면 안내에 사용한다. */
export const DEFAULT_TERM_CODE = "2610";

/** 백분위 점수의 허용 범위. */
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;

/** GPA 최대값 (4.5 만점 체계). */
export const MAX_GPA = 4.5;

/**
 * 대시보드 확장 분석에서 **항상 명시적으로 전송**하는 표시 분량 파라미터 (spec.md 5.5).
 *
 * 서버 기본값과 같더라도 명시 전송한다 — 화면 문구가 서버 기본값 변경에 흔들리지 않게 하기 위함이다.
 * 나머지 파라미터(bucketSize·minStudentCount·breakdown·averageBelow·failCountAtLeast)는
 * 보내지 않고 서버 기본값을 그대로 쓰며, 문구도 응답값을 출력한다.
 */
export const STUDENT_RANKING_LIMIT = 10;
/** 위험군은 서버 기본 50이 대시보드 한 섹션에 붙이기엔 너무 길어 20으로 줄인다 (spec.md 가정 26). */
export const AT_RISK_STUDENTS_LIMIT = 20;

/**
 * 성적 엑셀 다운로드 전 확인 모달을 띄우는 건수 임계값 (spec.md 5.8 (다)).
 *
 * **측정값이 아니라 판단값이다** — "한 강의 수강생"으로는 비정상적으로 크고
 * "전교 성적 대장"으로는 있을 수 있는 규모라는 기준에서 정했다.
 * 하드 상한은 두지 않는다("전체를 받고 싶다"는 요구를 정면으로 거스르기 때문).
 */
export const EXCEL_EXPORT_CONFIRM_THRESHOLD = 5000;

/** 내보낼 성적 엑셀의 시트 이름 (spec.md 5.7 (나)). */
export const EXCEL_EXPORT_SHEET_NAME = "성적목록";

/** 공통 에러 문구 (spec.md 6절). */
export const NETWORK_ERROR_MESSAGE =
  "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";

/** 토스트 자동 소멸 시간(ms). success/info 만 자동 소멸하고 error 는 수동 닫기다. */
export const TOAST_AUTO_DISMISS_MS = 3000;

/** 스켈레톤 깜빡임 방지용 지연(ms). 이보다 빨리 끝나는 로딩은 스켈레톤을 띄우지 않는다. */
export const SKELETON_DELAY_MS = 200;

/**
 * 데스크탑 셸(상시 사이드바) 기준 미디어 쿼리. Tailwind 의 `lg` 브레이크포인트와 같은 값이다.
 * 이 폭 이상으로 넓어지면 내비 드로어를 강제로 닫아야 body 스크롤 잠금이 남지 않는다.
 */
export const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
