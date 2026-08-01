"use client";

import { useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/data/DataTable";
import { Pagination } from "@/components/data/Pagination";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useClientTable } from "@/hooks/useClientTable";
import { useDeleteAction } from "@/hooks/useDeleteAction";
import { deleteLecture, fetchLectures } from "@/lib/api/endpoints";
import { formatDate, formatTerm } from "@/lib/format";
import { listTableState } from "@/lib/tableState";
import type { Lecture } from "@/types/api";

/**
 * 수강과목 목록 (`/lectures`).
 *
 * `GET /lectures` 는 쿼리 파라미터가 없어 전체 배열을 받는다.
 * 따라서 검색·정렬·페이지네이션을 **추가 API 호출 없이** 클라이언트에서 처리한다.
 *
 * @returns 강의 목록 화면
 */
export default function LecturesPage() {
  const fetcher = useCallback(() => fetchLectures(), []);
  const { data, isLoading, isRefetching, error, refetch } = useAsyncData(fetcher);

  const table = useClientTable<Lecture>({
    rows: data,
    // 강의코드와 강의명, 학기 어느 것으로도 찾을 수 있게 한다.
    getSearchableValues: useCallback(
      (row: Lecture) => [row.code, row.name, row.term],
      [],
    ),
    sortAccessors: LECTURE_SORT_ACCESSORS,
    initialSortBy: "code",
  });

  const deletion = useDeleteAction({
    deleteFn: deleteLecture,
    onDeleted: refetch,
    successMessage: "수강과목을 삭제했습니다.",
    alreadyDeletedMessage: "이미 삭제된 강의입니다.",
  });

  /** 행별 [수정]/[삭제] 버튼. 모바일 카드에서는 하단 2개 버튼으로 표시된다. */
  const renderRowActions = (row: Lecture) => (
    <>
      <Button variant="secondary" size="sm" href={`/lectures/${row.id}/edit`} fullWidth className="md:w-auto">
        수정
      </Button>
      <Button
        variant="danger"
        size="sm"
        fullWidth
        className="md:w-auto"
        onClick={() => deletion.requestDelete({ id: row.id, label: row.name })}
      >
        삭제
      </Button>
    </>
  );

  return (
    <PageContainer>
      <PageHeader
        title="수강과목 관리"
        description="등록된 강의를 조회·수정·삭제합니다."
        actions={
          <Button variant="primary" href="/lectures/new" fullWidth className="sm:w-auto">
            + 수강과목 생성
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        <div className="md:flex md:gap-3">
          <div className="md:max-w-form md:flex-1">
            <label htmlFor="lecture-search" className="sr-only">
              강의코드 · 강의명 검색
            </label>
            <TextInput
              id="lecture-search"
              type="search"
              placeholder="강의코드 또는 강의명으로 검색"
              value={table.query}
              onChange={(event) => table.setQuery(event.target.value)}
            />
          </div>
        </div>

        <DataTable
          caption="수강과목 목록"
          columns={LECTURE_COLUMNS}
          rows={table.pageRows}
          getRowKey={(row) => row.id}
          tableMinWidth="table-md"
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
            table.isSourceEmpty ? (
              <EmptyState
                title="등록된 수강과목이 없습니다."
                action={
                  <Button variant="primary" href="/lectures/new" fullWidth className="sm:w-auto">
                    수강과목 생성
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="검색 결과가 없습니다."
                action={
                  <Button variant="secondary" onClick={table.resetQuery} fullWidth className="sm:w-auto">
                    검색어 지우기
                  </Button>
                }
              />
            )
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
        title="수강과목을 삭제할까요?"
        description={`"${deletion.target?.label ?? ""}" 강의를 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`}
        loading={deletion.isDeleting}
        onConfirm={deletion.confirmDelete}
        onCancel={deletion.cancelDelete}
      />
    </PageContainer>
  );
}

/** 클라이언트 정렬용 값 추출기. 컬럼의 sortKey 와 키가 일치해야 한다. */
const LECTURE_SORT_ACCESSORS: Record<string, (row: Lecture) => string | number> = {
  code: (row) => row.code,
  name: (row) => row.name,
  term: (row) => row.term,
  createdAt: (row) => row.createdAt,
};

/** 강의 표 컬럼 정의. 표와 모바일 카드 스택이 이 정의 한 벌을 공유한다. */
const LECTURE_COLUMNS: Column<Lecture>[] = [
  { key: "code", header: "강의코드", sortKey: "code", mobilePriority: "badge", cell: (row) => row.code },
  {
    key: "name",
    header: "강의명",
    sortKey: "name",
    mobilePriority: "title",
    cell: (row) => row.name,
  },
  { key: "term", header: "학기", sortKey: "term", cell: (row) => formatTerm(row.term) },
  {
    key: "createdAt",
    header: "등록일",
    sortKey: "createdAt",
    cell: (row) => formatDate(row.createdAt),
  },
];
