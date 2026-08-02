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
import { ClipboardIcon, DownloadIcon, FilterOffIcon } from "@/components/ui/icons";
import { DataTable, type Column } from "@/components/data/DataTable";
import { Pagination } from "@/components/data/Pagination";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  useScoresExcelDownload,
  type ExcelDownloadStage,
} from "@/hooks/useScoresExcelDownload";
import { fetchLectures, fetchStudentScores } from "@/lib/api/endpoints";
import {
  EMPTY_VALUE_PLACEHOLDER,
  formatCount,
  formatNumber,
  formatTerm,
  maskStudentName,
  NAME_MASK_CHAR,
} from "@/lib/format";
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
 * [엑셀 다운로드] 버튼의 단계별 라벨 (spec.md 3.10).
 *
 * 퍼센트 진행바를 만들지 않는다 — 단계가 2개뿐이고 각 단계의 진행률을 알 방법이 없어
 * 가짜 진행바가 된다. 라벨이 바뀌므로 버튼 폭은 `min-w-action-wide` 로 고정한다.
 */
const DOWNLOAD_BUTTON_LABELS: Record<ExcelDownloadStage, string> = {
  idle: "엑셀 다운로드",
  fetching: "목록 불러오는 중…",
  generating: "엑셀 만드는 중…",
};

/** `describeDownloadScope` 가 문구를 고르는 데 필요한 화면 상태. */
interface DownloadScopeState {
  stage: ExcelDownloadStage;
  isLoading: boolean;
  isRefetching: boolean;
  hasError: boolean;
  total: number;
}

/**
 * 툴바 보조 문구를 만든다 (design.md 4.33.3).
 *
 * **항상 문자열을 반환한다.** 빈 값을 돌려주면 모바일 세로 스택에서 툴바 높이가 출렁인다.
 * 조회 에러에도 `text-danger` 를 쓰지 않는다 — 같은 에러는 표 자리의 배너가 이미 빨갛게 말한다.
 *
 * @param state 다운로드 단계와 목록 조회 상태
 * @returns 상태에 대응하는 안내 문장
 */
function describeDownloadScope(state: DownloadScopeState): string {
  // 다운로드가 진행 중이면 목록 상태보다 우선한다 — 버튼 라벨과 같은 문장을 읽어줘야 한다.
  if (state.stage !== "idle") return DOWNLOAD_BUTTON_LABELS[state.stage];

  if (state.isLoading || state.isRefetching) return "건수를 확인하는 중입니다.";
  if (state.hasError) return "목록을 불러오지 못해 다운로드할 수 없습니다.";
  if (state.total === 0) return "다운로드할 데이터가 없습니다.";

  return `검색 조건에 맞는 전체 ${formatCount(state.total)}건`;
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

  // 학생 이름 필드의 인라인 검증 메시지. `*` 입력을 걸러내는 용도 하나뿐이다(spec.md 3.9).
  const [studentNameError, setStudentNameError] = useState<string>();

  const download = useScoresExcelDownload();

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

    /* 화면에 보이는 `홍*동`을 그대로 복사해 검색하면 서버는 0건을 반환하고
       사용자는 이유를 알 수 없다. 요청을 아예 보내지 않고 인라인으로 알린다(spec.md 3.9). */
    if (searchDraft.studentName.includes(NAME_MASK_CHAR)) {
      setStudentNameError(
        `화면에 표시된 ${NAME_MASK_CHAR}는 가려진 글자입니다. 실제 이름으로 검색해 주세요.`,
      );
      return;
    }

    setStudentNameError(undefined);
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
    setStudentNameError(undefined);
    router.replace(
      `/scores?lectureName=${encodeURIComponent(queryState.lectureName)}`,
    );
  }

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  // 다운로드 버튼을 누를 수 없는 조건 — 받을 대상 집합이 확정되지 않았거나 0건이다.
  const isDownloadBlocked = isLoading || isRefetching || Boolean(error) || total === 0;

  /** [엑셀 다운로드] 클릭: 페이지네이션만 뺀 **현재 조건 그대로**를 요청 조건으로 확정한다. */
  function handleDownloadClick() {
    download.requestDownload({
      lectureName: queryState.lectureName,
      total,
      query: {
        lectureName: queryState.lectureName,
        studentName: queryState.studentName,
        studentNumber: queryState.studentNumber,
        departmentName: queryState.departmentName,
        sortBy: queryState.sortBy,
        order: queryState.order,
      },
    });
  }

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

              {/* 화면에는 이름이 가려져 보이지만 검색은 실명 기준이다.
                  이 불일치는 입력 직전에 알려야 시행착오를 막을 수 있다(design.md 4.32.2 #1). */}
              <Field
                label="학생 이름"
                htmlFor="score-student-name"
                hint="부분 검색 · 실제 이름으로 입력"
                error={studentNameError}
              >
                <TextInput
                  id="score-student-name"
                  type="search"
                  value={searchDraft.studentName}
                  onChange={(event) => {
                    setStudentNameError(undefined);
                    setSearchDraft((draft) => ({ ...draft, studentName: event.target.value }));
                  }}
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
            icon={<ClipboardIcon className="h-6 w-6 md:h-8 md:w-8" />}
            title="조회할 수강과목을 선택하세요."
            description="수강과목을 선택하면 해당 강의의 성적 목록이 표시됩니다."
          />
        ) : (
          <>
            {/* 툴바 + 표 + 각주는 한 덩어리(space-y-3)다. 바깥 space-y-6 보다 좁아야
                "이 버튼은 이 표에 대한 것"이라는 소속이 보인다(design.md 4.33.1).
                Pagination 은 이 덩어리 **밖**이다 — 다운로드 범위는 페이지와 무관하다. */}
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {/* 보조 문구는 "무엇을 받는지"를 알리는 유일한 장치이자 비활성 사유의 설명이다.
                    슬롯을 항상 채워 툴바 높이가 출렁이지 않게 하고,
                    aria-live 는 화면을 통틀어 여기 한 곳에만 둔다(design.md 4.33.3 / 6.8.2). */}
                <p className="text-caption text-muted" aria-live="polite">
                  {describeDownloadScope({
                    stage: download.stage,
                    isLoading,
                    isRefetching,
                    hasError: Boolean(error),
                    total,
                  })}
                </p>

                {/* 이 화면의 주 동작은 [검색](primary)이다. 다운로드는 결과에 대한 부수 동작이라
                    secondary 로 둔다. 라벨이 3단계로 바뀌므로 sm 이상에서 폭을 토큰으로 고정한다. */}
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  className="sm:w-auto sm:min-w-action-wide"
                  iconLeft={<DownloadIcon className="h-4 w-4" />}
                  loading={download.stage !== "idle"}
                  disabled={isDownloadBlocked}
                  onClick={handleDownloadClick}
                >
                  {DOWNLOAD_BUTTON_LABELS[download.stage]}
                </Button>
              </div>

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
                  isEmpty: total === 0,
                })}
                onRetry={refetch}
                emptyState={
                  <EmptyState
                    icon={<FilterOffIcon className="h-6 w-6 md:h-8 md:w-8" />}
                    title="조건에 맞는 성적이 없습니다."
                    action={
                      <Button variant="secondary" onClick={handleResetFilters} fullWidth className="sm:w-auto">
                        검색조건 초기화
                      </Button>
                    }
                  />
                }
              />

              {/* 이 화면만 긴 각주가 필요하다 — 검색과 정렬 두 가지 불일치를 한 문장이 모두 설명한다.
                  강의 미선택(표 자체가 없음)에서는 렌더되지 않고, 결과 0건에서는 유지된다. */}
              <p className="flex gap-1.5 text-caption text-muted">
                <span aria-hidden="true">※</span>
                학생 이름은 일부를 {NAME_MASK_CHAR}로 가려 표시합니다. 검색·정렬은 실제 이름 기준으로
                동작합니다.
              </p>
            </div>

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

      {/* 대용량 사전 확인. tone="accent" 라 [다운로드] 버튼이 빨간색이 되지 않는다 —
          파일을 하나 만들 뿐이고 취소해도 잃는 것이 없다(design.md 4.33.5). */}
      <ConfirmDialog
        open={download.pendingConfirm !== null}
        tone="accent"
        title={`${formatCount(download.pendingConfirm?.total ?? 0)}건을 다운로드할까요?`}
        description="파일을 만드는 동안 브라우저가 수십 초 동안 응답하지 않을 수 있습니다."
        confirmLabel="다운로드"
        cancelLabel="취소"
        onConfirm={download.confirmDownload}
        onCancel={download.cancelDownload}
      />
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
  {
    key: "studentName",
    header: "이름",
    sortKey: "studentName",
    /* 마스킹은 **렌더 직전 표시 변환**이다(spec.md 5.6). 같은 행의 학번은 가리지 않는다 —
       마스킹 후에도 행을 특정할 수 있는 유일한 식별자이기 때문이다.
       마스킹된 값에는 색·자간·글꼴 등 어떤 시각 처리도 하지 않는다(design.md 4.32.1).
       title/aria-label 로 원본을 남기는 것도 금지다(마스킹이 무력화되고 DOM 에 실명이 남는다). */
    cell: (row) => {
      const maskedName = maskStudentName(row.studentName);
      if (maskedName !== EMPTY_VALUE_PLACEHOLDER) return maskedName;

      // 값 없음은 이름이 아니라 **다른 상태**이므로 4.18 의 기존 관례(대시 + sr-only)를 따른다.
      return (
        <span className="text-muted">
          <span aria-hidden="true">{maskedName}</span>
          <span className="sr-only">값 없음</span>
        </span>
      );
    },
  },
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
