import type { ReactNode } from "react";
import type { DashboardGroupMeta } from "./groups";

interface DashboardGroupProps {
  /** 그룹 메타(제목·도입문·앵커). `DASHBOARD_GROUPS` 의 항목을 그대로 넘긴다 */
  group: DashboardGroupMeta;
  /** 그룹에 속한 섹션들 */
  children: ReactNode;
}

/**
 * 대시보드 섹션 그룹 껍데기 (design.md 1.3.2).
 *
 * 제목 계층은 페이지 h1 → **그룹 h2** → 섹션 카드 h3 → 카드 내부 h4 로 이어진다.
 * 그룹 사이 간격(`space-y-8 lg:space-y-10`, 페이지가 부여)이 그룹 안 섹션 간격
 * (`space-y-4 lg:space-y-6`)보다 확실히 넓다는 것이 유일한 시각적 계층 장치다 —
 * `shadow-raised` 는 화면당 2장(KPI primary + 등급분포)을 넘길 수 없기 때문이다.
 *
 * @param group 그룹 메타
 * @param children 그룹에 속한 섹션 노드
 * @returns 그룹 섹션 요소
 */
export function DashboardGroup({ group, children }: DashboardGroupProps) {
  const titleId = `${group.id}-title`;

  return (
    <section id={group.id} aria-labelledby={titleId} className="space-y-4 lg:space-y-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h2 id={titleId} className="text-title font-semibold text-primary">
            {group.title}
          </h2>
          {/* 제목 오른쪽 여백을 채우는 구분선. "여기서 관점이 바뀐다"를 시각화한다. */}
          <span aria-hidden="true" className="h-0 min-w-0 flex-1 border-t border-subtle" />
        </div>
        <p className="text-caption text-muted">{group.description}</p>
      </header>

      {children}
    </section>
  );
}
