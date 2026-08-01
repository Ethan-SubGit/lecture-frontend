import { Badge } from "@/components/ui/Badge";
import { DocumentCheckIcon, TargetIcon, TrendingUpIcon } from "@/components/ui/icons";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { DataTable, type Column } from "@/components/data/DataTable";
import { TermTrendChart } from "@/components/data/TermTrendChart";
import { EMPTY_VALUE_PLACEHOLDER, formatCount, formatNumber, formatTerm } from "@/lib/format";
import type { AsyncDataState } from "@/hooks/useAsyncData";
import type { TermTrendPointDto, TermTrendResponseDto } from "@/types/api";
import { DashboardSection, deriveSectionState } from "./DashboardSection";
import { DeviationValue } from "./DeviationValue";
import { SectionStatStrip, type SectionStatItem } from "./SectionStatStrip";
import { ChartSectionSkeleton } from "./SectionSkeletons";

/**
 * ⑧ 학기별 추이 섹션 (design.md 4.27).
 *
 * 유일한 **시간 축** 섹션이다. 따라서 이 섹션에서만 "직전 대비 증감"이 데이터로 성립한다
 * (KPI 카드가 증감 배지를 두지 않는 것과 모순이 아니다 — 여기서는 응답에 있는 두 값의 차다).
 */

export const TERM_TREND_SECTION_ID = "term-trend";

/** 시계열이라고 부를 수 있는 최소 학기 수. 1개면 "추이"를 말할 수 없다. */
const MIN_POINTS_FOR_TREND = 2;

/** 직전 학기 대비 증감의 스크린리더 문구. */
const TREND_SR_LABEL = {
  up: "직전 학기보다 상승",
  down: "직전 학기보다 하락",
  flat: "직전 학기와 동일",
};

/**
 * 학기 표 컬럼을 만든다.
 *
 * 「직전 학기 대비」는 응답에 없는 값이지만 **응답에 있는 두 값의 뺄셈**이므로 지어낸 수치가 아니다
 * (각주에 계산 방식을 밝힌다). 첫 행은 비교 대상이 없어 `—` + sr-only 문구로 표시한다.
 *
 * @param points 학기 오름차순 시계열
 * @returns 컬럼 정의
 */
function buildColumns(points: TermTrendPointDto[]): Column<TermTrendPointDto>[] {
  // 학기 코드 → 인덱스. 셀에서 직전 학기를 찾을 때 매번 배열을 훑지 않기 위함이다.
  const indexByTerm = new Map(points.map((point, index) => [point.term, index]));

  return [
    {
      key: "term",
      header: "학기",
      mobilePriority: "title",
      cell: (row) => formatTerm(row.term),
    },
    {
      key: "studentCount",
      header: "성적 건수",
      align: "right",
      cell: (row) => `${formatCount(row.studentCount)}건`,
    },
    {
      key: "averageTotalScore",
      header: "평균 합계점수",
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
      key: "averageGpa",
      header: "평균 평점",
      align: "right",
      cell: (row) => formatNumber(row.averageGpa, 2),
    },
    {
      key: "delta",
      header: "직전 학기 대비",
      align: "right",
      cell: (row) => {
        const index = indexByTerm.get(row.term) ?? 0;
        const previous = points[index - 1];

        if (!previous) {
          return (
            <span className="text-muted">
              <span aria-hidden="true">{EMPTY_VALUE_PLACEHOLDER}</span>
              <span className="sr-only">비교할 직전 학기 없음</span>
            </span>
          );
        }

        return (
          <DeviationValue
            value={row.averageTotalScore - previous.averageTotalScore}
            tone="evaluative"
            unit="점"
            srLabel={TREND_SR_LABEL}
          />
        );
      },
    },
  ];
}

/**
 * 스트립 칩을 만든다. 학기가 1개뿐이면 「직전 학기 대비」 칩 자체를 렌더하지 않는다
 * (비교 대상이 없는데 칩 자리를 남기면 "값이 안 나왔다"로 오독된다).
 *
 * @param points 학기 오름차순 시계열(1건 이상)
 * @returns 스트립 칩 목록
 */
function buildStatItems(points: TermTrendPointDto[]): SectionStatItem[] {
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];

  const items: SectionStatItem[] = [
    {
      key: "terms",
      icon: <TrendingUpIcon className="h-4 w-4" />,
      label: "집계 학기",
      value: `${formatCount(points.length)}개`,
      tone: "neutral",
    },
    {
      key: "latest-term",
      icon: <DocumentCheckIcon className="h-4 w-4" />,
      label: "최근 학기",
      value: formatTerm(latest.term),
      tone: "neutral",
    },
    {
      key: "latest-average",
      icon: <TargetIcon className="h-4 w-4" />,
      label: "최근 학기 평균",
      value: `${formatNumber(latest.averageTotalScore, 1)}점`,
      tone: "accent",
    },
  ];

  if (previous) {
    const delta = latest.averageTotalScore - previous.averageTotalScore;
    items.push({
      key: "delta",
      icon: <TrendingUpIcon className="h-4 w-4" />,
      label: "직전 학기 대비",
      value: (
        <DeviationValue value={delta} tone="evaluative" unit="점" srLabel={TREND_SR_LABEL} />
      ),
      tone: delta > 0 ? "success" : delta < 0 ? "danger" : "neutral",
    });
  }

  return items;
}

interface TermTrendSectionProps {
  query: AsyncDataState<TermTrendResponseDto>;
}

/**
 * 학기별 추이 섹션.
 *
 * `points.length === 1` 은 빈 상태가 아니다 — 차트를 그리되(꺾은선 없이 막대 1개 + 마커 1개)
 * "비교할 학기가 1개뿐입니다." 안내를 함께 띄운다.
 * `departmentSeries` 는 `breakdown` 미전송이라 항상 빈 배열이므로 학과별 시리즈 영역·범례를
 * 아예 렌더하지 않는다(빈 차트·빈 범례를 그리지 않는다).
 *
 * @param query 이 섹션 전용 조회 상태
 * @returns 섹션 카드
 */
export function TermTrendSection({ query }: TermTrendSectionProps) {
  const state = deriveSectionState(query, (data) => data.points.length === 0);
  const data = query.data;
  const points = data?.points ?? [];

  return (
    <DashboardSection
      id={TERM_TREND_SECTION_ID}
      title="학기별 추이"
      description="학기가 지나며 성적 건수와 평균이 어떻게 변했는지 봅니다. 아래 「학기별 요약」의 상세판입니다."
      icon={<TrendingUpIcon />}
      badge={<Badge tone="accent">상세</Badge>}
      state={state}
      onRetry={query.refetch}
      emptyTitle="집계할 학기가 없습니다."
      emptyIcon={<TrendingUpIcon className="h-6 w-6 md:h-8 md:w-8" />}
      skeleton={<ChartSectionSkeleton />}
      footnotes={[
        "직전 학기 대비 값은 표에 있는 두 학기의 평균 합계점수를 뺀 값입니다.",
        "그래프 오른쪽 축은 변화를 크게 보이게 하기 위해 0이 아닌 값에서 시작합니다.",
      ]}
    >
      {data && points.length > 0 ? (
        <>
          <SectionStatStrip items={buildStatItems(points)} />

          {points.length < MIN_POINTS_FOR_TREND ? (
            <AlertBanner
              tone="info"
              title="비교할 학기가 1개뿐입니다."
              description="학기가 2개 이상 쌓이면 추이를 볼 수 있습니다."
              className="mt-4"
            />
          ) : null}

          <div className="mt-4">
            <h4 className="sr-only">학기별 성적 건수와 평균 합계점수 그래프</h4>
            <TermTrendChart points={points} totalScoreMax={data.totalScoreMax} />
          </div>

          <h4 className="mb-3 mt-6 text-body font-semibold text-primary">학기별 값</h4>
          <DataTable
            caption="학기별 성적 건수와 평균"
            columns={buildColumns(points)}
            rows={points}
            getRowKey={(row) => row.term}
            tableMinWidth="table-md"
            surface="plain"
          />
        </>
      ) : null}
    </DashboardSection>
  );
}
