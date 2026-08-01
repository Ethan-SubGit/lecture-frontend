import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 배지 톤 정의. 색은 토큰만 사용한다 (design.md 4.8). */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-caption font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunken text-secondary border border-subtle",
        accent: "bg-accent-subtle text-accent-strong",
        success: "bg-success-subtle text-success-strong",
        warning: "bg-warning-subtle text-warning-strong",
        danger: "bg-danger-subtle text-danger-strong",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

/** 배지 톤 유니온. GradeBadge 등 파생 컴포넌트가 재사용한다. */
export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

interface BadgeProps {
  tone?: BadgeTone;
  /** 좌측 글리프 아이콘. 색 외 단서로 사용하며 스크린리더에는 숨긴다 */
  icon?: ReactNode;
  /**
   * 마우스 사용자용 보조 설명(판정 근거 등).
   * ⚠️ 터치 기기에는 hover 가 없으므로 **유일한 정보 경로가 되어서는 안 된다** —
   * 같은 문구를 각주로도 노출한 경우에만 쓴다 (design.md 4.24.1).
   */
  title?: string;
  className?: string;
  children: ReactNode;
}

/**
 * 상태·분류 표시용 배지.
 *
 * @param tone 색 톤
 * @param icon 좌측 아이콘 (aria-hidden 처리됨)
 * @param title 보조 설명 툴팁
 * @param children 배지 텍스트
 * @returns 배지 요소
 */
export function Badge({ tone, icon, title, className, children }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} title={title}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}
