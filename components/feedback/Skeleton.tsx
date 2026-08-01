import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";

/**
 * 로딩 스켈레톤 프리셋 모음 (design.md 4.13).
 *
 * 모든 스켈레톤 컨테이너는 aria-busy 와 sr-only "불러오는 중" 을 함께 제공해
 * 스크린리더 사용자가 빈 화면을 마주하지 않게 한다.
 */

interface SkeletonProps {
  className?: string;
}

/** 스켈레톤 한 조각. 크기는 호출부가 유틸 클래스로 지정한다. */
export function Skeleton({ className }: SkeletonProps) {
  return <span className={cn("skeleton block", className)} aria-hidden="true" />;
}

/** 스크린리더 전용 로딩 안내. 스켈레톤 컨테이너마다 1개씩 넣는다. */
function LoadingAnnouncement() {
  return <span className="sr-only">불러오는 중</span>;
}

interface CardListSkeletonProps {
  /** 렌더할 카드 개수 */
  count?: number;
}

/** 모바일 카드 스택용 스켈레톤. */
export function CardListSkeleton({ count = 3 }: CardListSkeletonProps) {
  return (
    <div aria-busy="true" className="space-y-3">
      <LoadingAnnouncement />
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-subtle bg-surface p-4 shadow-card"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/**
 * 대시보드 KPI 카드 5개 스켈레톤.
 * 실제 카드(아이콘 슬롯 + 라벨/값 + 힌트)와 같은 골격·같은 그리드를 써서
 * 로딩이 끝났을 때 레이아웃이 점프하지 않게 한다 (design.md 4.14 loading).
 */
export function MetricCardsSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:gap-6 xl:grid-cols-5"
    >
      <LoadingAnnouncement />
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index}>
          <div className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg md:h-12 md:w-12" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2 h-8 w-24" />
            </div>
          </div>
          <Skeleton className="mt-3 h-4 w-32" />
        </Card>
      ))}
    </div>
  );
}

interface DetailSkeletonProps {
  /** 라벨/값 쌍 개수 */
  rows?: number;
}

/** 상세 화면(정의목록) 스켈레톤. */
export function DetailSkeleton({ rows = 6 }: DetailSkeletonProps) {
  return (
    <Card>
      <div aria-busy="true" className="grid grid-cols-1 gap-4 md:grid-cols-detail-2">
        <LoadingAnnouncement />
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="contents">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full md:w-1/2" />
          </div>
        ))}
      </div>
    </Card>
  );
}

interface FormSkeletonProps {
  /** 필드 개수 */
  fields?: number;
}

/** 폼 화면(수정 진입 시 초기 조회 중) 스켈레톤. */
export function FormSkeleton({ fields = 3 }: FormSkeletonProps) {
  return (
    <Card>
      <div aria-busy="true" className="space-y-5">
        <LoadingAnnouncement />
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-control w-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}
