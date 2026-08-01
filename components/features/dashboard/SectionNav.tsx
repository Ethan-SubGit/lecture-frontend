import { DASHBOARD_GROUPS } from "./groups";

/**
 * 그룹 앵커 목차 (design.md 1.3.3).
 *
 * 11개 섹션 전부가 아니라 **그룹 5개만** 링크한다(모바일에서 2줄을 넘기지 않기 위함).
 * sticky 로 만들지 않는다 — 상단바가 이미 sticky 이고, 목차까지 붙으면
 * 모바일 뷰포트의 25%를 chrome 이 먹는다.
 *
 * 앵커 이동 시 sticky 상단바가 섹션 제목을 가리는 문제는 `globals.css` 의
 * `section[id] { scroll-margin-top }` 전역 규칙이 처리한다(11곳에 손으로 붙이면 반드시 빠뜨린다).
 *
 * @returns 앵커 목차 내비게이션
 */
export function SectionNav() {
  return (
    <nav
      aria-label="대시보드 섹션 바로가기"
      className="rounded-lg border border-subtle bg-surface p-3 shadow-card md:p-4"
    >
      <ul className="flex flex-wrap gap-2">
        {DASHBOARD_GROUPS.map((group) => (
          <li key={group.id}>
            <a
              href={`#${group.id}`}
              className="inline-flex min-h-touch items-center gap-2 rounded-full border border-subtle bg-surface-sunken px-3 text-caption font-medium text-secondary transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-primary focus-ring md:h-control-dense md:min-h-0"
            >
              {group.icon}
              {group.navLabel}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
