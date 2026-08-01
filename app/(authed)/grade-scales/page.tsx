"use client";

import { useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { DataTable, type Column } from "@/components/data/DataTable";
import { Pagination } from "@/components/data/Pagination";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { ScoreConverter } from "@/components/features/grade-scales/ScoreConverter";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useClientTable } from "@/hooks/useClientTable";
import { useDeleteAction } from "@/hooks/useDeleteAction";
import { deleteGradeScale, fetchGradeScales } from "@/lib/api/endpoints";
import { formatNumber } from "@/lib/format";
import { listTableState } from "@/lib/tableState";
import type { GradeScale } from "@/types/api";

/**
 * 학점환산기준 목록 (`/grade-scales`).
 *
 * 목록 위에 점수→등급 변환 도구를 함께 배치한다.
 * 변환 도구가 실패해도 목록 표는 정상 유지된다 (spec.md 6절).
 *
 * @returns 학점환산기준 화면
 */
export default function GradeScalesPage() {
  const fetcher = useCallback(() => fetchGradeScales(), []);
  const { data, isLoading, isRefetching, error, refetch } = useAsyncData(fetcher);

  const table = useClientTable<GradeScale>({
    rows: data,
    getSearchableValues: useCallback((row: GradeScale) => [row.grade], []),
    sortAccessors: GRADE_SCALE_SORT_ACCESSORS,
    // 점수 구간 순으로 보는 것이 자연스러우므로 최소 점수 기준으로 시작한다.
    initialSortBy: "minScore",
  });

  const deletion = useDeleteAction({
    deleteFn: deleteGradeScale,
    onDeleted: refetch,
    successMessage: "학점환산기준을 삭제했습니다.",
    alreadyDeletedMessage: "이미 삭제된 기준입니다.",
  });

  const renderRowActions = (row: GradeScale) => (
    <>
      <Button variant="secondary" size="sm" href={`/grade-scales/${row.id}/edit`} fullWidth className="md:w-auto">
        수정
      </Button>
      <Button
        variant="danger"
        size="sm"
        fullWidth
        className="md:w-auto"
        onClick={() => deletion.requestDelete({ id: row.id, label: row.grade })}
      >
        삭제
      </Button>
    </>
  );

  return (
    <PageContainer>
      <PageHeader
        title="학점환산기준 관리"
        description="점수 구간별 등급과 평점을 관리합니다."
        actions={
          <Button variant="primary" href="/grade-scales/new" fullWidth className="sm:w-auto">
            + 기준 생성
          </Button>
        }
      />

      <div className="mt-6 space-y-6 lg:space-y-8">
        <ScoreConverter />

        <DataTable
          caption="학점환산기준 목록"
          columns={GRADE_SCALE_COLUMNS}
          rows={table.pageRows}
          getRowKey={(row) => row.id}
          tableMinWidth="table-sm"
          sort={table.sort}
          onSortChange={table.toggleSort}
          state={listTableState({
            isLoading,
            isRefetching,
            hasError: Boolean(error),
            isEmpty: table.filteredCount === 0,
          })}
          onRetry={refetch}
          rowActions={renderRowActions}
          emptyState={
            <EmptyState
              title="등록된 학점환산 기준이 없습니다."
              action={
                <Button variant="primary" href="/grade-scales/new" fullWidth className="sm:w-auto">
                  기준 생성
                </Button>
              }
            />
          }
        />

        {table.filteredCount > 0 ? (
          <Pagination
            page={table.page}
            totalPages={table.totalPages}
            total={table.filteredCount}
            onPageChange={table.setPage}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(deletion.target)}
        title="학점환산기준을 삭제할까요?"
        description={`"${deletion.target?.label ?? ""}" 등급 기준을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`}
        loading={deletion.isDeleting}
        onConfirm={deletion.confirmDelete}
        onCancel={deletion.cancelDelete}
      />
    </PageContainer>
  );
}

/** 클라이언트 정렬용 값 추출기. */
const GRADE_SCALE_SORT_ACCESSORS: Record<string, (row: GradeScale) => string | number> = {
  grade: (row) => row.grade,
  gpa: (row) => row.gpa,
  minScore: (row) => row.minScore,
};

/** 학점환산기준 표 컬럼 정의. */
const GRADE_SCALE_COLUMNS: Column<GradeScale>[] = [
  {
    key: "grade",
    header: "등급",
    sortKey: "grade",
    mobilePriority: "title",
    cell: (row) => <GradeBadge grade={row.grade} />,
  },
  {
    key: "gpa",
    header: "평점",
    sortKey: "gpa",
    align: "right",
    cell: (row) => formatNumber(row.gpa, 1),
  },
  {
    key: "minScore",
    header: "최소 점수",
    sortKey: "minScore",
    align: "right",
    cell: (row) => formatNumber(row.minScore, 0),
  },
  {
    key: "maxScore",
    header: "최대 점수",
    align: "right",
    cell: (row) => formatNumber(row.maxScore, 0),
  },
];
