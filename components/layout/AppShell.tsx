"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { DESKTOP_MEDIA_QUERY } from "@/lib/constants";
import { MobileNavDrawer, type DrawerInitialFocus } from "./MobileNavDrawer";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
}

/**
 * 전 인증 화면 공통 앱 셸 — 좌측 사이드바 + 상단바 (design.md 1.1 / 4.2.5).
 *
 * 구조:
 *   Sidebar(≥lg 고정)  ·  MobileNavDrawer(<lg)  ·  lg:pl-sidebar 메인 컬럼(TopBar + 페이지)
 *
 * - 시각적으로 사이드바가 좌측이므로 DOM 에서도 메인 컬럼보다 앞에 둔다(탭 순서 = 시각 순서).
 * - 사이드바가 fixed 이므로 메인 컬럼은 `lg:pl-sidebar` 하나로만 밀린다.
 *   `ml-` 이 아니라 `pl-` 인 이유: 메인 컬럼이 bg-canvas 를 full-bleed 로 이어받아야 한다.
 * - `<main>` 은 각 페이지의 PageContainer 가 렌더한다(최대 폭이 화면마다 다르기 때문).
 *
 * @param children 보호 화면 콘텐츠
 * @returns 앱 셸
 */
export function AppShell({ children }: AppShellProps) {
  const [drawerFocus, setDrawerFocus] = useState<DrawerInitialFocus>("nav");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const openDrawer = useCallback((focus: DrawerInitialFocus) => {
    setDrawerFocus(focus);
    setIsDrawerOpen(true);
  }, []);

  // 드로어가 열린 채로 뷰포트가 ≥lg 로 넓어지면 강제로 닫는다.
  // 안 그러면 다시 좁혔을 때 드로어가 열린 채 나타나고, body 스크롤 잠금이 남는다.
  useEffect(() => {
    if (isDesktop) setIsDrawerOpen(false);
  }, [isDesktop]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* 키보드 사용자가 내비게이션을 건너뛰고 본문으로 갈 수 있게 한다 (design.md 6.3). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-toast focus:rounded focus:bg-surface-raised focus:px-4 focus:py-3 focus:text-body focus:shadow-raised"
      >
        본문으로 건너뛰기
      </a>

      <Sidebar />
      <MobileNavDrawer
        open={isDrawerOpen}
        onClose={closeDrawer}
        initialFocus={drawerFocus}
      />

      <div className="lg:pl-sidebar">
        <TopBar
          isNavOpen={isDrawerOpen}
          onOpenNav={() => openDrawer("nav")}
          onOpenAccount={() => openDrawer("account")}
        />
        {children}
      </div>
    </div>
  );
}
