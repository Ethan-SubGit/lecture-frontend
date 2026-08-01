import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { EmptyState, type EmptyStateTone } from "@/components/feedback/EmptyState";
import { FilterOffIcon } from "@/components/ui/icons";
import { NETWORK_ERROR_MESSAGE } from "@/lib/constants";
import type { AsyncDataState } from "@/hooks/useAsyncData";

/**
 * 확장 분석 8개 섹션의 공통 껍데기 (design.md 4.20).
 *
 * spec.md 6.1 이 요구하는 **"섹션 = 로딩·빈·에러·재시도의 단위"** 를 여기 한 곳에서 구현한다.
 * `GradeDistributionPanel` 이 이미 쓰는 "패널이 빈/로딩을 단일 지점에서 판정" 패턴의 일반화판이며,
 * 섹션 컴포넌트 8개는 자기 빈 상태·에러 UI 를 각자 만들지 않는다(만들면 8벌이 미묘하게 달라진다).
 */

/** 섹션 상태. `useAsyncData` 의 반환값에서 유도한다. */
export type DashboardSectionState =
  | "loading"
  | "refetching"
  | "error"
  | "empty"
  | "success";

/** 모든 섹션이 공유하는 기준선 문구 (spec.md 3.7 공통 전제 — 이번 라운드는 무필터). */
const DEFAULT_BASELINE_NOTE = "전체 기간 · 전체 학과 · 전체 강의 기준";

/**
 * 조회 상태 → 섹션 상태 유도 (design.md 4.20).
 *
 * ⚠️ `error` 를 `empty` 보다 **먼저** 판정한다. 실패했는데 "데이터가 없습니다"로 보이면
 * 사용자가 재시도할 방법을 찾지 못한다.
 * 401 은 여기 오지 않는다 — fetch 래퍼의 전역 처리에 맡긴다(spec.md 6.1 결정 4).
 *
 * @param query useAsyncData 반환값
 * @param isEmpty 섹션별 빈 판정(예: items.length === 0, totalCount === 0)
 * @returns 섹션 상태
 */
export function deriveSectionState<T>(
  query: AsyncDataState<T>,
  isEmpty: (data: T) => boolean,
): DashboardSectionState {
  if (query.isLoading) return "loading";
  if (query.error) return "error";
  if (!query.data) return "loading";
  if (isEmpty(query.data)) return "empty";
  if (query.isRefetching) return "refetching";
  return "success";
}

interface DashboardSectionProps {
  /** 앵커 id. `<section id>` 에 그대로 들어간다 (예: "score-histogram") */
  id: string;
  /** 섹션 제목 (h3) */
  title: string;
  /** 이 섹션이 무슨 질문에 답하는가 1줄. 로딩 중에도 보인다 (spec.md 6.1 결정 6) */
  description: ReactNode;
  /** h-5 w-5 인라인 SVG. 섹션마다 다르다 */
  icon: ReactNode;
  /** 제목 옆 인라인 배지 (그룹 B·C 는 "상세") */
  badge?: ReactNode;
  /** 집계 기준 문구. 섹션마다 1회 노출이 강제된다 */
  baselineNote?: string;
  state: DashboardSectionState;
  /** 이 섹션 1건만 재요청한다 (spec.md 6.1 결정 3) */
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** positive 는 위험군 0명 전용 */
  emptyTone?: Extract<EmptyStateTone, "neutral" | "positive">;
  /** 빈 상태 아이콘. 텍스트만 두지 않는다 */
  emptyIcon: ReactNode;
  /** 로딩 중 본문 자리. **실제 본문과 비슷한 높이**여야 아래 섹션이 튀지 않는다 */
  skeleton: ReactNode;
  /** 카드 하단 각주 목록 */
  footnotes?: string[];
  /** state 가 success/refetching 일 때만 렌더된다 */
  children: ReactNode;
}

/**
 * 확장 분석 섹션 카드.
 *
 * 제목·설명·기준선 문구는 **어떤 상태에서도 항상 보인다** — 로딩 중에 무엇이 오고 있는지,
 * 비었을 때 무엇이 비었는지를 알 수 있어야 하기 때문이다.
 * 에러 배너는 조건부 마운트라 8개 섹션이 첫 진입에 alert 를 동시에 쏘지 않는다(design.md 6.7.5).
 *
 * @param id 앵커 id
 * @param title 섹션 제목
 * @param description 섹션 설명
 * @param icon 헤더 아이콘
 * @param badge 제목 옆 배지
 * @param baselineNote 집계 기준 문구
 * @param state 섹션 상태
 * @param onRetry 이 섹션만 재조회하는 핸들러
 * @param emptyTitle/emptyDescription/emptyTone/emptyIcon 빈 상태 구성
 * @param skeleton 로딩 본문
 * @param footnotes 각주 목록
 * @param children 성공 시 본문
 * @returns 섹션 요소
 */
export function DashboardSection({
  id,
  title,
  description,
  icon,
  badge,
  baselineNote = DEFAULT_BASELINE_NOTE,
  state,
  onRetry,
  emptyTitle = "표시할 데이터가 없습니다.",
  emptyDescription,
  emptyTone = "neutral",
  emptyIcon,
  skeleton,
  footnotes,
  children,
}: DashboardSectionProps) {
  const titleId = `${id}-title`;

  return (
    <section id={id} aria-labelledby={titleId}>
      <Card>
        <CardHeader
          as="h3"
          titleId={titleId}
          icon={icon}
          badge={badge}
          title={title}
          description={description}
        />

        {/* 기준선 문구 — 제목 블록 바로 아래, 본문 위.
            이번 라운드는 필터가 없으므로 "조건 없이 본 숫자"임을 섹션마다 1번씩 밝힌다. */}
        <p className="-mt-2 mb-4 inline-flex items-center gap-1.5 rounded-sm bg-surface-sunken px-2 py-0.5 text-micro text-muted md:text-caption">
          <FilterOffIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="sr-only">집계 기준: </span>
          {baselineNote}
        </p>

        {/* 본문 — 상태에 따라 정확히 하나만 렌더된다. */}
        {state === "loading" ? (
          <div aria-busy="true">
            {skeleton}
            <span className="sr-only">불러오는 중</span>
          </div>
        ) : null}

        {state === "error" ? (
          <AlertBanner
            tone="error"
            title={NETWORK_ERROR_MESSAGE}
            description="이 섹션만 불러오지 못했습니다. 다른 항목은 정상입니다."
            action={
              onRetry ? (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  다시 시도
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {state === "empty" ? (
          <EmptyState
            icon={emptyIcon}
            tone={emptyTone}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : null}

        {state === "success" || state === "refetching" ? (
          // 재조회 중에는 내용을 지우지 않고 흐림 + 비활성으로만 표현한다(이 섹션에만 적용된다).
          <div className={cn(state === "refetching" && "is-refetching")}>{children}</div>
        ) : null}

        {footnotes && footnotes.length > 0 ? (
          <ul className="mt-4 space-y-1 border-t border-subtle pt-3">
            {footnotes.map((footnote) => (
              <li key={footnote} className="flex gap-1.5 text-caption text-muted">
                <span aria-hidden="true">※</span>
                {footnote}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </section>
  );
}
