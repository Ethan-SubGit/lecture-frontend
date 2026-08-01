import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import {
  ClipboardIcon,
  DocumentCheckIcon,
  StarIcon,
  TargetIcon,
} from "@/components/ui/icons";
import { DataTable, type Column } from "@/components/data/DataTable";
import { DistributionBar, type DistributionBarItem } from "@/components/data/DistributionBar";
import { formatCount, formatNumber, formatTerm } from "@/lib/format";
import type { AsyncDataState } from "@/hooks/useAsyncData";
import type {
  ComponentAnalysisResponseDto,
  ComponentAveragesDto,
  LectureComponentAveragesDto,
} from "@/types/api";
import { DashboardSection, deriveSectionState } from "./DashboardSection";
import { DeviationValue, isFlatDeviation } from "./DeviationValue";
import { SectionStatStrip, type SectionStatItem } from "./SectionStatStrip";
import { TableSectionSkeleton } from "./SectionSkeletons";

/**
 * ⑦ 평가항목별 분석 섹션 (design.md 4.26).
 *
 * 점수의 **내부 구성**으로 관점이 바뀌는 지점이다. 이 섹션만 "숫자 + 그 숫자를 풀어 쓴 문장"이
 * 짝을 이룬다 — spec.md 3.7 (4)가 "숫자와 부호만 던지지 않는다"고 요구했기 때문이다.
 *
 * ⚠️ **항목별 백분율(%)을 절대 표시하지 않는다.** 항목별 만점 정보가 API 에 없다.
 * 막대 길이는 "4개 항목 중 최댓값 기준 상대 폭"이며 그 사실을 화면 문구로 밝힌다.
 */

export const COMPONENT_ANALYSIS_SECTION_ID = "component-analysis";

const SKELETON_ROWS = 6;

/** 4개 평가항목의 라벨과 값 추출자. 막대·표가 같은 순서를 쓰도록 한 곳에 둔다. */
const COMPONENT_ITEMS: { key: string; label: string; pick: (data: ComponentAveragesDto) => number }[] =
  [
    { key: "midtermExam", label: "중간고사", pick: (data) => data.midtermExamAverage },
    { key: "midtermAssignment", label: "중간과제", pick: (data) => data.midtermAssignmentAverage },
    { key: "finalExam", label: "기말고사", pick: (data) => data.finalExamAverage },
    { key: "finalAssignment", label: "기말과제", pick: (data) => data.finalAssignmentAverage },
  ];

/**
 * 평가항목 4개를 가로 막대 행으로 변환한다 (design.md 4.26.2).
 *
 * `fillRatio` 는 **비율이 아니라 상대 폭**이다(4개 값 중 최댓값 = 100).
 * 톤은 `accent` 고정 — "중간고사"는 좋고 나쁨이 없는 중립 분류다.
 *
 * @param overall 전체 기준 평가항목 집계
 * @returns 막대 행 목록
 */
function buildComponentBars(overall: ComponentAveragesDto): DistributionBarItem[] {
  const values = COMPONENT_ITEMS.map((item) => item.pick(overall));
  const maxValue = Math.max(...values);

  return COMPONENT_ITEMS.map((item, index) => {
    const value = values[index];
    return {
      key: item.key,
      label: (
        <Badge tone="neutral" className="min-w-touch justify-center">
          {item.label}
        </Badge>
      ),
      // 최댓값이 0이면(전 항목 0점) 0 나눗셈이 되므로 폭을 0으로 둔다.
      fillRatio: maxValue > 0 ? (value / maxValue) * 100 : 0,
      valueText: `${formatNumber(value, 1)}점`,
      tone: "accent",
      emphasized: value === maxValue,
    };
  });
}

/**
 * 시험 − 과제 격차를 문장으로 푼다 (design.md 4.26.3 분기 표).
 * 문장이 이미 방향을 말하므로 숫자는 **절댓값**을 쓴다(부호를 또 붙이면 이중 부정이 된다).
 *
 * @param gap examVsAssignmentGap
 * @returns 설명 문장 노드
 */
function describeExamGap(gap: number): ReactNode {
  if (isFlatDeviation(gap)) return "시험과 과제의 평균이 같습니다.";

  const amount = <b className="font-semibold text-primary">{formatNumber(Math.abs(gap), 1)}점</b>;
  return gap > 0 ? (
    <>시험에서 과제보다 {amount} 더 득점했습니다.</>
  ) : (
    <>과제에서 시험보다 {amount} 더 득점했습니다.</>
  );
}

/**
 * 전반부 → 후반부 향상도를 문장으로 푼다 (design.md 4.26.3 분기 표).
 *
 * @param improvement improvement (후반부 − 전반부)
 * @returns 설명 문장 노드
 */
function describeImprovement(improvement: number): ReactNode {
  if (isFlatDeviation(improvement)) return "전반부와 후반부의 평균이 같습니다.";

  const amount = (
    <b className="font-semibold text-primary">{formatNumber(Math.abs(improvement), 1)}점</b>
  );
  return improvement > 0 ? (
    <>후반부(기말)가 전반부(중간)보다 {amount} 높습니다 — 학기가 갈수록 성취가 올랐습니다.</>
  ) : (
    <>후반부(기말)가 전반부(중간)보다 {amount} 낮습니다 — 학기 후반에 성취가 떨어졌습니다.</>
  );
}

/** 강의별 평가항목 표 컬럼. 서버 정렬(학기 → 강의명)을 유지하므로 정렬 UI 를 달지 않는다. */
const BY_LECTURE_COLUMNS: Column<LectureComponentAveragesDto>[] = [
  {
    key: "lectureName",
    header: "강의",
    mobilePriority: "title",
    cell: (row) => row.lectureName,
  },
  { key: "term", header: "학기", mobilePriority: "full", cell: (row) => formatTerm(row.term) },
  {
    key: "studentCount",
    header: "인원",
    align: "right",
    cell: (row) => `${formatCount(row.studentCount)}명`,
  },
  {
    key: "midtermExam",
    header: "중간고사",
    align: "right",
    cell: (row) => formatNumber(row.midtermExamAverage, 1),
  },
  {
    key: "midtermAssignment",
    header: "중간과제",
    align: "right",
    cell: (row) => formatNumber(row.midtermAssignmentAverage, 1),
  },
  {
    key: "finalExam",
    header: "기말고사",
    align: "right",
    cell: (row) => formatNumber(row.finalExamAverage, 1),
  },
  {
    key: "finalAssignment",
    header: "기말과제",
    align: "right",
    cell: (row) => formatNumber(row.finalAssignmentAverage, 1),
  },
  {
    // 어느 쪽이 우월하다고 말할 수 없으므로 neutral.
    key: "examVsAssignmentGap",
    header: "시험 − 과제",
    align: "right",
    cell: (row) => <DeviationValue value={row.examVsAssignmentGap} unit="점" />,
  },
  {
    // 향상/하락은 도메인상 방향이 명확하므로 evaluative.
    key: "improvement",
    header: "전반 → 후반",
    align: "right",
    cell: (row) => (
      <DeviationValue
        value={row.improvement}
        tone="evaluative"
        unit="점"
        srLabel={{
          up: "후반부가 더 높음",
          down: "후반부가 더 낮음",
          flat: "전후반이 같음",
        }}
      />
    ),
  },
  {
    key: "improvedStudent",
    header: "향상 학생",
    align: "right",
    cell: (row) => (
      <span className="whitespace-nowrap">
        {formatCount(row.improvedStudentCount)}명 ({formatNumber(row.improvedStudentRate, 1)}%)
      </span>
    ),
  },
];

/**
 * 스트립 칩 4개를 만든다.
 *
 * @param overall 전체 기준 집계
 * @returns 스트립 칩 목록
 */
function buildStatItems(overall: ComponentAveragesDto): SectionStatItem[] {
  return [
    {
      key: "count",
      icon: <DocumentCheckIcon className="h-4 w-4" />,
      label: "집계 대상",
      value: `${formatCount(overall.studentCount)}건`,
      tone: "neutral",
    },
    {
      key: "exam",
      icon: <ClipboardIcon className="h-4 w-4" />,
      label: "시험 평균",
      value: `${formatNumber(overall.examAverage, 1)}점`,
      tone: "neutral",
    },
    {
      key: "assignment",
      icon: <TargetIcon className="h-4 w-4" />,
      label: "과제 평균",
      value: `${formatNumber(overall.assignmentAverage, 1)}점`,
      tone: "neutral",
    },
    {
      key: "improved",
      icon: <StarIcon className="h-4 w-4" />,
      label: "향상 학생",
      value: `${formatCount(overall.improvedStudentCount)}명`,
      badge: <Badge tone="accent">{formatNumber(overall.improvedStudentRate, 1)}%</Badge>,
      tone: "success",
    },
  ];
}

interface InterpretationBlockProps {
  title: string;
  /** 큰 숫자 자리(DeviationValue) */
  headline: ReactNode;
  /** 숫자를 풀어 쓴 문장 */
  sentence: ReactNode;
  /** 근거가 된 두 평균값 */
  detail: string;
  /** 헤드라인 옆 배지 */
  badge?: ReactNode;
}

/**
 * 해석 블록 1개 — 숫자를 문장으로 푸는 카드 안 박스.
 * 카드 안쪽이므로 그림자를 갖지 않고 `bg-surface-sunken` 으로만 구분한다(그림자 계층 0층).
 *
 * @param title 블록 제목
 * @param headline 큰 숫자
 * @param sentence 해석 문장
 * @param detail 근거 값
 * @param badge 보조 배지
 * @returns 해석 블록
 */
function InterpretationBlock({
  title,
  headline,
  sentence,
  detail,
  badge,
}: InterpretationBlockProps) {
  return (
    <div className="rounded-lg bg-surface-sunken p-4">
      <h5 className="text-caption font-medium text-muted">{title}</h5>
      <p className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="text-title font-semibold text-primary lg:text-display">{headline}</span>
        {badge}
      </p>
      <p className="mt-2 text-body text-secondary">{sentence}</p>
      <p className="mt-1 text-caption text-muted">{detail}</p>
    </div>
  );
}

interface ComponentAnalysisSectionProps {
  query: AsyncDataState<ComponentAnalysisResponseDto>;
}

/**
 * 평가항목별 분석 섹션.
 *
 * 빈 판정은 `overall.studentCount === 0` 이며, 이때 `byLecture` 표도 렌더하지 않는다.
 *
 * @param query 이 섹션 전용 조회 상태
 * @returns 섹션 카드
 */
export function ComponentAnalysisSection({ query }: ComponentAnalysisSectionProps) {
  const state = deriveSectionState(query, (data) => data.overall.studentCount === 0);
  const data = query.data;

  return (
    <DashboardSection
      id={COMPONENT_ANALYSIS_SECTION_ID}
      title="평가항목별 분석"
      description="시험과 과제 중 어디서 점수가 나왔는지, 학기 전반부와 후반부 중 언제 성취가 높았는지 봅니다."
      icon={<ClipboardIcon />}
      state={state}
      onRetry={query.refetch}
      emptyTitle="집계할 성적이 없습니다."
      emptyIcon={<ClipboardIcon className="h-6 w-6 md:h-8 md:w-8" />}
      skeleton={<TableSectionSkeleton rows={SKELETON_ROWS} />}
    >
      {data ? (
        <>
          <SectionStatStrip items={buildStatItems(data.overall)} />

          <h4 className="mb-2 mt-6 text-body font-semibold text-primary">평가항목별 평균</h4>
          {/* 이 문장이 "왜 %가 없는가"에 대한 화면상의 답이다. 빼지 말 것. */}
          <p className="mb-3 text-caption text-muted">
            막대 길이는 4개 항목 중 가장 높은 값을 기준으로 한 상대 비교입니다. 항목별 만점 정보가
            없어 백분율은 제공하지 않습니다.
          </p>
          <DistributionBar items={buildComponentBars(data.overall)} />

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <InterpretationBlock
              title="시험 vs 과제"
              headline={<DeviationValue value={data.overall.examVsAssignmentGap} unit="점" />}
              sentence={describeExamGap(data.overall.examVsAssignmentGap)}
              detail={`시험 평균 ${formatNumber(data.overall.examAverage, 1)}점 · 과제 평균 ${formatNumber(
                data.overall.assignmentAverage,
                1,
              )}점`}
            />
            <InterpretationBlock
              title="전반부 vs 후반부"
              headline={
                <DeviationValue
                  value={data.overall.improvement}
                  tone="evaluative"
                  unit="점"
                  srLabel={{
                    up: "후반부가 더 높음",
                    down: "후반부가 더 낮음",
                    flat: "전후반이 같음",
                  }}
                />
              }
              badge={
                <Badge tone="accent">
                  향상 학생 {formatCount(data.overall.improvedStudentCount)}명 (
                  {formatNumber(data.overall.improvedStudentRate, 1)}%)
                </Badge>
              }
              sentence={describeImprovement(data.overall.improvement)}
              detail={`전반부 평균 ${formatNumber(data.overall.midtermHalfAverage, 1)}점 · 후반부 평균 ${formatNumber(
                data.overall.finalHalfAverage,
                1,
              )}점`}
            />
          </div>

          {/* byLecture 가 비어도 섹션 전체를 빈 상태로 만들지 않는다 — overall 은 값이 있다. */}
          {data.byLecture.length > 0 ? (
            <>
              <h4 className="mb-3 mt-6 text-body font-semibold text-primary">강의별 평가항목</h4>
              <DataTable
                caption="강의별 평가항목 평균"
                columns={BY_LECTURE_COLUMNS}
                rows={data.byLecture}
                getRowKey={(row) => row.lectureId}
                tableMinWidth="table-lg"
                surface="plain"
                showScrollHint
              />
            </>
          ) : null}
        </>
      ) : null}
    </DashboardSection>
  );
}
