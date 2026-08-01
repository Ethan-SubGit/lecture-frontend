"use client";

import { useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/data/DataTable";
import { Pagination } from "@/components/data/Pagination";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useClientTable } from "@/hooks/useClientTable";
import { useDeleteAction } from "@/hooks/useDeleteAction";
import { deleteDepartment, fetchDepartments } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { listTableState } from "@/lib/tableState";
import type { Department } from "@/types/api";

/**
 * 학과 목록 (`/departments`).
 *
 * `GET /departments` 도 쿼리 파라미터가 없어 클라이언트에서 검색·정렬·페이지네이션한다.
 *
 * @returns 학과 목록 화면
 */
export default function DepartmentsPage() {
  const fetcher = useCallback(() => fetchDepartments(), []);
  const { data, isLoading, isRefetching, error, refetch } = useAsyncData(fetcher);

  const table = useClientTable<Department>({
    rows: data,
    getSearchableValues: useCallback((row: Department) => [row.code, row.name], []),
    sortAccessors: DEPARTMENT_SORT_ACCESSORS,
    initialSortBy: "code",
  });

  const deletion = useDeleteAction({
    deleteFn: deleteDepartment,
    onDeleted: refetch,
    successMessage: "학과를 삭제했습니다.",
    alreadyDeletedMessage: "이미 삭제된 학과입니다.",
  });

  const renderRowActions = (row: Department) => (
    <>
      <Button variant="secondary" size="sm" href={`/departments/${row.id}/edit`} fullWidth className="md:w-auto">
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
        title="학과 관리"
        description="성적 업로드 시 참조되는 학과 기준정보를 관리합니다."
        actions={
          <Button variant="primary" href="/departments/new" fullWidth className="sm:w-auto">
            + 학과 생성
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        <div className="md:max-w-form">
          <label htmlFor="department-search" className="sr-only">
            학과 코드 · 학과명 검색
          </label>
          <TextInput
            id="department-search"
            type="search"
            placeholder="학과 코드 또는 학과명으로 검색"
            value={table.query}
            onChange={(event) => table.setQuery(event.target.value)}
          />
        </div>

        <DataTable
          caption="학과 목록"
          columns={DEPARTMENT_COLUMNS}
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
            table.isSourceEmpty ? (
              <EmptyState
                title="등록된 학과가 없습니다."
                action={
                  <Button variant="primary" href="/departments/new" fullWidth className="sm:w-auto">
                    학과 생성
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
        title="학과를 삭제할까요?"
        description={`"${deletion.target?.label ?? ""}" 학과를 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`}
        loading={deletion.isDeleting}
        onConfirm={deletion.confirmDelete}
        onCancel={deletion.cancelDelete}
      />
    </PageContainer>
  );
}

/** 클라이언트 정렬용 값 추출기. */
const DEPARTMENT_SORT_ACCESSORS: Record<string, (row: Department) => string | number> = {
  code: (row) => row.code,
  name: (row) => row.name,
  createdAt: (row) => row.createdAt,
};

/** 학과 표 컬럼 정의. */
const DEPARTMENT_COLUMNS: Column<Department>[] = [
  {
    key: "code",
    header: "학과 코드",
    sortKey: "code",
    mobilePriority: "badge",
    cell: (row) => <Badge tone="neutral">{row.code}</Badge>,
  },
  { key: "name", header: "학과명", sortKey: "name", mobilePriority: "title", cell: (row) => row.name },
  {
    key: "createdAt",
    header: "등록일",
    sortKey: "createdAt",
    cell: (row) => formatDate(row.createdAt),
  },
];
