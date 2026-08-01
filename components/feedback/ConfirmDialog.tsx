"use client";

import { useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

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
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 파괴적 액션(삭제) 확인 모달 (design.md 4.9).
 *
 * 모바일에서는 바텀시트, md 이상에서는 중앙 카드로 나타난다.
 * 초기 포커스를 [취소]에 두어 오조작으로 삭제되는 일을 막는다.
 *
 * @param open 표시 여부
 * @param title 제목
 * @param description 설명
 * @param confirmLabel/cancelLabel 버튼 라벨
 * @param loading 확정 처리 중 여부
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
            <Button
              variant="danger"
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
