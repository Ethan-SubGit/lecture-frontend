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

/** 이름을 가리는 문자. 반각 별표 1글자로 고정한다(전각 ＊를 쓰지 않는다). */
export const NAME_MASK_CHAR = "*";

/**
 * 마스킹 기본 위치 — "두 번째 글자"(0-based index 1).
 * 이름 길이와 무관하게 이 위치로 고정한다 (spec.md 5.6 (다) / 가정 38).
 * 복성(`남궁민수`)을 판별하려면 성씨 사전이 필요하고, 사전에 없는 성이 틀리게 처리된다.
 * 규칙이 하나여야 사용자가 "어느 글자가 가려졌는지" 예측할 수 있다.
 */
const NAME_MASK_INDEX = 1;

/**
 * 학생 이름의 한 글자를 `*`로 가린다 (spec.md 5.6).
 *
 * **렌더 직전의 표시 변환 전용이다.** 검색·정렬 파라미터와 엑셀 내보내기에는
 * 원본 이름을 그대로 쓴다 — 데이터 계층에서 가리면 다운로드와 검색이 동시에 깨진다.
 *
 * 규칙:
 * - 앞뒤 공백을 제거한 뒤 적용한다.
 * - **코드 포인트 단위**로 센다. UTF-16 코드 유닛 인덱싱(`name[1]`)을 쓰면
 *   상용구 밖 한자(SIP 평면)나 이모지가 반 토막 나 깨진 문자(U+FFFD)가 출력된다.
 *   이름은 엑셀 업로드로 들어온 자유 문자열이라 무엇이든 올 수 있다.
 * - 예외 A: 1글자 이름은 그 한 글자를 가린다(가장 짧은 이름이야말로 가려야 한다).
 * - 예외 B: 가릴 자리가 공백이면 오른쪽으로 이동해 첫 비공백 문자를 가린다.
 *   공백을 `*`로 바꾸면 원래 없던 글자가 생긴 것처럼 보인다.
 * - 가리는 글자 수는 항상 정확히 1개이고 `*` 1개로 치환하므로 **글자 수가 보존된다**
 *   (표의 열 폭이 마스킹 전후로 변하지 않는다).
 *
 * @param name 원본 이름. null/undefined 허용
 * @returns 마스킹된 이름. 값이 없거나 공백뿐이면 EMPTY_VALUE_PLACEHOLDER("—")
 */
export function maskStudentName(name: string | null | undefined): string {
  if (!name) return EMPTY_VALUE_PLACEHOLDER;

  const trimmed = name.trim();
  if (trimmed === "") return EMPTY_VALUE_PLACEHOLDER;

  // 코드 포인트 배열로 다룬다. 서로게이트 페어를 한 글자로 취급하기 위한 유일한 방법이다.
  const characters = Array.from(trimmed);

  // 예외 A — 1글자 이름은 index 1 이 존재하지 않으므로 유일한 글자(index 0)를 가린다.
  let targetIndex = characters.length === 1 ? 0 : NAME_MASK_INDEX;

  // 예외 B — 공백은 절대 마스킹 대상이 아니다. 오른쪽으로 첫 비공백 문자를 찾는다.
  while (targetIndex < characters.length && characters[targetIndex].trim() === "") {
    targetIndex += 1;
  }

  // 오른쪽에 비공백이 없으면(트림했으므로 실제로는 도달하지 않는다) 가리지 않고 원문을 돌려준다.
  if (targetIndex >= characters.length) return trimmed;

  characters[targetIndex] = NAME_MASK_CHAR;
  return characters.join("");
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
