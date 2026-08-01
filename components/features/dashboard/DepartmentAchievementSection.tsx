import { Badge } from "@/components/ui/Badge";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { BuildingIcon, StarIcon, TargetIcon } from "@/components/ui/icons";
import { DataTable, type Column } from "@/components/data/DataTable";
import { formatCount, formatNumber } from "@/lib/format";
import type { AsyncDataState } from "@/hooks/useAsyncData";
import type {
  DepartmentAchievementItemDto,
  DepartmentAchievementResponseDto,
} from "@/types/api";
import { DashboardSection, deriveSectionState } from "./DashboardSection";
import { SectionStatStrip, type SectionStatItem } from "./SectionStatStrip";
import { TableSectionSkeleton } from "./SectionSkeletons";
import { StatValue } from "./StatValue";

/**
 * ④ 학과별 학업성취도 섹션 (design.md 4.23).
 *
 * 전체 → 학과로 좁히는 **첫 번째 분해 축**. 지표 표와 학과 × 등급 교차표 두 블록을 세로로 쌓는다
 * (둘 다 넓은 표라 좌우로 쪼개면 양쪽 다 가로 스크롤이 생긴다).
 */

/** 이 섹션의 앵커 id. 그룹 E 의 「학과별 요약」이 [상세 보기]로 이 id 를 가리킨다. */
export const DEPARTMENT_ACHIEVEMENT_SECTION_ID = "department-achievement";

/** 로딩 시 그릴 예상 행 수. 실제 학과 수에 가까운 값이면 높이 점프가 작다. */
const SKELETON_ROWS = 6;

/** 지표 표 컬럼 정의 (design.md 4.23 표).
 *  정렬 UI 를 달지 않는다 — 서버가 준 순서(평균 합계점수 내림차순)가 이 표의 전제이기 때문이다.
 *  A/F 비율에 색을 칠하지 않는다: "A가 많다"는 좋은 일일 수도 인플레이션 신호일 수도 있고,
 *  그 판정은 ⑤ 강의별 난이도 섹션이 한다. 여기서는 중립 숫자다. */
const METRIC_COLUMNS: Column<DepartmentAchievementItemDto>[] = [
  {
    key: "departmentName",
    header: "학과",
    mobilePriority: "title",
    cell: (row) => row.departmentName,
  },
  {
    key: "studentCount",
    header: "인원",
    align: "right",
    cell: (row) => `${formatCount(row.studentCount)}명`,
  },
  {
    key: "averageTotalScore",
    header: "평균",
    align: "right",
    cell: (row) => formatNumber(row.averageTotalScore, 1),
  },
  {
    key: "averagePercentage",
    header: "평균 성취도",
    align: "right",
    cell: (row) => `${formatNumber(row.averagePercentage, 1)}%`,
  },
  {
    // nullable — 0 과 "계산 불가"는 의미가 정반대이므로 StatValue 가 구분해 표시한다.
    key: "medianTotalScore",
    header: "중앙값",
    align: "right",
    cell: (row) => <StatValue value={row.medianTotalScore} />,
  },
  {
    key: "stddevTotalScore",
    header: "표준편차",
    align: "right",
    cell: (row) => <StatValue value={row.stddevTotalScore} />,
  },
  {
    key: "range",
    header: "최소~최대",
    align: "right",
    mobilePriority: "full",
    cell: (row) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatNumber(row.minTotalScore, 1)} ~ {formatNumber(row.maxTotalScore, 1)}
      </span>
    ),
  },
  {
    key: "averageGpa",
    header: "평균 평점",
    align: "right",
    cell: (row) => formatNumber(row.averageGpa, 2),
  },
  {
    key: "aGradeRate",
    header: "A등급 비율",
    align: "right",
    cell: (row) => (
      <span className="whitespace-nowrap">
        {formatNumber(row.aGradeRate, 1)}%{" "}
        <span className="text-caption text-muted">({formatCount(row.aGradeCount)}명)</span>
      </span>
    ),
  },
  {
    key: "fGradeRate",
    header: "F등급 비율",
    align: "right",
    cell: (row) => (
      <span className="whitespace-nowrap">
        {formatNumber(row.fGradeRate, 1)}%{" "}
        <span className="text-caption text-muted">({formatCount(row.fGradeCount)}명)</span>
      </span>
    ),
  },
];

/**
 * 학과별 "그 학과의 최다 등급"을 미리 계산한다.
 * 교차표 셀마다 다시 훑으면 셀 수만큼 반복되므로 한 번만 구해 Map 으로 넘긴다.
 *
 * @param items 학과별 성취도 목록
 * @returns 학과 id → 최다 등급 문자
 */
function buildTopGradeMap(items: DepartmentAchievementItemDto[]): Map<string, string> {
  const topGrades = new Map<string, string>();

  for (const item of items) {
    let top = item.gradeCounts[0] ?? null;
    for (const gradeCount of item.gradeCounts) {
      // 동률이면 먼저 온 등급(= 평점이 높은 쪽)을 유지한다.
      if (gradeCount.count > (top?.count ?? -1)) top = gradeCount;
    }
    // 전 등급이 0명이면 강조할 최다 등급이 없다.
    if (top && top.count > 0) topGrades.set(item.departmentId, top.grade);
  }

  return topGrades;
}

/**
 * 학과 × 등급 교차표의 컬럼을 응답의 `grades` 축에서 런타임에 만든다 (design.md 4.23.1).
 *
 * 클라이언트는 등급 축을 재정렬하거나 누락 등급을 채워 넣지 않는다 — 서버가 `grades` 와
 * `gradeCounts` 의 개수·순서 일치를 보증한다. 다만 인덱스가 아니라 **`grade` 문자로 매칭**해
 * 서버가 순서를 바꿨을 때 열이 조용히 밀리는 사고를 막는다.
 *
 * @param grades 등급 축(평점 내림차순)
 * @param topGrades 학과별 최다 등급 맵
 * @returns 교차표 컬럼 정의
 */
function buildCrossTabColumns(
  grades: string[],
  topGrades: Map<string, string>,
): Column<DepartmentAchievementItemDto>[] {
  return [
    {
      key: "departmentName",
      header: "학과",
      mobilePriority: "title",
      cell: (row) => row.departmentName,
    },
    ...grades.map<Column<DepartmentAchievementItemDto>>((grade) => ({
      key: grade,
      // 열 머리는 배지지만 GradeBadge 가 등급 문자를 텍스트로 포함하므로 낭독에 문제가 없다.
      header: <GradeBadge grade={grade} />,
      align: "right",
      mobilePriority: "full",
      cell: (row) => {
        const gradeCount = row.gradeCounts.find((item) => item.grade === grade);
        const count = gradeCount?.count ?? 0;
        const isTopGrade = topGrades.get(row.departmentId) === grade;

        // count === 0 도 빈칸이 아니라 0 으로 표시한다(존재하지만 값이 0임을 흐림으로 표현).
        if (count === 0) {
          return <span className="text-muted tabular-nums">0</span>;
        }

        return (
          <span
            className={
              isTopGrade
                ? "-mx-1 rounded-sm bg-accent-subtle px-1 font-semibold text-accent-strong"
                : undefined
            }
          >
            <span className="tabular-nums">{formatCount(count)}</span>{" "}
            <span className="text-caption text-muted">
              ({formatNumber(gradeCount?.percentage ?? 0, 1)}%)
            </span>
            {isTopGrade ? <span className="sr-only">이 학과의 최다 등급</span> : null}
          </span>
        );
      },
    })),
  ];
}

/**
 * 스트립 칩 4개를 만든다. 서버가 평균 내림차순으로 정렬해 주므로
 * 최고/최저 학과는 배열의 양 끝이고 별도 계산이 필요 없다.
 *
 * @param items 학과별 성취도 목록(1건 이상)
 * @returns 스트립 칩 목록
 */
function buildStatItems(items: DepartmentAchievementItemDto[]): SectionStatItem[] {
  const best = items[0];
  const worst = items[items.length - 1];
  const gap = best.averageTotalScore - worst.averageTotalScore;

  return [
    {
      key: "count",
      icon: <BuildingIcon className="h-4 w-4" />,
      label: "집계 학과",
      value: `${formatCount(items.length)}개`,
      tone: "neutral",
    },
    {
      key: "best",
      icon: <StarIcon className="h-4 w-4" />,
      label: "최고 평균 학과",
      value: best.departmentName,
      badge: <Badge tone="neutral">{formatNumber(best.averageTotalScore, 1)}점</Badge>,
      tone: "success",
    },
    {
      key: "worst",
      icon: <BuildingIcon className="h-4 w-4" />,
      label: "최저 평균 학과",
      value: worst.departmentName,
      badge: <Badge tone="neutral">{formatNumber(worst.averageTotalScore, 1)}점</Badge>,
      tone: "neutral",
    },
    {
      // 방향이 아니라 **부호 없는 폭(range)** 이므로 DeviationValue 를 쓰지 않는다.
      key: "gap",
      icon: <TargetIcon className="h-4 w-4" />,
      label: "학과 간 평균 격차",
      value: `${formatNumber(gap, 1)}점`,
      tone: "accent",
    },
  ];
}

interface DepartmentAchievementSectionProps {
  query: AsyncDataState<DepartmentAchievementResponseDto>;
}

/**
 * 학과별 학업성취도 섹션.
 *
 * @param query 이 섹션 전용 조회 상태
 * @returns 섹션 카드
 */
export function DepartmentAchievementSection({
  query,
}: DepartmentAchievementSectionProps) {
  const state = deriveSectionState(query, (data) => data.items.length === 0);
  const data = query.data;
  const items = data?.items ?? [];

  // "계산 불가" 각주는 실제로 null 이 있을 때만 붙인다(없는 문제를 설명하지 않는다).
  const hasNullMetric = items.some(
    (item) => item.stddevTotalScore === null || item.medianTotalScore === null,
  );
  const footnotes = [
    "성적이 한 건도 없는 학과는 이 표에 나타나지 않습니다.",
    ...(hasNullMetric
      ? ["— 는 집계 대상이 1건 이하여서 계산할 수 없는 값입니다. 0과 다릅니다."]
      : []),
    "정렬은 평균 합계점수 내림차순 고정입니다.",
  ];

  return (
    <DashboardSection
      id={DEPARTMENT_ACHIEVEMENT_SECTION_ID}
      title="학과별 학업성취도"
      description="학과별 평균·중앙값·편차와 등급 구성을 봅니다. 아래 「학과별 요약」의 상세판입니다."
      icon={<BuildingIcon />}
      badge={<Badge tone="accent">상세</Badge>}
      state={state}
      onRetry={query.refetch}
      emptyTitle="집계할 학과가 없습니다."
      emptyIcon={<BuildingIcon className="h-6 w-6 md:h-8 md:w-8" />}
      skeleton={<TableSectionSkeleton rows={SKELETON_ROWS} />}
      footnotes={footnotes}
    >
      {/* ⚠️ children 은 state 와 무관하게 평가되므로(빈 상태여도 JSX 는 만들어진다)
          items 가 비어 있지 않을 때만 스트립 계산에 들어간다 — buildStatItems 는 items[0] 을 읽는다. */}
      {data && items.length > 0 ? (
        <>
          <SectionStatStrip items={buildStatItems(items)} />

          <div className="mt-4">
            <DataTable
              caption="학과별 학업성취도 지표"
              columns={METRIC_COLUMNS}
              rows={items}
              getRowKey={(row) => row.departmentId}
              tableMinWidth="table-lg"
              surface="plain"
              showScrollHint
            />
          </div>

          <h4 className="mb-3 mt-6 text-body font-semibold text-primary">
            학과 × 등급 교차표
          </h4>
          <DataTable
            caption="학과별 등급 인원 교차표. 행은 학과, 열은 등급입니다."
            columns={buildCrossTabColumns(data.grades, buildTopGradeMap(items))}
            rows={items}
            getRowKey={(row) => row.departmentId}
            tableMinWidth="table-lg"
            surface="plain"
            stickyFirstColumn
            showScrollHint
          />
        </>
      ) : null}
    </DashboardSection>
  );
}
