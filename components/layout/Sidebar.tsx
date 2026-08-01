import Link from "next/link";
import { SidebarNav } from "./SidebarNav";
import { DEFAULT_AUTHED_PATH } from "@/lib/constants";

/**
 * 데스크탑(≥1024) 상시 사이드바 (design.md 4.2.2).
 *
 * 접기(collapse) 기능은 없다(spec.md 결정 E). <lg 에서는 렌더되지 않으며,
 * 같은 메뉴 계층을 MobileNavDrawer 가 SidebarNav 로 그대로 재사용한다.
 *
 * 그림자를 쓰지 않고 border-r + 배경 명도차(bg-surface vs 메인의 bg-canvas)로만
 * 셸 계층을 만든다 — 화면 높이 전체의 세로 그림자는 스크롤 시 잔상처럼 보인다.
 *
 * @returns 사이드바 요소 (<lg 에서는 hidden)
 */
export function Sidebar() {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-header lg:flex lg:w-sidebar lg:flex-col lg:border-r lg:border-subtle lg:bg-surface">
      {/* 브랜드 블록. 상단바와 눈높이를 맞춰(h-header-md) 두 영역의 하단 경계선이 한 줄로 이어진다. */}
      <div className="flex h-header-md shrink-0 items-center border-b border-subtle px-6">
        <Link
          href={DEFAULT_AUTHED_PATH}
          className="flex min-w-0 items-center gap-3 rounded-lg focus-ring focus-visible:ring-offset-surface"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-caption font-bold text-on-accent"
          >
            성
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-section font-semibold text-primary">성적관리</span>
            <span className="truncate text-caption text-muted">학사 백오피스</span>
          </span>
        </Link>
      </div>

      {/* 메뉴는 정적 데이터이므로 스켈레톤 없이 즉시 렌더한다(사용자 조회 대기는 TopBar 만의 문제다). */}
      <SidebarNav />
    </aside>
  );
}
