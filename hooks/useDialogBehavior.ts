"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * 모달·드로어 등 오버레이 공통 동작을 담당하는 훅.
 *
 * 처리하는 것 (design.md 6.3):
 * 1) 열려 있는 동안 body 스크롤 잠금
 * 2) Esc 키로 닫기
 * 3) 포커스 트랩 — Tab/Shift+Tab 이 패널 밖으로 빠져나가지 않게 순환
 * 4) 열릴 때 초기 포커스 이동, 닫힐 때 직전 포커스 요소로 복귀
 *
 * 모달과 드로어가 같은 로직을 각자 갖지 않도록 하나로 묶었다.
 *
 * @param open 오버레이 표시 여부
 * @param onClose Esc 등으로 닫아야 할 때 호출되는 콜백
 * @param initialFocusRef 열릴 때 포커스를 줄 요소. 없으면 패널 내 첫 포커스 대상
 * @returns 패널 요소에 연결할 ref
 */
export function useDialogBehavior<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement>,
): RefObject<T> {
  const panelRef = useRef<T>(null);
  // 오버레이를 연 요소. 닫힐 때 여기로 포커스를 되돌린다.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // 배경 스크롤 잠금. 원래 값을 기억해 두었다가 정확히 되돌린다.
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /** 패널 안에서 현재 포커스를 받을 수 있는 요소들을 수집한다. */
    const getFocusableElements = (): HTMLElement[] => {
      const panel = panelRef.current;
      if (!panel) return [];

      const selector =
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(panel.querySelectorAll<HTMLElement>(selector));
    };

    // 초기 포커스: 지정된 요소 → 없으면 패널 내 첫 포커스 대상 → 없으면 패널 자체
    const focusTarget =
      initialFocusRef?.current ?? getFocusableElements()[0] ?? panelRef.current;
    focusTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // 경계에 도달했을 때만 수동으로 순환시킨다. 그 외에는 브라우저 기본 동작에 맡긴다.
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      // 오버레이가 닫히면 사용자가 원래 있던 자리로 포커스를 되돌린다.
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose, initialFocusRef]);

  return panelRef;
}
