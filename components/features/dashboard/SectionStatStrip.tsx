import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/feedback/Skeleton";

/**
 * 아이콘 슬롯 톤 (design.md 4.21.1).
 *
 * KPI 카드(4.14)가 warning/danger 를 금지한 것과 모순이 아니다 — 그 규칙은 *중립적인 집계 숫자*에
 * 상태색을 칠하지 말라는 것이고, 여기서 warning/danger 가 붙는 항목은 그 자체가
 * **"확인 필요"라는 판정 결과**(인플레이션 의심 / 학사경고 위험군)다.
 * 판단 기준: 라벨 텍스트만 읽어도 "확인이 필요하다"가 성립하면 써도 된다.
 */
const ICON_SLOT_CLASSES = {
  neutral: "bg-surface text-secondary", // 규모·개수
  accent: "bg-accent-subtle text-accent-strong", // 기준선·대표값
  success: "bg-success-subtle text-success-strong", // 좋은 방향의 값
  warning: "bg-warning-subtle text-warning-strong", // 확인이 필요한 개수
  danger: "bg-danger-subtle text-danger-strong", // 위험군 섹션 전용
} as const;

/** 스트립 칩 톤. */
export type SectionStatTone = keyof typeof ICON_SLOT_CLASSES;

/** lg 이상에서의 열 수 → 클래스 정적 매핑(동적 조합 금지). */
const COLUMN_CLASSES = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
} as const;

/** 스트립 열 수. 5개 이상을 넣지 않는 이유는 SectionStatStrip 주석 참고. */
export type SectionStatColumns = keyof typeof COLUMN_CLASSES;

/** 스트립 칩 1개. */
export interface SectionStatItem {
  key: string;
  /** h-4 w-4 인라인 SVG */
  icon?: ReactNode;
  /** 지표명 */
  label: string;
  /** 이미 포맷된 값 */
  value: ReactNode;
  tone?: SectionStatTone;
  /** 값 옆 작은 배지(편차·플래그 개수 등) */
  badge?: ReactNode;
}

interface SectionStatStripProps {
  /** 2~4개. **5개 이상 넣지 않는다** — 스트립이 두 번째 표가 된다 */
  items: SectionStatItem[];
  /** lg 이상에서의 열 수 */
  columns?: SectionStatColumns;
  className?: string;
}

/**
 * 섹션 상단 지표 스트립 (design.md 4.21.1).
 *
 * "표만 있는 섹션"을 막는 장치다. 표시하는 값은 전부 **응답 필드이거나 응답 필드의 단순 집계**
 * (최댓값·개수·차)이며 지어낸 수치가 없다.
 *
 * `MetricCard` 를 쓰지 않는 이유: `MetricCard` 는 `Card` 라 그림자를 갖는다.
 * 섹션 카드 안에 들어가면 카드 속 카드가 되어 그림자 계층(카드 안쪽 = 0층)을 깬다.
 *
 * @param items 칩 목록
 * @param columns lg 이상 열 수
 * @returns 지표 스트립
 */
export function SectionStatStrip({
  items,
  columns = 4,
  className,
}: SectionStatStripProps) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-3 rounded-lg bg-surface-sunken p-3 sm:grid-cols-2 md:p-4",
        COLUMN_CLASSES[columns],
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.key} className="flex min-w-0 items-center gap-3">
          {item.icon ? (
            <span
              aria-hidden="true"
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-md",
                ICON_SLOT_CLASSES[item.tone ?? "neutral"],
              )}
            >
              {item.icon}
            </span>
          ) : null}

          {/* min-w-0 이 없으면 긴 라벨이 truncate 되지 않고 칩을 밀어낸다. */}
          <div className="min-w-0">
            <p className="truncate text-caption text-muted">{item.label}</p>
            <p className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-body font-semibold tabular-nums text-primary md:text-section">
                {item.value}
              </span>
              {item.badge}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * 스트립 자리의 로딩 스켈레톤.
 * 실제 스트립과 비슷한 높이 1장으로 대체해 로딩 → 완료 전환의 높이 점프를 줄인다.
 *
 * @returns 스켈레톤 블록
 */
export function SectionStatStripSkeleton() {
  return <Skeleton className="h-20 w-full rounded-lg" />;
}
