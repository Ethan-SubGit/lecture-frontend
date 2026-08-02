import type { Column } from "write-excel-file/browser";
import { EXCEL_EXPORT_SHEET_NAME } from "@/lib/constants";
import { formatTerm } from "@/lib/format";
import type { StudentScore } from "@/types/api";

/**
 * 성적 목록 `.xlsx` 생성 (spec.md 5.7).
 *
 * ⚠️ **이 파일의 `이름` 열에는 마스킹하지 않은 실명이 들어간다.**
 * 화면은 `maskStudentName` 으로 가리지만 파일은 가리지 않는다 — 버그가 아니라
 * 사용자가 확정한 트레이드오프다(spec.md 2.2 (가) / 가정 33·36).
 * 담당자는 성적 대장을 학사 처리·통보에 써야 하고, 마스킹된 명단은 그 용도로 쓸 수 없다.
 * 따라서 **이 모듈 어디에도 `maskStudentName` 을 부르지 않는다.**
 *
 * 엑셀 라이브러리(`write-excel-file`)는 **동적 import** 로 클릭 시점에만 로드한다.
 * 이 프로젝트 유일의 도메인 런타임 의존성이라 첫 화면 번들에 섞이면 안 되고,
 * 로드 시간은 「목록 불러오는 중…」 단계에 자연스럽게 흡수된다(spec.md 5.7 (가)).
 */

/** 점수 열(중간고사·중간과제·기말고사·기말과제)의 셀 서식 — 소수 0자리. */
const SCORE_NUMBER_FORMAT = "0";

/** 합계 열의 셀 서식 — 소수 1자리(화면 표시와 동일). */
const TOTAL_SCORE_NUMBER_FORMAT = "0.0";

/**
 * 파일명 금지 문자(Windows/macOS `\ / : * ? " < > |`)와 제어문자(U+0000~U+001F).
 * 강의명은 사용자 입력이라 `자료구조 1/2` 같은 값이 실제로 존재할 수 있고,
 * 슬래시가 남으면 저장이 실패하거나 경로로 해석된다.
 */
const FORBIDDEN_FILE_NAME_CHARS = /[\\/:*?"<>|\u0000-\u001F]/g;

/** 파일명 세그먼트(강의명)의 최대 길이. */
const MAX_LECTURE_SEGMENT_LENGTH = 50;

/** 전체 파일명(확장자 포함)의 최대 길이. */
const MAX_FILE_NAME_LENGTH = 200;

/** 학기가 2개 이상 섞였을 때 파일명에 쓰는 값 (spec.md 5.7 (다)). */
const MIXED_TERM_SEGMENT = "여러학기";

/**
 * 숫자 셀 1개를 만든다.
 *
 * 값이 없으면 **빈 셀**로 둔다. 화면의 대체 문자 `—` 를 넣지 않는다 —
 * 숫자 열에 `—` 가 섞이면 그 열 전체가 텍스트 열로 취급되어 SUM·정렬이 죽는다.
 *
 * @param value 점수. null/undefined 허용
 * @param format 엑셀 셀 서식 문자열
 * @returns write-excel-file 셀 정의
 */
function numberCell(value: number | null | undefined, format: string) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { type: Number, value: undefined, format } as const;
  }
  return { type: Number, value, format } as const;
}

/**
 * 엑셀 컬럼 계약 (spec.md 5.7 (나)) — 화면 표(`SCORE_COLUMNS`)와 **같은 10열·같은 순서**다.
 * 화면에 보이는 열과 파일의 열이 다르면 사용자가 받은 파일을 검증할 수 없다.
 */
const SCORE_EXCEL_COLUMNS: Column<StudentScore>[] = [
  {
    header: "학번",
    width: 14,
    // 숫자로 쓰면 앞자리 0이 사라지고 큰 학번이 지수 표기로 바뀐다. 반드시 문자열이다.
    cell: (row) => ({ type: String, value: row.studentNumber }),
  },
  {
    header: "이름",
    width: 12,
    // 실명 그대로. 마스킹하지 않는다(이 파일 상단 주석 참고).
    cell: (row) => ({ type: String, value: row.studentName }),
  },
  {
    header: "학과",
    width: 18,
    cell: (row) => ({ type: String, value: row.department?.name }),
  },
  {
    header: "학기",
    width: 20,
    // 화면과 동일하게 라벨로 넣는다. 코드가 괄호 안에 남으므로 정보 손실이 없다.
    cell: (row) => ({ type: String, value: formatTerm(row.lecture?.term) }),
  },
  {
    header: "중간고사",
    width: 10,
    cell: (row) => numberCell(row.midtermExamScore, SCORE_NUMBER_FORMAT),
  },
  {
    header: "중간과제",
    width: 10,
    cell: (row) => numberCell(row.midtermAssignmentScore, SCORE_NUMBER_FORMAT),
  },
  {
    header: "기말고사",
    width: 10,
    cell: (row) => numberCell(row.finalExamScore, SCORE_NUMBER_FORMAT),
  },
  {
    header: "기말과제",
    width: 10,
    cell: (row) => numberCell(row.finalAssignmentScore, SCORE_NUMBER_FORMAT),
  },
  {
    header: "합계",
    width: 10,
    // 서버 계산값을 그대로 쓴다. 클라이언트가 다시 더하지 않는다.
    cell: (row) => numberCell(row.totalScore, TOTAL_SCORE_NUMBER_FORMAT),
  },
  {
    header: "등급",
    width: 8,
    cell: (row) => ({ type: String, value: row.grade }),
  },
];

/**
 * 파일명 세그먼트를 저장 가능한 형태로 정제한다 (spec.md 5.7 (다)).
 *
 * 강의명은 사용자 입력이라 `자료구조 1/2` 같은 값이 실제로 존재할 수 있다.
 *
 * @param segment 원본 세그먼트(강의명 등)
 * @returns 정제된 세그먼트. 전부 제거되면 빈 문자열
 */
export function sanitizeFileNameSegment(segment: string): string {
  return (
    segment
      .replace(FORBIDDEN_FILE_NAME_CHARS, "_")
      // Windows 는 마침표로 끝나는 파일명을 거부한다. 앞뒤 공백·마침표를 함께 털어낸다.
      .replace(/^[\s.]+|[\s.]+$/g, "")
      .slice(0, MAX_LECTURE_SEGMENT_LENGTH)
  );
}

/**
 * 다운로드 결과에서 학기 세그먼트를 정한다 (spec.md 5.7 (다)).
 *
 * 이 화면의 강의 필터는 `lectureName` 부분 일치가 전부이고 `term` 필터가 없어
 * **동일 강의명의 여러 학기가 섞일 수 있다**(spec.md 가정 10).
 * 그런데 파일명에 학기 하나를 박아 넣으면 파일이 내용과 다른 말을 하게 된다.
 *
 * @param rows 파일에 담을 성적 목록
 * @returns 학기 코드 1개 / "여러학기" / 값이 없으면 빈 문자열(세그먼트 생략)
 */
function resolveTermSegment(rows: StudentScore[]): string {
  const terms = new Set(
    rows.map((row) => row.lecture?.term).filter((term): term is string => Boolean(term)),
  );

  if (terms.size === 0) return "";
  // tsconfig 의 target 이 낮아 Set 스프레드를 쓸 수 없다. Array.from 이 같은 결과를 준다.
  if (terms.size === 1) return Array.from(terms)[0];
  return MIXED_TERM_SEGMENT;
}

/**
 * `YYYYMMDD-HHmm` 형태의 사용자 로컬 시각 문자열을 만든다.
 * 같은 조건을 여러 번 받았을 때 파일이 덮어써지거나 `(1)` 이 붙는 것을 막는다.
 * 초 단위는 넣지 않는다(길어지기만 한다).
 *
 * @param now 기준 시각
 * @returns "20260802-1432"
 */
function formatFileNameTimestamp(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${date}-${time}`;
}

/**
 * 다운로드 파일명을 만든다 (spec.md 5.7 (다)).
 *
 * 형식: `성적목록_<강의명>_<학기>_<YYYYMMDD-HHmm>.xlsx`
 * 정제 후 비어 버린 세그먼트는 **통째로 생략**한다(`성적목록__2610_…` 처럼 밑줄이 겹치지 않게).
 * 한글을 그대로 쓴다 — 서버 `Content-Disposition` 이 아니라 브라우저가 Blob 을 저장하므로
 * RFC 5987 인코딩 문제가 발생하지 않는다(spec.md 가정 43).
 *
 * @param lectureName 사용자가 고른 강의명
 * @param rows 파일에 담을 성적 목록(학기 세그먼트 판정에 쓴다)
 * @param now 기준 시각
 * @returns 확장자를 포함한 파일명
 */
export function buildStudentScoresFileName(
  lectureName: string,
  rows: StudentScore[],
  now: Date,
): string {
  const segments = [
    EXCEL_EXPORT_SHEET_NAME,
    sanitizeFileNameSegment(lectureName),
    sanitizeFileNameSegment(resolveTermSegment(rows)),
    formatFileNameTimestamp(now),
  ].filter((segment) => segment !== "");

  const extension = ".xlsx";
  return `${segments.join("_").slice(0, MAX_FILE_NAME_LENGTH - extension.length)}${extension}`;
}

/**
 * 성적 목록을 `.xlsx` 파일로 만들어 브라우저에 저장시킨다.
 *
 * 합계 행·소계·통계 행을 넣지 않는다 — 요청에 없고, 서버가 준 값 외의 수치를 파일에 넣으면
 * 화면과 대조할 수 없는 숫자가 생긴다(spec.md 5.7 (나)).
 *
 * @param rows 파일에 담을 성적 목록(실명 포함)
 * @param lectureName 파일명에 쓸 강의명
 * @param now 파일명 타임스탬프 기준 시각
 * @throws 라이브러리 로드·파일 생성 실패 시 예외를 그대로 던진다(호출부가 토스트로 알린다)
 */
export async function downloadStudentScoresExcel(
  rows: StudentScore[],
  lectureName: string,
  now: Date = new Date(),
): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  await writeXlsxFile(rows, {
    columns: SCORE_EXCEL_COLUMNS,
    sheet: EXCEL_EXPORT_SHEET_NAME,
  }).toFile(buildStudentScoresFileName(lectureName, rows, now));
}
