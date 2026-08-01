"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { MenuIcon } from "@/components/ui/icons";
import { resolveNavLocation } from "./nav-items";

interface TopBarProps {
  /** 햄버거 클릭 — 드로어를 열고 닫기 버튼에 포커스한다 */
  onOpenNav: () => void;
  /** 아바타 클릭(<lg) — 드로어를 열고 계정 섹션으로 포커스를 옮긴다 */
  onOpenAccount: () => void;
  /** 드로어 열림 여부. 햄버거의 aria-expanded/라벨에 반영한다 */
  isNavOpen: boolean;
}

/**
 * 상단바 (design.md 4.2.3).
 *
 * 사용자 신원 표시 + 로그아웃 + (<lg) 드로어 트리거만 담는다.
 * **메뉴 링크를 두지 않는다** — 이동 경로는 사이드바/드로어로 단일화한다(결정 A).
 *
 * 반투명 + backdrop-blur 를 쓰지 않는다. 불투명 bg-surface 여야
 * sticky 표 헤더(z-raised)가 스크롤로 지나갈 때 깨끗하다.
 *
 * @param onOpenNav 햄버거 클릭 핸들러
 * @param onOpenAccount 아바타 클릭 핸들러
 * @param isNavOpen 드로어 열림 여부
 * @returns 상단바 요소
 */
export function TopBar({ onOpenNav, onOpenAccount, isNavOpen }: TopBarProps) {
  const pathname = usePathname();
  const { user, displayName, signOut } = useAuth();
  const { groupLabel, pageLabel } = useMemo(
    () => resolveNavLocation(pathname),
    [pathname],
  );

  // /users/me 응답 전에는 이름·아바타 자리를 스켈레톤으로 두어 레이아웃 점프를 막는다.
  const isLoadingUser = user === null;
  const avatarInitial = displayName?.charAt(0) ?? "·";
  const locationText = groupLabel ? `${groupLabel} / ${pageLabel}` : pageLabel;

  return (
    <header className="sticky top-0 z-header flex h-header w-full items-center gap-3 border-b border-subtle bg-surface px-4 sm:px-6 md:h-header-md lg:px-8">
      <button
        type="button"
        onClick={onOpenNav}
        aria-expanded={isNavOpen}
        aria-controls="app-nav-drawer"
        aria-label={isNavOpen ? "메뉴 닫기" : "메뉴 열기"}
        className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-secondary transition-colors duration-fast hover:bg-surface-hover hover:text-primary focus-ring lg:hidden"
      >
        <MenuIcon />
      </button>

      {/* <lg 에는 사이드바가 없으므로 상단바가 브랜드를 책임진다. */}
      <span className="min-w-0 truncate text-section font-semibold text-primary lg:hidden">
        성적관리
      </span>

      {/* ≥lg 현재 위치. 링크가 아닌 순수 텍스트이므로 nav 랜드마크로 감싸지 않는다. */}
      {locationText ? (
        <p className="hidden min-w-0 truncate text-caption text-muted lg:block">
          <span className="sr-only">현재 위치: </span>
          {locationText}
        </p>
      ) : null}

      <div
        className="ml-auto flex shrink-0 items-center gap-2 md:gap-3"
        aria-busy={isLoadingUser || undefined}
      >
        {isLoadingUser ? (
          <>
            <span className="skeleton hidden h-5 w-20 md:block" aria-hidden="true" />
            <span className="skeleton h-10 w-10 rounded-full" aria-hidden="true" />
          </>
        ) : (
          <>
            <span className="hidden min-w-0 truncate text-caption text-secondary md:block">
              {displayName}
            </span>

            {/* <lg: 아바타가 드로어 계정 섹션으로 가는 버튼이다(로그아웃이 그곳에 있다). */}
            <button
              type="button"
              onClick={onOpenAccount}
              aria-label={`${displayName ?? "사용자"} 계정 메뉴 열기`}
              aria-controls="app-nav-drawer"
              className="grid min-h-touch min-w-touch place-items-center rounded-full bg-accent-subtle text-caption font-semibold text-accent-strong focus-ring lg:hidden"
            >
              {avatarInitial}
            </button>

            {/* ≥lg: 아바타는 장식이고 로그아웃 버튼이 상단바에 직접 놓인다. */}
            <span
              aria-hidden="true"
              className="hidden h-10 w-10 place-items-center rounded-full bg-accent-subtle text-caption font-semibold text-accent-strong lg:grid"
            >
              {avatarInitial}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="hidden lg:inline-flex"
            >
              로그아웃
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
