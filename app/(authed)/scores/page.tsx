"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select, TextInput } from "@/components/ui/Input";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { DataTable, type Column } from "@/components/data/DataTable";
import { Pagination } from "@/components/data/Pagination";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { fetchLectures, fetchStudentScores } from "@/lib/api/endpoints";
import { formatNumber, formatTerm } from "@/lib/format";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";
import { listTableState } from "@/lib/tableState";
import type { SortOrder, StudentScore, StudentScoreSortBy } from "@/types/api";

/**
 * 수강과목별 성적조회 (`/scores`).
 *
 * 이 화면만 서버 페이지네이션을 쓴다. 검색·정렬·페이지 상태를 URL 쿼리에 반영해
 * 새로고침 후에도 같은 결과가 나오게 한다(수용 기준).
 *
 * @returns 성적조회 화면
 */
export default function ScoresPage() {
  return (
    <Suspense fallback={null}>
      <ScoresView />
    </Suspense>
  );
}

/** URL 쿼리로 관리하는 조회 조건. */
interface ScoreQueryState {
  lectureName: string;
  studentName: string;
  studentNumber: string;
  departmentName: string;
  page: number;
  pageSize: number;
  sortBy?: StudentScoreSortBy;
  order: SortOrder;
}

/** 정렬 가능한 필드 목록. 이 값 밖의 sortBy 는 무시한다. */
const SORTABLE_FIELDS: StudentScoreSortBy[] = [
  "studentNumber",
  "studentName",
  "departmentName",
  "totalScore",
  "grade",
];

/**
 * URL 쿼리스트링을 조회 조건 객체로 파싱한다.
 * 잘못된 값(음수 페이지, 알 수 없는 sortBy 등)은 기본값으로 떨어뜨린다.
 *
 * @param params URLSearchParams
 * @returns 조회 조건
 */
function parseQueryState(params: URLSearchParams): ScoreQueryState {
  const rawSortBy = params.get("sortBy");
  const sortBy = SORTABLE_FIELDS.find((field) => field === rawSortBy);

  const parsedPage = Number(params.get("page"));
  const parsedPageSize = Number(params.get("pageSize"));

  return {
    lectureName: params.get("lectureName") ?? "",
    studentName: params.get("studentName") ?? "",
    studentNumber: params.get("studentNumber") ?? "",
    departmentName: params.get("departmentName") ?? "",
    page: Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1,
    pageSize:
      PAGE_SIZE_OPTIONS.some((option) => option === parsedPageSize)
        ? parsedPageSize
        : DEFAULT_PAGE_SIZE,
    sortBy,
    order: params.get("order") === "DESC" ? "DESC" : "ASC",
  };
}

/**
 * 성적조회 본체.
 *
 * 강의를 선택하기 전에는 `GET /student-scores` 를 호출하지 않는다(수용 기준).
 *
 * @returns 조회 화면
 */
function ScoresView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 이 조회 조건의 단일 진실 공급원이다. 컴포넌트 상태로 이중 관리하지 않는다.
  const queryState = useMemo(
    () => parseQueryState(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const lecturesFetcher = useCallback(() => fetchLectures(), []);
  const { data: lectures, isLoading: isLoadingLectures } = useAsyncData(lecturesFetcher);

  const hasLectureSelected = queryState.lectureName !== "";

  const scoresFetcher = useCallback(
    () =>
      fetchStudentScores({
        lectureName: queryState.lectureName,
        studentName: queryState.studentName,
        studentNumber: queryState.studentNumber,
        departmentName: queryState.departmentName,
        page: queryState.page,
        pageSize: queryState.pageSize,
        sortBy: queryState.sortBy,
        order: queryState.order,
      }),
    [queryState],
  );
  // enabled=false 면 요청을 보내지 않는다 — 강의 미선택 상태를 이렇게 표현한다.
  const { data, isLoading, isRefetching, error, refetch } = useAsyncData(
    scoresFetcher,
    hasLectureSelected,
  );

  // 검색 입력은 [검색]을 눌러야 URL 에 반영되므로 별도 로컬 상태로 둔다.
  const [searchDraft, setSearchDraft] = useState({
    studentName: queryState.studentName,
    studentNumber: queryState.studentNumber,
    departmentName: queryState.departmentName,
  });

  // 뒤로가기 등으로 URL 이 바뀌면 입력값도 URL 을 따라간다.
  useEffect(() => {
    setSearchDraft({
      studentName: queryState.studentName,
      studentNumber: queryState.studentNumber,
      departmentName: queryState.departmentName,
    });
  }, [queryState.studentName, queryState.studentNumber, queryState.departmentName]);

  /**
   * 조회 조건 일부를 바꿔 URL 을 갱신한다.
   * 빈 문자열 값은 쿼리스트링에서 제거해 서버로도 전송되지 않게 한다.
   *
   * @param patch 변경할 조건
   */
  const updateQuery = useCallback(
    (patch: Partial<ScoreQueryState>) => {
      const next = { ...queryState, ...patch };
      const params = new URLSearchParams();

      if (next.lectureName) params.set("lectureName", next.lectureName);
      if (next.studentName) params.set("studentName", next.studentName);
      if (next.studentNumber) params.set("studentNumber", next.studentNumber);
      if (next.departmentName) params.set("departmentName", next.departmentName);
      if (next.page > 1) params.set("page", String(next.page));
      if (next.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(next.pageSize));
      if (next.sortBy) {
        params.set("sortBy", next.sortBy);
        params.set("order", next.order);
      }

      const queryString = params.toString();
      router.replace(queryString ? `/scores?${queryString}` : "/scores");
    },
    [queryState, router],
  );

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // 검색 조건이 바뀌면 항상 1페이지부터 다시 본다.
    updateQuery({ ...searchDraft, page: 1 });
  }

  /** 정렬 헤더 클릭: 같은 컬럼이면 방향 토글, 다른 컬럼이면 ASC 로 시작. */
  function handleSortChange(sortKey: string) {
    const field = SORTABLE_FIELDS.find((candidate) => candidate === sortKey);
    if (!field) return;

    const isSameField = queryState.sortBy === field;
    updateQuery({
      sortBy: field,
      order: isSameField && queryState.order === "ASC" ? "DESC" : "ASC",
      page: 1,
    });
  }

  /** 검색 조건을 초기화한다. 강의 선택만 남긴다. */
  function handleResetFilters() {
    setSearchDraft({ studentName: "", studentNumber: "", departmentName: "" });
    router.replace(
      `/scores?lectureName=${encodeURIComponent(queryState.lectureName)}`,
    );
  }

  const rows = data?.data ?? [];

  return (
    <PageContainer width="wide">
      <PageHeader
        title="수강과목별 성적조회"
        description="강의를 선택하고 학생·학과 조건으로 성적을 조회합니다."
      />

      <div className="mt-6 space-y-6">
        <Card>
          <form onSubmit={handleSearchSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Field label="수강과목" htmlFor="score-lecture">
                <Select
                  id="score-lecture"
                  value={queryState.lectureName}
                  disabled={isLoadingLectures}
                  // 강의 변경은 즉시 재조회한다(검색 버튼을 기다리지 않는다).
                  onChange={(event) =>
                    updateQuery({ lectureName: event.target.value, page: 1 })
                  }
                >
                  {isLoadingLectures ? (
                    <option value="">강의 목록을 불러오는 중…</option>
                  ) : (
                    <>
                      <option value="">수강과목을 선택하세요</option>
                      {(lectures ?? []).map((lecture) => (
                        <option key={lecture.id} value={lecture.name}>
                          {lecture.name} ({lecture.term})
                        </option>
                      ))}
                    </>
                  )}
                </Select>
              </Field>

              <Field label="학생 이름" htmlFor="score-student-name" hint="부분 검색">
                <TextInput
                  id="score-student-name"
                  type="search"
                  value={searchDraft.studentName}
                  onChange={(event) =>
                    setSearchDraft((draft) => ({ ...draft, studentName: event.target.value }))
                  }
                />
              </Field>

              <Field label="학번" htmlFor="score-student-number" hint="정확히 일치">
                <TextInput
                  id="score-student-number"
                  type="search"
                  value={searchDraft.studentNumber}
                  onChange={(event) =>
                    setSearchDraft((draft) => ({ ...draft, studentNumber: event.target.value }))
                  }
                />
              </Field>

              <Field label="학과명" htmlFor="score-department" hint="부분 검색">
                <TextInput
                  id="score-department"
                  type="search"
                  value={searchDraft.departmentName}
                  onChange={(event) =>
                    setSearchDraft((draft) => ({ ...draft, departmentName: event.target.value }))
                  }
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={handleResetFilters} fullWidth className="sm:w-auto">
                초기화
              </Button>
              <Button type="submit" variant="primary" fullWidth className="sm:w-auto">
                검색
              </Button>
            </div>

            {/* 모바일에서도 페이지 크기를 바꿀 수 있게 필터 바 안에 둔다(lg 이상은 페이지네이션에도 노출). */}
            <div className="mt-4 lg:hidden">
              <Field label="표시 개수" htmlFor="score-page-size">
                <Select
                  id="score-page-size"
                  value={queryState.pageSize}
                  onChange={(event) =>
                    updateQuery({ pageSize: Number(event.target.value), page: 1 })
                  }
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}건씩
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </form>
        </Card>

        {!hasLectureSelected ? (
          <EmptyState
            title="조회할 수강과목을 선택하세요."
            description="수강과목을 선택하면 해당 강의의 성적 목록이 표시됩니다."
          />
        ) : (
          <>
            <DataTable
              caption="성적 목록"
              columns={SCORE_COLUMNS}
              rows={rows}
              getRowKey={(row) => row.id}
              tableMinWidth="table-lg"
              stickyFirstColumn
              showScrollHint
              sort={{ by: queryState.sortBy, order: queryState.order }}
              onSortChange={handleSortChange}
              state={listTableState({
                isLoading,
                isRefetching,
                hasError: Boolean(error),
                isEmpty: (data?.total ?? 0) === 0,
              })}
              onRetry={refetch}
              emptyState={
                <EmptyState
                  title="조건에 맞는 성적이 없습니다."
                  action={
                    <Button variant="secondary" onClick={handleResetFilters} fullWidth className="sm:w-auto">
                      검색조건 초기화
                    </Button>
                  }
                />
              }
            />

            {data && data.total > 0 ? (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                pageSize={queryState.pageSize}
                onPageChange={(page) => updateQuery({ page })}
                onPageSizeChange={(pageSize) => updateQuery({ pageSize, page: 1 })}
              />
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
}

/**
 * 성적 표 컬럼 정의.
 *
 * 학기 컬럼을 반드시 노출한다 — `GET /student-scores` 에는 강의 id·term 필터가 없어
 * 동일 강의명이 여러 학기에 존재하면 결과가 섞이기 때문이다 (spec.md 가정 10).
 */
const SCORE_COLUMNS: Column<StudentScore>[] = [
  {
    key: "studentNumber",
    header: "학번",
    sortKey: "studentNumber",
    mobilePriority: "title",
    // 첫 셀에 실제 링크를 두어 키보드만으로 상세에 진입할 수 있게 한다.
    cell: (row) => (
      <Link
        href={`/scores/${row.id}`}
        className="rounded text-accent underline underline-offset-2 focus-ring"
      >
        {row.studentNumber}
      </Link>
    ),
  },
  { key: "studentName", header: "이름", sortKey: "studentName", cell: (row) => row.studentName },
  {
    key: "departmentName",
    header: "학과",
    sortKey: "departmentName",
    cell: (row) => row.department?.name ?? "",
  },
  { key: "term", header: "학기", cell: (row) => formatTerm(row.lecture?.term) },
  {
    key: "midtermExamScore",
    header: "중간고사",
    align: "right",
    cell: (row) => formatNumber(row.midtermExamScore, 0),
  },
  {
    key: "midtermAssignmentScore",
    header: "중간과제",
    align: "right",
    cell: (row) => formatNumber(row.midtermAssignmentScore, 0),
  },
  {
    key: "finalExamScore",
    header: "기말고사",
    align: "right",
    cell: (row) => formatNumber(row.finalExamScore, 0),
  },
  {
    key: "finalAssignmentScore",
    header: "기말과제",
    align: "right",
    cell: (row) => formatNumber(row.finalAssignmentScore, 0),
  },
  {
    key: "totalScore",
    header: "합계",
    sortKey: "totalScore",
    align: "right",
    cell: (row) => (
      <span className="font-semibold">{formatNumber(row.totalScore, 1)}</span>
    ),
  },
  {
    key: "grade",
    header: "등급",
    sortKey: "grade",
    mobilePriority: "badge",
    cell: (row) => <GradeBadge grade={row.grade} />,
  },
];
