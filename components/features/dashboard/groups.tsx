import type { ReactNode } from "react";
import {
  BuildingIcon,
  ChartIcon,
  ClipboardIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "@/components/ui/icons";

/**
 * `/dashboard` 문서 구조 — 11개 섹션을 묶는 5개 그룹 (design.md 1.3.1).
 *
 * 그룹은 **관점이 바뀌는 지점**에서 끊는다. 11개 섹션이 아무 표식 없이 이어지면
 * "끝없는 카드 더미"가 되기 때문이다.
 * `SectionNav`(앵커 목차)와 `DashboardGroup`(그룹 헤딩)이 **이 배열 하나**를 함께 쓴다 —
 * 목차와 실제 그룹 제목이 갈라질 수 없게 하기 위함이다.
 */
export interface DashboardGroupMeta {
  /** 앵커 id (`#group-overview` 등) */
  id: string;
  /** 그룹 제목 (h2) */
  title: string;
  /** 목차 칩에 쓰는 짧은 이름 */
  navLabel: string;
  /** 그룹 도입문 */
  description: string;
  /** 목차 칩 아이콘 */
  icon: ReactNode;
}

export const DASHBOARD_GROUPS: DashboardGroupMeta[] = [
  {
    id: "group-overview",
    title: "전체 현황",
    navLabel: "전체 현황",
    description: "전체 성적을 하나의 모집단으로 보고 규모와 분포를 확인합니다.",
    icon: <ChartIcon className="h-4 w-4 shrink-0 text-muted" />,
  },
  {
    id: "group-breakdown",
    title: "분해 분석 — 어디에서 차이가 나는가",
    navLabel: "분해 분석",
    description: "전체를 학과·강의로 쪼개 평균이 어디서 갈라지는지 봅니다.",
    icon: <BuildingIcon className="h-4 w-4 shrink-0 text-muted" />,
  },
  {
    id: "group-composition",
    title: "구성과 추이",
    navLabel: "구성과 추이",
    description: "점수의 내부 구성(시험/과제)과 학기에 따른 변화를 봅니다.",
    icon: <TrendingUpIcon className="h-4 w-4 shrink-0 text-muted" />,
  },
  {
    id: "group-students",
    title: "학생 단위",
    navLabel: "학생 단위",
    description: "집계에서 개인으로 내려갑니다. 학번·이름이 노출되는 구간입니다.",
    icon: <TrophyIcon className="h-4 w-4 shrink-0 text-muted" />,
  },
  {
    id: "group-summary",
    title: "요약 통계 (간단 보기)",
    navLabel: "요약 통계",
    description:
      "위 상세 분석과 같은 데이터의 축약본입니다. 자세한 지표는 각 카드의 [상세 보기]를 누르세요.",
    icon: <ClipboardIcon className="h-4 w-4 shrink-0 text-muted" />,
  },
];
