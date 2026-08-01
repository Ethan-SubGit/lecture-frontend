import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * 아이콘 슬롯 톤 (design.md 4.12).
 *
 * - neutral  : 일반 빈 상태(기본)
 * - danger   : 에러성 빈 상태(찾을 수 없음 등)
 * - positive : **위험군 학생 0명 전용.** "해당자가 없다"가 문제가 아니라 성과인 유일한 빈 상태다.
 *              다른 곳에 쓰지 않는다 — 남용하면 "빈 상태 = 초록"이라는 잘못된 학습이 생긴다.
 *
 * 클래스는 전부 정적 문자열이다(`bg-${tone}` 같은 동적 조합은 Tailwind 가 스캔하지 못한다).
 */
const ICON_SLOT_CLASSES = {
  neutral: "bg-surface-sunken text-muted",
  danger: "bg-danger-subtle text-danger-strong",
  positive: "bg-success-subtle text-success-strong",
} as const;

/** 빈 상태 톤 유니온. */
export type EmptyStateTone = keyof typeof ICON_SLOT_CLASSES;

interface EmptyStateProps {
  /**
   * 원형 슬롯에 들어가는 아이콘. 인라인 SVG 는 `h-6 w-6 md:h-8 md:w-8` 로 넘긴다.
   * (선택 유지 — 아이콘 없이 호출하는 기존 화면들이 그대로 동작해야 한다)
   */
  icon?: ReactNode;
  /** 아이콘 슬롯 톤 */
  tone?: EmptyStateTone;
  /** 빈 상태 제목. 문구는 spec.md 6절 표를 그대로 쓴다 */
  title: string;
  /** 보조 설명 */
  description?: string;
  /** 주 액션 (예: [수강과목 생성]) */
  action?: ReactNode;
  /** 보조 액션 */
  secondaryAction?: ReactNode;
  className?: string;
}

/**
 * 데이터 0건 / 404 / 미선택 상태를 표현하는 빈 상태 블록 (design.md 4.12).
 *
 * 빈 상태·에러에 텍스트만 두지 않는다 — 아이콘은 **원형 슬롯**에 담아 톤으로 성격을 구분한다.
 * 일러스트 이미지 파일은 쓰지 않는다(다크모드 대응 비용).
 *
 * @param icon 아이콘 노드
 * @param tone 아이콘 슬롯 톤
 * @param title 제목
 * @param description 설명
 * @param action 주 액션
 * @param secondaryAction 보조 액션
 * @returns 빈 상태 요소
 */
export function EmptyState({
  icon,
  tone = "neutral",
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-subtle bg-surface px-4 py-12 text-center md:py-16",
        className,
      )}
    >
      {icon ? (
        // text-title/display 는 글리프 문자를 아이콘으로 넘기는 기존 호출부(🧭 등)를 위한 크기다.
        // 인라인 SVG 아이콘은 자기 h-*/w-* 클래스를 갖고 오므로 영향을 받지 않는다.
        <span
          aria-hidden="true"
          className={cn(
            "grid h-12 w-12 place-items-center rounded-full text-title md:h-16 md:w-16 md:text-display",
            ICON_SLOT_CLASSES[tone],
          )}
        >
          {icon}
        </span>
      ) : null}

      <p className="text-section font-semibold text-primary">{title}</p>
      {description ? (
        <p className="max-w-prose text-body text-muted">{description}</p>
      ) : null}

      {action || secondaryAction ? (
        <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
