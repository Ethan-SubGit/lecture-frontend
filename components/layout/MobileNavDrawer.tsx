"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/icons";
import { SidebarNav } from "./SidebarNav";

/** 드로어를 연 경로에 따라 초기 포커스를 어디에 줄지 결정한다. */
export type DrawerInitialFocus = "nav" | "account";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  /** 'nav'(햄버거 경유) → 닫기 버튼 / 'account'(아바타 경유) → 계정 섹션 [로그아웃] */
  initialFocus?: DrawerInitialFocus;
}

/**
 * lg(1024) 미만 전용 내비게이션 드로어 (design.md 4.2.4).
 *
 * "모바일 전용"이 아니라 "lg 미만 전용"이다 — 768px 태블릿 세로에서 사이드바(272px)를
 * 떼면 콘텐츠가 496px밖에 남지 않아 md: 2열 레이아웃이 무너지기 때문이다(결정 F).
 *
 * 데스크탑 사이드바가 좌측에 있으므로 드로어도 좌측에서 슬라이드인한다.
 * 닫혀 있을 때는 DOM 에서 완전히 사라진다 — `<nav aria-label="주 메뉴">` 랜드마크가
 * 사이드바와 중복되면 안 되기 때문이다(design.md 6.4).
 *
 * @param open 열림 여부
 * @param onClose 닫기 핸들러
 * @param initialFocus 초기 포커스 위치
 * @returns 드로어 요소. 닫혀 있으면 렌더하지 않는다
 */
export function MobileNavDrawer({
  open,
  onClose,
  initialFocus = "nav",
}: MobileNavDrawerProps) {
  const pathname = usePathname();
  const { user, displayName, signOut } = useAuth();

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const signOutButtonRef = useRef<HTMLButtonElement>(null);
  // 아바타로 열었으면 계정 섹션이 목적지이므로 그쪽으로 바로 포커스를 옮긴다.
  const initialFocusRef = initialFocus === "account" ? signOutButtonRef : closeButtonRef;
  // Esc·포커스 트랩·body 스크롤 잠금·포커스 복귀는 모달과 공유하는 훅이 처리한다.
  const panelRef = useDialogBehavior<HTMLDivElement>(open, onClose, initialFocusRef);

  // 링크 클릭 외의 경로 변경(뒤로가기 등)에도 드로어를 닫는다.
  useEffect(() => {
    if (open) onClose();
    // pathname 변화에만 반응해야 하므로 open/onClose 는 의존성에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-overlay bg-overlay/50 animate-fade-in lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        id="app-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="주 메뉴"
        className="fixed inset-y-0 left-0 z-drawer flex w-drawer max-w-full flex-col bg-surface shadow-overlay animate-slide-in-left lg:hidden"
      >
        <div className="flex h-header shrink-0 items-center gap-3 border-b border-subtle px-4">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-caption font-bold text-on-accent"
          >
            성
          </span>
          <span className="min-w-0 truncate text-section font-semibold text-primary">
            성적관리
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="ml-auto inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-secondary transition-colors duration-fast hover:bg-surface-hover hover:text-primary focus-ring focus-visible:ring-offset-surface"
          >
            <CloseIcon />
          </button>
        </div>

        {/* 사이드바와 완전히 동일한 아코디언 계층. 링크를 고르면 드로어가 닫힌다. */}
        <SidebarNav onNavigate={onClose} />

        {/* 계정 섹션 — <lg 상단바에는 로그아웃이 없다. 정보가 사라진 게 아니라 여기로 이동한 것이다. */}
        <div id="drawer-account" className="shrink-0 border-t border-subtle p-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-subtle text-caption font-semibold text-accent-strong"
            >
              {displayName?.charAt(0) ?? "·"}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body font-medium text-primary">
                {displayName ?? ""}
              </span>
              {user ? (
                <span className="truncate text-caption text-muted">{user.loginId}</span>
              ) : null}
            </span>
          </div>
          <Button
            ref={signOutButtonRef}
            variant="secondary"
            fullWidth
            className="mt-4"
            onClick={signOut}
          >
            로그아웃
          </Button>
        </div>
      </div>
    </>
  );
}
