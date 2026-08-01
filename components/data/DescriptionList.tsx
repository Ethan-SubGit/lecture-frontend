import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EMPTY_VALUE_PLACEHOLDER } from "@/lib/format";

/** 정의목록 항목 1개. */
export interface DescriptionItem {
  label: string;
  /** 값. null/undefined 면 대체 문자와 sr-only 안내가 표시된다 */
  value: ReactNode;
  /** 값이 길면 'full' 로 지정해 2열을 다 쓰게 한다 */
  span?: "full";
}

interface DescriptionListProps {
  items: DescriptionItem[];
  className?: string;
}

/**
 * 상세 화면 공통 정의목록 (design.md 4.18).
 *
 * 모바일은 라벨 위 / 값 아래 1열, md 이상은 라벨-값 2열이다.
 *
 * @param items 라벨/값 쌍 목록
 * @returns dl 요소
 */
export function DescriptionList({ items, className }: DescriptionListProps) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-detail-2",
        className,
      )}
    >
      {items.map((item) => {
        // 빈 값은 대시로 표시하되 스크린리더에는 "값 없음"으로 명확히 알린다.
        const isEmpty = item.value === null || item.value === undefined || item.value === "";

        return (
          <div
            key={item.label}
            className={cn("contents", item.span === "full" && "md:block")}
          >
            <dt className="text-caption font-medium text-muted">{item.label}</dt>
            <dd className="text-body text-primary break-words">
              {isEmpty ? (
                <>
                  <span aria-hidden="true">{EMPTY_VALUE_PLACEHOLDER}</span>
                  <span className="sr-only">값 없음</span>
                </>
              ) : (
                item.value
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
