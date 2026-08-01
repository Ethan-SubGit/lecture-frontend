/**
 * 표시용 포매팅 순수 함수 모음.
 * 화면 컴포넌트가 날짜/숫자 포맷 로직을 각자 갖지 않도록 여기에 모은다.
 */

/** 값이 없을 때 표시하는 대체 문자 (design.md 4.18). */
export const EMPTY_VALUE_PLACEHOLDER = "—";

/**
 * ISO date-time 문자열을 `2026. 3. 2.` 형태의 한국 날짜로 바꾼다.
 *
 * @param iso ISO 8601 문자열. null/undefined 허용
 * @returns 포맷된 날짜. 값이 없거나 파싱 불가면 대체 문자
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return EMPTY_VALUE_PLACEHOLDER;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE_PLACEHOLDER;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * ISO date-time 문자열을 날짜+시각으로 바꾼다. 상세 화면의 생성/수정일에 사용한다.
 *
 * @param iso ISO 8601 문자열
 * @returns 포맷된 일시. 값이 없거나 파싱 불가면 대체 문자
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return EMPTY_VALUE_PLACEHOLDER;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE_PLACEHOLDER;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * 숫자를 고정 소수 자릿수로 표시한다. 평균 점수·GPA 처럼 자릿수를 맞춰야 하는 값에 쓴다.
 *
 * @param value 숫자. null/undefined 면 대체 문자
 * @param digits 소수 자릿수 (기본 1)
 * @returns 포맷된 문자열
 */
export function formatNumber(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  return value.toFixed(digits);
}

/**
 * 정수를 천단위 구분자와 함께 표시한다 (건수·인원수).
 *
 * @param value 숫자
 * @returns "1,234" 형태 문자열
 */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  return new Intl.NumberFormat("ko-KR").format(value);
}

/**
 * 파일 크기를 사람이 읽는 단위로 바꾼다 (업로드 파일 칩 표시용).
 *
 * @param bytes 바이트 수
 * @returns "1.2 MB" 형태 문자열
 */
export function formatFileSize(bytes: number): string {
  const KILO = 1024;
  if (bytes < KILO) return `${bytes} B`;
  if (bytes < KILO * KILO) return `${(bytes / KILO).toFixed(1)} KB`;
  return `${(bytes / (KILO * KILO)).toFixed(1)} MB`;
}

/**
 * 학기 코드 뒷 2자리 → 학기 라벨.
 * `formatTerm`(표·캡션용)과 `formatTermShort`(차트 축용)가 **같은 상수 하나**를 공유한다.
 * 두 벌로 갈라지면 같은 학기가 화면 위치에 따라 다르게 읽히기 때문이다 (design.md 4.27.1).
 */
const SEMESTER_LABELS: Record<string, { full: string; short: string }> = {
  "10": { full: "1학기", short: "1" },
  "11": { full: "여름 계절학기", short: "여름" },
  "20": { full: "2학기", short: "2" },
  "21": { full: "겨울 계절학기", short: "겨울" },
};

/** 학기 코드의 길이. 이 길이가 아니면 규칙 밖 값으로 보고 원문을 그대로 보여준다. */
const TERM_CODE_LENGTH = 4;

/**
 * 학기 코드를 사람이 읽는 라벨로 바꾼다.
 * 코드 규칙: YY10=1학기 / YY11=계절(여름) / YY20=2학기 / YY21=계절(겨울)
 *
 * @param term 4자리 학기 코드
 * @returns "26년 1학기 (2610)" 형태. 규칙에 맞지 않으면 코드 원문 그대로
 */
export function formatTerm(term: string | null | undefined): string {
  if (!term) return EMPTY_VALUE_PLACEHOLDER;

  const semester = SEMESTER_LABELS[term.slice(2)];
  // 규칙을 벗어난 값을 서버가 줄 수도 있으므로 라벨을 못 찾으면 원문을 그대로 보여준다.
  if (term.length !== TERM_CODE_LENGTH || !semester) return term;

  return `${term.slice(0, 2)}년 ${semester.full} (${term})`;
}

/**
 * 학기 코드를 차트 x축용 짧은 라벨로 바꾼다 (design.md 4.27.1).
 *
 * `formatTerm`의 결과("26년 1학기 (2610)")는 차트 축에 절대 들어가지 않는다.
 * 정보 손실이 아니다 — 전체 라벨은 차트 아래 학기 표와 `figcaption` 에 그대로 있다.
 *
 * @param term 4자리 학기 코드
 * @returns "26-1" / "26-여름" 형태. 규칙에 맞지 않으면 코드 원문 그대로
 */
export function formatTermShort(term: string | null | undefined): string {
  if (!term) return EMPTY_VALUE_PLACEHOLDER;

  const semester = SEMESTER_LABELS[term.slice(2)];
  if (term.length !== TERM_CODE_LENGTH || !semester) return term;

  return `${term.slice(0, 2)}-${semester.short}`;
}
