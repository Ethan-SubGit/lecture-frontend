import {
  ALLOWED_EXCEL_EXTENSIONS,
  MAX_SCORE,
  MIN_SCORE,
  TERM_CODE_PATTERN,
} from "./constants";

/**
 * 폼 검증 순수 함수 모음.
 *
 * 서버 검증(400/409)에 앞서 클라이언트가 선제적으로 같은 규칙을 적용해
 * 불필요한 왕복을 줄인다. 서버가 최종 판정자라는 사실은 변하지 않는다.
 */

/**
 * 필수 입력값이 비어 있는지 검사한다.
 *
 * @param value 검사할 문자열
 * @param label 메시지에 넣을 필드 이름 (예: "강의명")
 * @returns 에러 메시지. 통과하면 undefined
 */
export function validateRequired(
  value: string,
  label: string,
): string | undefined {
  return value.trim() ? undefined : `${label}은(는) 필수입니다.`;
}

/**
 * 학기 코드 형식을 검사한다. 빈 값은 선택 입력이므로 통과시킨다.
 *
 * 규칙은 OpenAPI 설명문에서 유도한 것이며 서버가 정규식으로 강제하는지는
 * 확인되지 않았다 (spec.md 가정 12). 서버와 어긋나면 이 규칙을 완화한다.
 *
 * @param term 학기 코드
 * @returns 에러 메시지. 통과하면 undefined
 */
export function validateTermCode(term: string): string | undefined {
  if (!term.trim()) return undefined;
  return TERM_CODE_PATTERN.test(term.trim())
    ? undefined
    : "학기 코드는 YY10/YY11/YY20/YY21 형식의 4자리입니다.";
}

/**
 * 백분위 점수(0~100) 범위를 검사한다.
 *
 * @param value 입력값 (문자열 상태 그대로 받는다)
 * @param label 필드 이름
 * @returns 에러 메시지. 통과하면 undefined
 */
export function validateScoreRange(
  value: string,
  label: string,
): string | undefined {
  if (!value.trim()) return `${label}은(는) 필수입니다.`;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return `${label}은(는) 숫자여야 합니다.`;
  if (parsed < MIN_SCORE || parsed > MAX_SCORE) {
    return `${label}은(는) ${MIN_SCORE}~${MAX_SCORE} 사이여야 합니다.`;
  }
  return undefined;
}

/**
 * 평점(gpa)을 검사한다. 0 이상이어야 한다.
 *
 * @param value 입력값
 * @returns 에러 메시지. 통과하면 undefined
 */
export function validateGpa(value: string): string | undefined {
  if (!value.trim()) return "평점은(는) 필수입니다.";

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return "평점은(는) 숫자여야 합니다.";
  if (parsed < 0) return "평점은 0 이상이어야 합니다.";
  return undefined;
}

/**
 * 업로드 파일의 확장자가 허용 목록에 있는지 검사한다.
 *
 * accept 속성만으로는 사용자가 "모든 파일"을 골라 우회할 수 있으므로
 * 제출 전에 한 번 더 검증한다 (수용 기준: 요청을 보내지 않는다).
 *
 * @param fileName 파일 이름
 * @returns 에러 메시지. 통과하면 undefined
 */
export function validateExcelExtension(fileName: string): string | undefined {
  const lowerCased = fileName.toLowerCase();
  const isAllowed = ALLOWED_EXCEL_EXTENSIONS.some((extension) =>
    lowerCased.endsWith(extension),
  );
  return isAllowed
    ? undefined
    : "xlsx 또는 xls 파일만 업로드할 수 있습니다.";
}
