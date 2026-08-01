"use client";

import { cn } from "@/lib/cn";
import { PAGE_SIZE_OPTIONS } from "@/lib/constants";
import { formatCount } from "@/lib/format";

interface PaginationProps {
  /** 현재 페이지 (1부터) */
  page: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 전체 건수 */
  total: number;
  /** 현재 페이지 크기. onPageSizeChange 와 함께 주면 셀렉트가 노출된다 */
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

/** 데스크탑에서 한 번에 보여줄 페이지 번호 최대 개수. */
const MAX_VISIBLE_PAGES = 7;

/**
 * 현재 페이지 주변의 페이지 번호 목록을 만든다.
 *
 * 전체가 MAX_VISIBLE_PAGES 이하면 전부, 아니면 현재 페이지를 가운데 두고 잘라낸다.
 * 앞/뒤 경계에서는 창을 밀어 항상 같은 개수를 유지한다(버튼 개수가 흔들리지 않게).
 *
 * @param page 현재 페이지
 * @param totalPages 전체 페이지 수
 * @returns 표시할 페이지 번호 배열
 */
function buildPageNumbers(page: number, totalPages: number): number[] {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(MAX_VISIBLE_PAGES / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);
  // 뒤쪽 경계에 붙었으면 시작점을 앞으로 당겨 개수를 채운다.
  start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/** 페이지 버튼 공통 클래스. 모바일에서 44px 터치 타깃을 보장한다. */
const PAGE_BUTTON_CLASS =
  "inline-flex min-h-touch min-w-touch items-center justify-center rounded px-3 text-body focus-ring disabled:pointer-events-none disabled:opacity-50 md:h-control-dense md:min-h-0 md:min-w-0";

/**
 * 페이지네이션 (design.md 4.6).
 *
 * 모바일은 [이전] [n/m] [다음] 3개만, md 이상에서 번호 목록,
 * lg 이상에서 페이지 크기 셀렉트가 추가로 노출된다.
 * totalPages 를 넘는 이동은 버튼 disabled 로 원천 차단한다.
 *
 * @returns 페이지네이션 요소
 */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const pageNumbers = buildPageNumbers(page, totalPages);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <nav
      aria-label="페이지 이동"
      className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
    >
      {/* 결과 개수는 aria-live 로 알려 재조회 결과를 스크린리더가 인지하게 한다. */}
      <p aria-live="polite" className="text-caption text-muted">
        총 {formatCount(total)}건 · {page}/{Math.max(totalPages, 1)} 페이지
      </p>

      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrevious}
          className={PAGE_BUTTON_CLASS}
        >
          <span aria-hidden="true">‹</span>
          <span className="sr-only">이전 페이지</span>
        </button>

        {/* 모바일 전용 현재 위치 표시. 번호 목록을 숨겨도 정보 손실이 없다. */}
        <span className="px-3 text-body text-secondary tabular-nums md:hidden">
          {page} / {Math.max(totalPages, 1)}
        </span>

        {pageNumbers.map((pageNumber) => {
          const isCurrent = pageNumber === page;
          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                PAGE_BUTTON_CLASS,
                "hidden md:inline-flex",
                isCurrent
                  ? "bg-accent font-semibold text-on-accent"
                  : "text-secondary hover:bg-surface-hover",
              )}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
          className={PAGE_BUTTON_CLASS}
        >
          <span aria-hidden="true">›</span>
          <span className="sr-only">다음 페이지</span>
        </button>
      </div>

      {/* 페이지 크기 셀렉트는 lg 이상에서만. 모바일에서는 필터 바의 "표시 개수"가 대신한다. */}
      {pageSize !== undefined && onPageSizeChange ? (
        <div className="hidden items-center gap-2 lg:flex">
          <label htmlFor="pagination-page-size" className="text-caption text-muted">
            페이지당
          </label>
          <select
            id="pagination-page-size"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-control-dense rounded border border-strong bg-surface px-2 text-body text-primary focus-ring"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}건
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </nav>
  );
}
