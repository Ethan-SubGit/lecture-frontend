"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { Button } from "@/components/ui/Button";
import { CardListSkeleton, Skeleton } from "@/components/feedback/Skeleton";
import { NETWORK_ERROR_MESSAGE } from "@/lib/constants";
import type { SortOrder } from "@/types/api";

/**
 * 이 프로젝트의 모든 표를 담당하는 단일 컴포넌트 (design.md 4.5).
 *
 * 화면마다 <table> 을 새로 짜지 않는다. 컬럼 정의(columns) 한 벌을 만들면
 * `<md` 카드 스택과 `≥md` 표 두 렌더러가 같은 정의를 나눠 쓴다.
 * 정렬 헤더·행 액션·스켈레톤·빈 상태·재조회 흐림·sticky 컬럼이 모두 내장되어 있다.
 */

/** 컬럼 1개의 정의. */
export interface Column<T> {
  /** React key 및 내부 식별자 */
  key: string;
  /**
   * 표 헤더 / 카드 스택의 라벨.
   * 문자열이 기본이지만 교차표의 등급 축처럼 배지가 필요한 경우가 있어 ReactNode 를 허용한다
   * (기존 문자열 호출부는 그대로 동작한다).
   */
  header: ReactNode;
  /** 정렬 방향. 숫자 컬럼은 'right' 로 지정한다 */
  align?: "left" | "right";
  /**
   * 서버/클라이언트 정렬에 사용할 키. 값이 있으면 헤더가 정렬 버튼이 된다.
   * (onSortChange 가 함께 주어져야 정렬 UI 가 나타난다)
   */
  sortKey?: string;
  /** 셀 렌더 함수 */
  cell: (row: T) => ReactNode;
  /**
   * 모바일 카드 스택에서의 배치.
   * 'title' → 카드 상단 대표값 / 'badge' → 상단 우측 / 'full' → 본문 2열 중 전체폭
   * 지정하지 않으면 본문 정의목록에 1칸으로 들어간다.
   */
  mobilePriority?: "title" | "badge" | "full";
}

/** 표 상태. spec.md 6절 상태 정의와 1:1 대응한다. */
export type TableState = "idle" | "loading" | "refetching" | "error" | "empty";

/** 표 최소폭 토큰. 컬럼 수에 따라 고른다. */
type TableMinWidth = "table-sm" | "table-md" | "table-lg";

interface DataTableProps<T> {
  /** 표 캡션. 스크린리더 전용으로 렌더된다 (예: "수강과목 목록") */
  caption: string;
  columns: Column<T>[];
  rows: T[];
  /** 행의 고유 key 를 뽑는 함수 */
  getRowKey: (row: T) => string;
  /** 모바일 렌더 전략. 'stack' = 카드 스택, 'scroll' = 전 구간 표 */
  mobile?: "stack" | "scroll";
  /** ≥md 표의 최소폭 */
  tableMinWidth?: TableMinWidth;
  /** 현재 정렬 상태 */
  sort?: { by?: string; order: SortOrder };
  /** 정렬 헤더 클릭 핸들러. 없으면 정렬 UI 를 그리지 않는다 */
  onSortChange?: (sortKey: string) => void;
  state?: TableState;
  /** loading 상태에서 그릴 스켈레톤 행 수 */
  skeletonRows?: number;
  /** empty 상태에서 표 자리에 그릴 노드 */
  emptyState?: ReactNode;
  /** error 상태의 재시도 핸들러 */
  onRetry?: () => void;
  /** 행별 액션(수정/삭제) 렌더 함수 */
  rowActions?: (row: T) => ReactNode;
  /** 첫 컬럼을 가로 스크롤 시 고정할지 (성적조회 표에서 사용) */
  stickyFirstColumn?: boolean;
  /** 가로 스크롤 안내 문구를 표 위에 표시할지 */
  showScrollHint?: boolean;
  /**
   * 표를 감싸는 표면.
   * 'card' = 카드로 감싼다(기본) / 'plain' = 감싸지 않는다.
   * 이미 Card 안에 놓이는 대시보드 통계 블록에서 테두리가 겹치지 않게 하려고 쓴다.
   */
  surface?: "card" | "plain";
}

/** 표 최소폭 토큰 → 클래스 매핑. 동적 클래스 문자열 조립을 피해 purge 안전성을 지킨다. */
const MIN_WIDTH_CLASSES: Record<TableMinWidth, string> = {
  "table-sm": "min-w-table-sm",
  "table-md": "min-w-table-md",
  "table-lg": "min-w-table-lg",
};

/**
 * 정렬 아이콘 글리프를 고른다.
 * 색이 아니라 글리프로 방향을 전달한다(색맹 대응, design.md 6.5).
 *
 * @param isActive 이 컬럼이 현재 정렬 기준인지
 * @param order 현재 정렬 방향
 * @returns 표시할 글리프 문자
 */
function sortGlyph(isActive: boolean, order: SortOrder): string {
  if (!isActive) return "↕";
  return order === "ASC" ? "↑" : "↓";
}

/**
 * aria-sort 속성 값을 계산한다.
 *
 * @param isSortable 정렬 가능한 컬럼인지
 * @param isActive 현재 정렬 기준인지
 * @param order 정렬 방향
 * @returns aria-sort 값. 정렬 불가 컬럼이면 undefined(속성 자체를 생략)
 */
function ariaSortValue(
  isSortable: boolean,
  isActive: boolean,
  order: SortOrder,
): "ascending" | "descending" | "none" | undefined {
  if (!isSortable) return undefined;
  if (!isActive) return "none";
  return order === "ASC" ? "ascending" : "descending";
}

/**
 * 공용 데이터 표.
 *
 * @typeParam T 행 데이터 타입
 * @returns 상태에 따라 스켈레톤 / 빈 상태 / 에러 / 표(또는 카드 스택)를 렌더한다
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  mobile = "stack",
  tableMinWidth = "table-sm",
  sort,
  onSortChange,
  state = "idle",
  skeletonRows = 8,
  emptyState,
  onRetry,
  rowActions,
  stickyFirstColumn = false,
  showScrollHint = false,
  surface = "card",
}: DataTableProps<T>) {
  // 에러 상태에서는 표를 그리지 않고 배너로 대체한다 (헤더는 페이지가 유지한다).
  if (state === "error") {
    return (
      <AlertBanner
        tone="error"
        title={NETWORK_ERROR_MESSAGE}
        action={
          onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              다시 시도
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (state === "empty") {
    return <>{emptyState}</>;
  }

  const isLoading = state === "loading";
  const isRefetching = state === "refetching";

  // 액션 컬럼은 columns 정의에 넣지 않고 여기서 덧붙인다.
  // (화면마다 액션 컬럼 정의를 복사하지 않기 위함)
  const columnCount = columns.length + (rowActions ? 1 : 0);

  return (
    <div>
      {/* 스크롤 힌트는 aria-hidden 이 아니다 — 스크린리더 사용자도 스크롤 컨테이너의 존재를 알아야 한다.
          단 mobile='stack' 구간에서는 표가 아니라 카드 스택이라 가로 스크롤이 없으므로 감춘다. */}
      {showScrollHint ? (
        <p
          className={cn(
            "mb-2 text-caption text-muted",
            mobile === "stack" && "hidden md:block",
          )}
        >
          표를 좌우로 스크롤할 수 있습니다.
        </p>
      ) : null}

      {/* 재조회 중임을 스크린리더에 1회 알린다. 시각적으로는 .is-refetching 흐림으로 표현된다. */}
      <span aria-live="polite" className="sr-only">
        {isRefetching ? "목록을 다시 불러오는 중" : ""}
      </span>

      {/* ── <md 카드 스택 (mobile='stack' 일 때만) ────────────────────────── */}
      {mobile === "stack" ? (
        <div className="md:hidden">
          {isLoading ? (
            <CardListSkeleton />
          ) : (
            <ul className={cn("space-y-3", isRefetching && "is-refetching")}>
              {rows.map((row) => (
                <MobileRowCard
                  key={getRowKey(row)}
                  row={row}
                  columns={columns}
                  rowActions={rowActions}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* ── ≥md 표 (mobile='scroll' 이면 전 구간) ─────────────────────────── */}
      {/* surface='plain' 이면 카드로 감싸지 않는다(이미 카드 안에 놓인 경우 테두리 중첩 방지). */}
      <TableSurface
        surface={surface}
        className={cn(
          "overflow-hidden",
          mobile === "stack" && "hidden md:block",
          isRefetching && "is-refetching",
        )}
      >
        {/* 재조회 중 상단 얇은 진행 바. 전체 스피너로 내용을 덮지 않는다. */}
        {isRefetching ? (
          <div aria-hidden="true" className="h-0.5 w-full animate-pulse bg-accent" />
        ) : null}

        <div className="scroll-x">
          <table
            className={cn(
              "w-full border-collapse text-body md:text-body-sm",
              MIN_WIDTH_CLASSES[tableMinWidth],
            )}
          >
            <caption className="sr-only">{caption}</caption>

            <thead className="bg-surface-sunken text-caption font-semibold text-secondary">
              <tr>
                {columns.map((column, index) => {
                  const isSortable = Boolean(column.sortKey && onSortChange);
                  const isActive = Boolean(
                    column.sortKey && sort?.by === column.sortKey,
                  );
                  const order = sort?.order ?? "ASC";

                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={ariaSortValue(isSortable, isActive, order)}
                      className={cn(
                        "whitespace-nowrap px-3 py-3 align-middle text-left md:px-4 md:py-2",
                        column.align === "right" && "text-right",
                        // 첫 컬럼 고정: 가로 스크롤 시 학번이 항상 보이게 한다.
                        stickyFirstColumn &&
                          index === 0 &&
                          "bg-surface-sunken md:sticky md:left-0 md:z-raised md:border-r md:border-subtle",
                      )}
                    >
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => onSortChange?.(column.sortKey as string)}
                          className="inline-flex min-h-touch items-center gap-1 rounded hover:text-primary focus-ring md:min-h-0"
                        >
                          {column.header}
                          <span aria-hidden="true" className={isActive ? "text-accent" : "text-muted"}>
                            {sortGlyph(isActive, order)}
                          </span>
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}

                {rowActions ? (
                  <th scope="col" className="px-3 py-3 text-left md:px-4 md:py-2">
                    작업
                  </th>
                ) : null}
              </tr>
            </thead>

            <tbody>
              {isLoading
                ? // 헤더는 실제 헤더를 유지한 채 본문만 스켈레톤으로 채운다(높이 점프 최소화).
                  Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-subtle" aria-busy="true">
                      {Array.from({ length: columnCount }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-3 md:px-4">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((row) => (
                    <tr
                      key={getRowKey(row)}
                      className="border-t border-subtle hover:bg-surface-hover"
                    >
                      {columns.map((column, index) => {
                        const cellClassName = cn(
                          "px-3 py-3 align-middle text-primary md:px-4",
                          column.align === "right" && "text-right tabular-nums",
                          stickyFirstColumn &&
                            index === 0 &&
                            "bg-surface md:sticky md:left-0 md:z-raised md:border-r md:border-subtle",
                        );

                        // 첫 컬럼을 고정하는 표는 대체로 교차표다. 이때 첫 셀은 데이터가 아니라
                        // **행 머리**(학과명/강의명/학번)이므로 th scope="row" 로 렌더한다.
                        // 없으면 스크린리더가 "78.3"만 읽고 어느 행인지 말하지 못한다 (design.md 6.7.2).
                        if (stickyFirstColumn && index === 0) {
                          return (
                            <th
                              key={column.key}
                              scope="row"
                              className={cn(cellClassName, "text-left font-medium")}
                            >
                              {column.cell(row)}
                            </th>
                          );
                        }

                        return (
                          <td key={column.key} className={cellClassName}>
                            {column.cell(row)}
                          </td>
                        );
                      })}

                      {rowActions ? (
                        <td className="px-3 py-3 md:px-4">
                          <div className="flex items-center gap-2">{rowActions(row)}</div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </TableSurface>
    </div>
  );
}

interface TableSurfaceProps {
  surface: "card" | "plain";
  className?: string;
  children: ReactNode;
}

/**
 * 표를 감싸는 표면을 고르는 얇은 래퍼.
 * 조건부 JSX 를 표 렌더 본문에 섞지 않기 위해 분리했다.
 *
 * @param surface 'card' 면 Card, 'plain' 이면 단순 div
 * @returns 표 컨테이너
 */
function TableSurface({ surface, className, children }: TableSurfaceProps) {
  if (surface === "plain") {
    return <div className={className}>{children}</div>;
  }
  return (
    <Card padding="none" className={className}>
      {children}
    </Card>
  );
}

interface MobileRowCardProps<T> {
  row: T;
  columns: Column<T>[];
  rowActions?: (row: T) => ReactNode;
}

/**
 * `<md` 에서 표 한 행을 대신하는 카드.
 *
 * 모바일이라고 컬럼을 숨기지 않는다 — 모든 컬럼을 `라벨: 값` 쌍으로 전부 노출해
 * 정보 손실을 0으로 유지한다 (design.md 1.2 원칙).
 *
 * @param row 행 데이터
 * @param columns 컬럼 정의 (표와 동일한 정의를 재사용)
 * @param rowActions 행 액션 렌더 함수
 * @returns 리스트 아이템 카드
 */
function MobileRowCard<T>({ row, columns, rowActions }: MobileRowCardProps<T>) {
  const titleColumn = columns.find((column) => column.mobilePriority === "title");
  const badgeColumn = columns.find((column) => column.mobilePriority === "badge");
  // 상단으로 올라간 컬럼을 제외한 나머지가 본문 정의목록이 된다.
  const bodyColumns = columns.filter(
    (column) => column.mobilePriority !== "title" && column.mobilePriority !== "badge",
  );

  return (
    <li className="rounded-lg border border-subtle bg-surface p-4 shadow-card">
      {titleColumn || badgeColumn ? (
        <div className="flex items-start justify-between gap-3">
          {titleColumn ? (
            <div className="min-w-0 text-body font-semibold text-primary">
              {titleColumn.cell(row)}
            </div>
          ) : null}
          {badgeColumn ? <div className="shrink-0">{badgeColumn.cell(row)}</div> : null}
        </div>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {bodyColumns.map((column) => (
          <div
            key={column.key}
            className={cn(
              "flex flex-col gap-0.5",
              // 강의명처럼 값이 긴 컬럼은 2열을 다 쓰게 한다.
              column.mobilePriority === "full" && "col-span-2",
            )}
          >
            <dt className="text-caption text-muted">{column.header}</dt>
            <dd className="text-body text-primary tabular-nums">{column.cell(row)}</dd>
          </div>
        ))}
      </dl>

      {rowActions ? (
        <div className="mt-4 flex gap-2">{rowActions(row)}</div>
      ) : null}
    </li>
  );
}
