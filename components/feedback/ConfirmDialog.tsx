"use client";

import { useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

/**
 * 확인 버튼의 성격 (design.md 4.9 / 4.33.5).
 *
 * - `danger`  : 되돌릴 수 없는 파괴적 작업(삭제). **기본값이다.**
 * - `accent`  : 파괴적이지 않은 확인(대용량 엑셀 다운로드 등). 취소해도 잃는 것이 없다.
 *
 * 기본값을 `danger` 로 두는 이유: 기존 삭제 확인 호출부들이 `tone` 을 넘기지 않고도
 * 지금과 완전히 동일하게 동작해야 한다(회귀 방지).
 */
export type ConfirmDialogTone = "danger" | "accent";

/** 톤 → 확인 버튼 variant 매핑. 정적 매핑이라 조건문이 JSX 로 새어나가지 않는다. */
const CONFIRM_BUTTON_VARIANT = {
  danger: "danger",
  accent: "primary",
} as const;

interface ConfirmDialogProps {
  /** 표시 여부 */
  open: boolean;
  /** 모달 제목 */
  title: string;
  /** 설명 문구. 무엇이 삭제되는지 구체적으로 적는다 */
  description: string;
  /** 확정 버튼 라벨 */
  confirmLabel?: string;
  /** 취소 버튼 라벨 */
  cancelLabel?: string;
  /** 확정 처리 중이면 버튼 로딩 + 중복 클릭 차단 */
  loading?: boolean;
  /** 확인 버튼의 성격. 기본 'danger'(삭제) */
  tone?: ConfirmDialogTone;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 액션 확인 모달 (design.md 4.9 / 4.33.5).
 *
 * 모바일에서는 바텀시트, md 이상에서는 중앙 카드로 나타난다.
 * **초기 포커스는 톤과 무관하게 항상 [취소]** 다 — 다이얼로그마다 포커스 규약이 다르면
 * 예측 가능성이 깨지고, Enter 연타로 무거운 작업이 시작되는 사고도 막아준다.
 *
 * @param open 표시 여부
 * @param title 제목
 * @param description 설명
 * @param confirmLabel/cancelLabel 버튼 라벨
 * @param loading 확정 처리 중 여부
 * @param tone 확인 버튼의 성격 ('danger' 기본 / 'accent')
 * @param onConfirm 확정 핸들러
 * @param onCancel 취소/닫기 핸들러
 * @returns 모달 요소. open 이 false 면 아무것도 렌더하지 않는다
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "삭제",
  cancelLabel = "취소",
  loading = false,
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // 제목/설명을 aria 로 연결하기 위한 고유 id.
  const titleId = useId();
  const descriptionId = useId();

  // 초기 포커스 대상 = 취소 버튼 (파괴적 액션 오조작 방지)
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useDialogBehavior<HTMLDivElement>(open, onCancel, cancelButtonRef);

  if (!open) return null;

  return (
    <>
      {/* 백드롭. 클릭으로도 닫히지만 처리 중에는 닫지 않는다. */}
      <div
        className="fixed inset-0 z-overlay bg-overlay/50 animate-fade-in"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-modal flex items-end justify-center md:items-center md:p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="w-full rounded-t-2xl bg-surface-raised p-5 shadow-overlay animate-slide-in-bottom md:max-w-modal md:rounded-xl md:p-6 md:animate-scale-in"
        >
          <h2 id={titleId} className="text-title font-semibold text-primary">
            {title}
          </h2>
          <p id={descriptionId} className="mt-2 text-body text-secondary">
            {description}
          </p>

          {/* 모바일에서는 flex-col-reverse 로 주 버튼이 위에 오게 한다(엄지 도달). */}
          <div className="mt-6 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <Button
              ref={cancelButtonRef}
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
              fullWidth
              className="md:w-auto"
            >
              {cancelLabel}
            </Button>
            {/* 파괴적이지 않은 확인(다운로드 등)이 빨간 버튼으로 보이면
                "되돌릴 수 없는 작업"으로 오독된다. 그래서 톤을 variant 로 매핑한다. */}
            <Button
              variant={CONFIRM_BUTTON_VARIANT[tone]}
              onClick={onConfirm}
              loading={loading}
              fullWidth
              className="md:w-auto"
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
