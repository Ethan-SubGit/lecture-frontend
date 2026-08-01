import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * 배너 톤별 색과 아이콘 (design.md 4.11).
 * 색 외 단서로 좌측 아이콘을 반드시 함께 쓴다.
 */
const bannerVariants = cva("flex items-start gap-3 rounded-lg border p-4", {
  variants: {
    tone: {
      error: "border-danger bg-danger-subtle text-danger-strong",
      warning: "border-warning bg-warning-subtle text-warning-strong",
      success: "border-success bg-success-subtle text-success-strong",
      info: "border-accent bg-accent-subtle text-accent-strong",
    },
  },
  defaultVariants: { tone: "info" },
});

/** 배너 톤 유니온. */
export type AlertTone = NonNullable<VariantProps<typeof bannerVariants>["tone"]>;

/** 톤별 글리프. 색을 못 보는 사용자에게 의미를 전달하는 1차 단서다. */
const TONE_ICONS: Record<AlertTone, string> = {
  error: "✕",
  warning: "⚠",
  success: "✓",
  info: "ⓘ",
};

interface AlertBannerProps {
  tone?: AlertTone;
  /** 배너 제목 (필수 메시지) */
  title: string;
  /** 보조 설명 */
  description?: ReactNode;
  /** 우측/하단 액션 (예: [다시 시도]) */
  action?: ReactNode;
  /** 닫기 핸들러. 주면 닫기 버튼이 렌더된다 */
  onDismiss?: () => void;
  className?: string;
}

/**
 * 폼 상단·페이지 본문에 놓는 알림 배너.
 *
 * 배치 규칙 (spec.md 6절 / design.md 4.11):
 * - 네트워크/5xx → 본문 상단 배너 + [다시 시도]
 * - 폼 검증 중 필드 특정 가능 → 배너가 아니라 필드 하단 인라인
 * - 폼 검증 중 필드 특정 불가(400) → 폼 상단 배너
 *
 * @param tone 색 톤
 * @param title 제목
 * @param description 설명
 * @param action 액션 노드
 * @param onDismiss 닫기 핸들러
 * @returns 배너 요소
 */
export function AlertBanner({
  tone = "info",
  title,
  description,
  action,
  onDismiss,
  className,
}: AlertBannerProps) {
  return (
    <div
      className={cn(bannerVariants({ tone }), className)}
      // 에러는 즉시 읽어주고(assertive), 나머지는 방해하지 않게 polite 로 알린다.
      role={tone === "error" ? "alert" : "status"}
    >
      <span aria-hidden="true" className="text-body font-semibold">
        {TONE_ICONS[tone]}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{title}</p>
        {description ? <div className="mt-1 text-caption">{description}</div> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="알림 닫기"
          className="-m-1 inline-flex min-h-touch min-w-touch items-center justify-center rounded focus-ring"
        >
          <span aria-hidden="true">✕</span>
        </button>
      ) : null}
    </div>
  );
}
