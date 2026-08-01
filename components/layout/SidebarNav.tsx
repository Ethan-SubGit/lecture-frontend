"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  BookIcon,
  ChevronDownIcon,
  ClipboardIcon,
  GaugeIcon,
  SlidersIcon,
} from "@/components/ui/icons";
import {
  NAV_ITEMS,
  hasActiveChild,
  isNavGroup,
  resolveActiveHref,
  type NavGroupItem,
  type NavIconKey,
  type NavNode,
  type NavSingleItem,
} from "./nav-items";

/** 아이콘 키 → 컴포넌트 정적 매핑. 동적 컴포넌트 조립을 피해 타입 안정성을 지킨다. */
const NAV_ICONS: Record<NavIconKey, (props: { className?: string }) => ReactNode> = {
  gauge: GaugeIcon,
  book: BookIcon,
  clipboard: ClipboardIcon,
  sliders: SlidersIcon,
};

/**
 * 메뉴 항목 공통 클래스.
 * 사이드바 배경이 bg-surface 라서 focus-ring 의 기본 offset(canvas)이 어긋난다.
 * 사이드바/드로어 내부 요소만 ring-offset-surface 로 덮어쓴다 (design.md 4.2.1).
 */
const NAV_ITEM_BASE =
  "group relative flex min-h-touch w-full items-center gap-3 rounded-lg px-3 text-body font-medium transition-colors duration-fast ease-standard focus-ring focus-visible:ring-offset-surface";

/** 활성 항목 표시: 배경 + 굵기 + 좌측 인디케이터 + aria-current 4중 (색 단독 금지). */
const NAV_ITEM_ACTIVE = "bg-surface-selected font-semibold text-accent-strong";
const NAV_ITEM_IDLE =
  "text-secondary hover:bg-surface-hover hover:text-primary active:bg-surface-selected";

interface SidebarNavProps {
  /** 메뉴 트리. 기본값은 단일 상수 NAV_ITEMS */
  items?: NavNode[];
  /** 링크 클릭 시 호출. 드로어가 자신을 닫는 데 쓴다(사이드바는 전달하지 않는다) */
  onNavigate?: () => void;
}

/**
 * 메뉴 계층의 유일한 구현체 (design.md 4.2.1).
 *
 * 데스크탑 `Sidebar` 와 <lg `MobileNavDrawer` 가 이 컴포넌트를 그대로 렌더한다.
 * 두 면의 상호작용이 달라지면 사용자가 학습을 두 번 해야 하므로 마크업을 공유한다.
 *
 * @param items 메뉴 트리
 * @param onNavigate 링크 클릭 콜백(드로어 닫기)
 * @returns 주 메뉴 nav 요소
 */
export function SidebarNav({ items = NAV_ITEMS, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  // 최장 접두어 1개만 활성 — 규칙 자체는 nav-items.ts 가 갖는다.
  const activeHref = useMemo(() => resolveActiveHref(pathname), [pathname]);

  // 아코디언 초기 상태: 3개 그룹 모두 펼침. 저장하지 않는다(새로고침 시 기본값 복귀, 결정 C).
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);

  /**
   * 그룹 접힘/펼침 토글.
   * 현재 위치를 품은 그룹은 접기 시도를 무시한다 — 접으면 현재 위치가 화면에서 사라져
   * 방향 감각을 잃기 때문이다(결정 C의 "항상 펼침"을 시각적으로 보증).
   */
  const toggleGroup = (group: NavGroupItem) => {
    if (hasActiveChild(group, activeHref)) return;

    setCollapsedGroupIds((previous) =>
      previous.includes(group.id)
        ? previous.filter((id) => id !== group.id)
        : [...previous, group.id],
    );
  };

  return (
    <nav
      aria-label="주 메뉴"
      className="flex-1 overflow-y-auto overscroll-contain px-3 py-4"
    >
      <ul className="space-y-1">
        {items.map((node) =>
          isNavGroup(node) ? (
            <li key={node.id}>
              <NavGroup
                group={node}
                activeHref={activeHref}
                expanded={!collapsedGroupIds.includes(node.id)}
                onToggle={() => toggleGroup(node)}
                onNavigate={onNavigate}
              />
            </li>
          ) : (
            <li key={node.id}>
              <NavSingleLink
                item={node}
                active={node.href === activeHref}
                onNavigate={onNavigate}
              />
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

/** 활성 항목의 좌측 2px 인디케이터. 색 외 단서를 하나 더 얹는다. */
function ActiveIndicator({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute bottom-1.5 top-1.5 w-0.5 rounded-full bg-accent",
        className,
      )}
    />
  );
}

interface NavSingleLinkProps {
  item: NavSingleItem;
  active: boolean;
  onNavigate?: () => void;
}

/**
 * 최상위 단일 링크 1개 (대시보드).
 *
 * @param item 메뉴 항목
 * @param active 현재 경로 여부
 * @param onNavigate 클릭 콜백
 * @returns 링크 요소
 */
function NavSingleLink({ item, active, onNavigate }: NavSingleLinkProps) {
  const Icon = NAV_ICONS[item.icon];

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(NAV_ITEM_BASE, active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE)}
    >
      {active ? <ActiveIndicator className="left-0" /> : null}
      <Icon
        className={cn("h-5 w-5 shrink-0", active ? "text-accent" : "text-muted")}
      />
      <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
    </Link>
  );
}

interface NavGroupProps {
  group: NavGroupItem;
  activeHref: string | null;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

/**
 * 아코디언 그룹 1개 (헤더 버튼 + 하위 링크 목록).
 *
 * 펼침/접힘은 즉시 마운트/언마운트하고 높이 애니메이션을 쓰지 않는다.
 * 높이 전환은 reflow 를 일으키고 스크롤 위치가 튀기 때문이다 (design.md 5절).
 *
 * @param group 그룹 정의
 * @param activeHref 현재 활성 링크
 * @param expanded 펼침 여부
 * @param onToggle 헤더 클릭 콜백
 * @param onNavigate 하위 링크 클릭 콜백
 * @returns 그룹 헤더 + 하위 목록
 */
function NavGroup({
  group,
  activeHref,
  expanded,
  onToggle,
  onNavigate,
}: NavGroupProps) {
  const Icon = NAV_ICONS[group.icon];
  const containsActive = hasActiveChild(group, activeHref);
  const listId = `nav-group-${group.id}`;
  // 활성 링크를 품은 그룹은 접을 수 없으므로 항상 펼쳐진 것으로 취급한다.
  const isExpanded = expanded || containsActive;

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={listId}
        // 접기가 무시되는 그룹은 커서와 hover 로도 "누를 수 없음"을 알린다.
        title={containsActive ? "현재 위치가 포함된 그룹입니다" : undefined}
        className={cn(
          NAV_ITEM_BASE,
          containsActive
            ? "cursor-default text-primary font-semibold"
            : NAV_ITEM_IDLE,
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", containsActive ? "text-accent" : "text-muted")} />
        <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
        {/* 접힌 채로 안에 현재 위치가 있을 때만 점 표식(색 외 단서). */}
        {!isExpanded && containsActive ? (
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
        ) : null}
        <ChevronDownIcon
          className={cn(
            "h-5 w-5 shrink-0 text-muted transition-transform duration-base ease-standard",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {isExpanded ? (
        <ul
          id={listId}
          className="ml-5 mt-1 space-y-0.5 border-l border-subtle pl-2 animate-fade-in"
        >
          {group.children.map((child) => {
            const active = child.href === activeHref;
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    NAV_ITEM_BASE,
                    "font-normal",
                    active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE,
                  )}
                >
                  {/* 부모의 border-l 위에 겹쳐 "여기가 현재 위치"를 가이드라인으로 표현한다. */}
                  {active ? <ActiveIndicator className="-left-2" /> : null}
                  <span className="min-w-0 flex-1 truncate text-left">{child.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
