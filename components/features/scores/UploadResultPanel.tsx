"use client";

import { AlertBanner } from "@/components/feedback/AlertBanner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/data/DataTable";
import { formatCount } from "@/lib/format";
import type { FailedRowDto, UploadExcelResponseDto } from "@/types/api";

/** 실패 행 표의 컬럼 정의. 사유는 길어질 수 있으므로 줄바꿈을 허용한다. */
const FAILED_ROW_COLUMNS: Column<FailedRowDto>[] = [
  {
    key: "row",
    header: "행 번호",
    align: "right",
    cell: (row) => <span className="whitespace-nowrap">{row.row}</span>,
  },
  {
    key: "reason",
    header: "실패 사유",
    cell: (row) => (
      <span className="whitespace-normal break-words text-primary">{row.reason}</span>
    ),
  },
];

interface UploadResultPanelProps {
  /** 업로드 201 응답. 아직 업로드하지 않았으면 null */
  result: UploadExcelResponseDto | null;
  /** 전량 롤백(500) 등 서버 오류. 결과와 동시에 존재하지 않는다 */
  serverError: string | null;
  /** 조회 화면으로 이동할 때 사용할 강의명 */
  lectureName: string;
}

/**
 * 엑셀 업로드 결과 패널 (design.md 4.16) — 이 화면의 최우선 UX.
 *
 * 네 가지 케이스를 시각적으로 확실히 구분한다:
 * - A 전량 성공 → success 배너 + [성적 조회하기]
 * - B 부분 실패 → warning 배너 + 실패행 표. "정상 행은 이미 저장되었다"를 강조
 * - C 전량 롤백(500) → danger 배너. "아무것도 저장되지 않았습니다"로 B 와 정반대 문구
 * - 결과 없음 → 아무것도 렌더하지 않음
 *
 * @param result 업로드 응답
 * @param serverError 서버 오류 메시지
 * @param lectureName 조회 링크에 넘길 강의명
 * @returns 결과 영역
 */
export function UploadResultPanel({
  result,
  serverError,
  lectureName,
}: UploadResultPanelProps) {
  // 케이스 C — 전량 롤백. 부분 저장 안내를 절대 함께 보여주지 않는다.
  if (serverError) {
    return (
      <AlertBanner
        tone="error"
        title="아무것도 저장되지 않았습니다."
        description={serverError}
      />
    );
  }

  if (!result) return null;

  const failedCount = result.failedRows.length;

  // 케이스 A — 전량 성공. 실패 표를 렌더하지 않는다.
  if (failedCount === 0) {
    return (
      <AlertBanner
        tone="success"
        title={`${formatCount(result.createdCount)}건이 모두 등록되었습니다.`}
        action={
          <Button
            variant="secondary"
            size="sm"
            href={`/scores?lectureName=${encodeURIComponent(lectureName)}`}
          >
            성적 조회하기
          </Button>
        }
      />
    );
  }

  // 케이스 B — 부분 실패.
  return (
    <div className="space-y-4">
      <AlertBanner
        tone="warning"
        title={`${formatCount(result.createdCount)}건 등록, ${formatCount(failedCount)}건 실패`}
        description={
          <>
            실패한 행을 수정해 다시 업로드하세요. 단,{" "}
            <span className="font-semibold">정상 등록된 행이 있으므로</span> 재업로드 시
            중복 오류가 발생할 수 있습니다.
          </>
        }
      />

      <Card>
        <p className="mb-2 text-caption text-muted">실패 {formatCount(failedCount)}건</p>
        {/* 실패 행은 자체 페이지네이션 없이 전량 표시한다(수용 기준). */}
        <DataTable
          caption="업로드 실패 행 목록"
          columns={FAILED_ROW_COLUMNS}
          rows={result.failedRows}
          getRowKey={(row) => String(row.row)}
          mobile="scroll"
          tableMinWidth="table-sm"
          surface="plain"
          showScrollHint
        />
      </Card>
    </div>
  );
}
