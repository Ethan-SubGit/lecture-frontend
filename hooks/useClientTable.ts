"use client";

import { useMemo, useState } from "react";
import { CLIENT_PAGE_SIZE } from "@/lib/constants";
import type { SortOrder } from "@/types/api";

/**
 * 서버 페이지네이션이 없는 목록(강의·학과·학점환산기준)을
 * 클라이언트에서 검색·정렬·페이지네이션하는 훅.
 *
 * `GET /lectures`, `/departments`, `/grade-scales` 에는 쿼리 파라미터가 없어
 * 전체 배열을 받아 프론트에서 처리해야 한다 (spec.md 가정 9).
 * 세 화면이 같은 로직을 각자 갖지 않도록 하나로 묶었다.
 */

interface UseClientTableOptions<T> {
  /** 원본 행 배열 (조회 전이면 null 허용) */
  rows: T[] | null;
  /** 검색어와 비교할 문자열들을 행에서 뽑는 함수 */
  getSearchableValues: (row: T) => string[];
  /** 정렬 키 → 비교 가능한 값 추출 함수 맵 */
  sortAccessors: Record<string, (row: T) => string | number>;
  /** 초기 정렬 키 */
  initialSortBy: string;
}

interface UseClientTableResult<T> {
  /** 현재 페이지에 표시할 행 */
  pageRows: T[];
  /** 검색어 */
  query: string;
  setQuery: (query: string) => void;
  /** 현재 정렬 상태 */
  sort: { by: string; order: SortOrder };
  /** 정렬 헤더 클릭 핸들러. 같은 키를 다시 누르면 방향이 토글된다 */
  toggleSort: (sortKey: string) => void;
  page: number;
  setPage: (page: number) => void;
  /** 검색·정렬이 적용된 전체 건수 */
  filteredCount: number;
  totalPages: number;
  /** 검색어를 지우고 첫 페이지로 되돌린다 */
  resetQuery: () => void;
  /** 원본이 0건인지 (검색 결과 0건과 구분해 다른 빈 상태를 보여주기 위함) */
  isSourceEmpty: boolean;
}

/**
 * 배열 하나를 검색/정렬/페이지네이션한다.
 *
 * @typeParam T 행 데이터 타입
 * @param options 원본 배열과 검색·정렬 규칙
 * @returns 현재 페이지 행과 제어 상태
 */
export function useClientTable<T>({
  rows,
  getSearchableValues,
  sortAccessors,
  initialSortBy,
}: UseClientTableOptions<T>): UseClientTableResult<T> {
  const [query, setQueryState] = useState("");
  const [sort, setSort] = useState<{ by: string; order: SortOrder }>({
    by: initialSortBy,
    order: "ASC",
  });
  const [page, setPage] = useState(1);

  /** 검색어 변경 시에는 항상 첫 페이지로 되돌린다(빈 페이지에 머무는 것 방지). */
  function setQuery(nextQuery: string) {
    setQueryState(nextQuery);
    setPage(1);
  }

  function resetQuery() {
    setQueryState("");
    setPage(1);
  }

  /** 같은 컬럼을 다시 누르면 방향 토글, 다른 컬럼이면 ASC 로 시작한다. */
  function toggleSort(sortKey: string) {
    setSort((current) =>
      current.by === sortKey
        ? { by: sortKey, order: current.order === "ASC" ? "DESC" : "ASC" }
        : { by: sortKey, order: "ASC" },
    );
    setPage(1);
  }

  const filteredRows = useMemo(() => {
    const source = rows ?? [];
    const normalizedQuery = query.trim().toLowerCase();

    const searched = normalizedQuery
      ? source.filter((row) =>
          getSearchableValues(row).some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          ),
        )
      : source;

    const accessor = sortAccessors[sort.by];
    if (!accessor) return searched;

    // 원본 배열을 변형하지 않도록 복사 후 정렬한다.
    return [...searched].sort((left, right) => {
      const leftValue = accessor(left);
      const rightValue = accessor(right);

      // 숫자는 수치 비교, 문자열은 한국어 로케일 비교로 자연스러운 순서를 만든다.
      const comparison =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), "ko");

      return sort.order === "ASC" ? comparison : -comparison;
    });
  }, [rows, query, sort, getSearchableValues, sortAccessors]);

  const filteredCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / CLIENT_PAGE_SIZE));
  // 삭제 등으로 행이 줄어 현재 페이지가 범위를 넘으면 마지막 페이지로 보정한다.
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * CLIENT_PAGE_SIZE;
    return filteredRows.slice(start, start + CLIENT_PAGE_SIZE);
  }, [filteredRows, safePage]);

  return {
    pageRows,
    query,
    setQuery,
    sort,
    toggleSort,
    page: safePage,
    setPage,
    filteredCount,
    totalPages,
    resetQuery,
    isSourceEmpty: (rows ?? []).length === 0,
  };
}
