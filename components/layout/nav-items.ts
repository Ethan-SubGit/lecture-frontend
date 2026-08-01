/**
 * 앱 셸 메뉴 구조의 단일 정의 (design.md 4.2.0 / spec.md 4.2 결정 A~F).
 *
 * 데스크탑 사이드바와 <lg 드로어는 이 배열 하나를 `SidebarNav` 를 통해 공유한다.
 * 메뉴 마크업을 두 벌 만들지 않는다. 메뉴를 바꿀 일이 생기면 이 파일만 고친다.
 *
 * 「기준정보 관리」는 사용자가 요구한 두 메뉴(수강과목/성적관리)를 훼손하지 않고
 * 합의 범위(학과·학점환산기준)를 담기 위해 3번째 그룹으로 분리했다 (spec.md 가정 11).
 */

/** 그룹/단일 링크 앞에 붙는 아이콘 식별자. 실제 SVG 는 components/ui/icons.tsx 가 갖는다. */
export type NavIconKey = "gauge" | "book" | "clipboard" | "sliders";

/** 그룹 하위 링크 1개. 아이콘 없이 라벨만 갖는다. */
export interface NavLink {
  label: string;
  href: string;
}

/** 라우트를 갖는 최상위 단일 링크 (대시보드). */
export interface NavSingleItem {
  /** aria-controls 등 DOM id 생성에 쓰는 안정적인 키 */
  id: string;
  label: string;
  icon: NavIconKey;
  href: string;
}

/** 라우트가 없는 아코디언 그룹. 헤더는 버튼이며 클릭해도 이동하지 않는다 (결정 B). */
export interface NavGroupItem {
  id: string;
  label: string;
  icon: NavIconKey;
  children: NavLink[];
}

export type NavNode = NavSingleItem | NavGroupItem;

export const NAV_ITEMS: NavNode[] = [
  { id: "dashboard", label: "대시보드", icon: "gauge", href: "/dashboard" },
  {
    id: "lectures",
    label: "수강과목 관리",
    icon: "book",
    children: [
      { label: "목록", href: "/lectures" },
      { label: "생성", href: "/lectures/new" },
    ],
  },
  {
    id: "scores",
    label: "성적관리",
    icon: "clipboard",
    children: [
      { label: "성적입력", href: "/scores/upload" },
      { label: "수강과목별 성적조회", href: "/scores" },
    ],
  },
  {
    id: "master-data",
    label: "기준정보 관리",
    icon: "sliders",
    children: [
      { label: "학과 관리", href: "/departments" },
      { label: "학점환산기준 관리", href: "/grade-scales" },
    ],
  },
];

/**
 * 노드가 아코디언 그룹인지 판별한다 (타입 가드).
 *
 * @param node 메뉴 노드
 * @returns 하위 링크를 가진 그룹이면 true
 */
export function isNavGroup(node: NavNode): node is NavGroupItem {
  return "children" in node;
}

/** 활성 판정 대상이 되는 전체 링크를 평탄화한 목록. 모듈 로드 시 1회만 만든다. */
const NAV_LINKS: NavLink[] = NAV_ITEMS.flatMap((node) =>
  isNavGroup(node) ? node.children : [{ label: node.label, href: node.href }],
);

/**
 * 현재 경로에 해당하는 활성 링크를 **하나만** 고른다 (design.md 4.2.0 활성 판정 규칙).
 *
 * 1) `pathname === href` 이거나 `pathname` 이 `href/` 로 시작하는 후보를 모으고
 * 2) 그중 **href 문자열이 가장 긴 것 하나만** 활성으로 삼는다.
 *
 * 2번이 없으면 `/lectures/new` 에서 「목록」과 「생성」이 동시에 활성으로 보인다.
 * 가장 흔한 회귀 지점이라 규칙을 이 함수 한 곳에 가둔다.
 *
 * @param pathname 현재 경로
 * @returns 활성 링크의 href. 어떤 메뉴에도 속하지 않으면 null
 */
export function resolveActiveHref(pathname: string): string | null {
  let activeHref: string | null = null;

  for (const link of NAV_LINKS) {
    const isCandidate =
      pathname === link.href || pathname.startsWith(`${link.href}/`);
    if (!isCandidate) continue;
    if (activeHref === null || link.href.length > activeHref.length) {
      activeHref = link.href;
    }
  }

  return activeHref;
}

/** 상단바가 표시할 현재 위치 텍스트 조각. */
export interface NavLocation {
  /** 그룹명. 단일 링크 페이지(대시보드)에서는 null */
  groupLabel: string | null;
  /** 페이지명. 메뉴에 없는 경로(404 등)면 null */
  pageLabel: string | null;
}

/**
 * 현재 경로의 위치를 「그룹명 / 페이지명」 2단으로 계산한다 (design.md 4.2.3).
 *
 * 상단바는 이 값을 링크가 아닌 순수 텍스트로 표시한다(이동 경로는 사이드바로 단일화).
 *
 * @param pathname 현재 경로
 * @returns 그룹명·페이지명. 메뉴에 없는 경로면 둘 다 null
 */
export function resolveNavLocation(pathname: string): NavLocation {
  const activeHref = resolveActiveHref(pathname);
  if (!activeHref) return { groupLabel: null, pageLabel: null };

  for (const node of NAV_ITEMS) {
    if (!isNavGroup(node)) {
      if (node.href === activeHref) {
        return { groupLabel: null, pageLabel: node.label };
      }
      continue;
    }

    const matchedChild = node.children.find((child) => child.href === activeHref);
    if (matchedChild) {
      return { groupLabel: node.label, pageLabel: matchedChild.label };
    }
  }

  return { groupLabel: null, pageLabel: null };
}

/**
 * 그룹이 현재 활성 링크를 품고 있는지 판정한다.
 * 그룹 헤더 강조와 "접기 금지" 판단에 함께 쓰인다.
 *
 * @param group 메뉴 그룹
 * @param activeHref 현재 활성 링크 href
 * @returns 활성 링크를 포함하면 true
 */
export function hasActiveChild(
  group: NavGroupItem,
  activeHref: string | null,
): boolean {
  if (!activeHref) return false;
  return group.children.some((child) => child.href === activeHref);
}
