import { Badge } from "@/components/ui/Badge";
import { BookIcon, TargetIcon, AlertTriangleIcon } from "@/components/ui/icons";
import { DataTable, type Column } from "@/components/data/DataTable";
import { formatCount, formatNumber, formatTerm } from "@/lib/format";
import type { AsyncDataState } from "@/hooks/useAsyncData";
import type {
  LectureDifficultyItemDto,
  LectureDifficultyResponseDto,
} from "@/types/api";
import { DashboardSection, deriveSectionState } from "./DashboardSection";
import { DeviationValue } from "./DeviationValue";
import { SectionStatStrip, type SectionStatItem } from "./SectionStatStrip";
import { TableSectionSkeleton } from "./SectionSkeletons";
import { StatValue } from "./StatValue";

/**
 * ⑤ 강의별 난이도·성적편차 섹션 (design.md 4.24).
 *
 * 두 번째 분해 축(강의). **이 섹션에서만 플래그 배지가 나온다.**
 */

/** 이 섹션의 앵커 id. 그룹 E 의 「강의별 요약」이 [상세 보기]로 이 id 를 가리킨다. */
export const LECTURE_DIFFICULTY_SECTION_ID = "lecture-difficulty";

const SKELETON_ROWS = 6;

/** 판정 근거 문구. 배지 `title` 과 각주가 **같은 문장**을 쓰도록 상수로 둔다. */
const INFLATION_REASON = "학점 인플레이션 의심 = A등급(평점 4.0 이상) 비율이 50% 이상인 강의입니다.";
const OUTLIER_REASON =
  "평균 대비 쉬움/어려움 = 전체 가중평균과 성취도가 10%p 이상 차이 나는 강의입니다.";

interface FlagBadgesProps {
  item: LectureDifficultyItemDto;
}

/**
 * 강의 판정 플래그 배지 0~2개 (design.md 4.24.1).
 *
 * 톤 배정의 근거:
 * - `gradeInflation` → **warning**. spec 3.7 (3)이 "경고이지 오류가 아니다"라고 못 박았고,
 *   이 시스템의 `danger` 는 삭제·전량 실패·F등급에 배정되어 있어 붙이는 순간 "잘못된 강의"로 읽힌다.
 * - `difficultyOutlier` → EASY/HARD **둘 다 accent**. 이상치는 좋고 나쁨이 아니라 **분류**이며,
 *   서로 다른 색을 주면 "초록=좋음/빨강=나쁨"이라는 없는 축이 생긴다.
 *   **방향은 색이 아니라 글리프(▲/▼)와 텍스트가 말한다.**
 * - `null` 이면 아무것도 렌더하지 않는다(빈 배지를 그리지 않는다).
 * - 두 플래그는 판정 기준이 다르므로(A비율 50% vs 평균 10%p 차이) 하나로 합치지 않는다.
 *
 * @param item 강의 난이도 항목
 * @returns 배지 묶음. 플래그가 하나도 없으면 null
 */
function FlagBadges({ item }: FlagBadgesProps) {
  if (!item.gradeInflation && item.difficultyOutlier === null) return null;

  return (
    <span className="flex flex-wrap items-center gap-1">
      {item.gradeInflation ? (
        <Badge tone="warning" icon="⚠" className="whitespace-normal" title={INFLATION_REASON}>
          학점 인플레이션 의심
        </Badge>
      ) : null}

      {item.difficultyOutlier !== null ? (
        <Badge
          tone="accent"
          icon={item.difficultyOutlier === "EASY" ? "▲" : "▼"}
          className="whitespace-normal"
          title={OUTLIER_REASON}
        >
          {item.difficultyOutlier === "EASY" ? "평균 대비 쉬움" : "평균 대비 어려움"}
        </Badge>
      ) : null}
    </span>
  );
}

/** 표 컬럼 정의. 정렬 UI 는 달지 않는다(서버 순서 = 평균 내림차순이 전제). */
const COLUMNS: Column<LectureDifficultyItemDto>[] = [
  {
    key: "lectureName",
    header: "강의",
    mobilePriority: "title",
    cell: (row) => row.lectureName,
  },
  {
    // 판정이 없으면 이 칸이 비는데 정상이다(빈 배지를 만들지 않는다).
    key: "flags",
    header: "판정",
    mobilePriority: "badge",
    cell: (row) => <FlagBadges item={row} />,
  },
  {
    key: "term",
    header: "학기",
    mobilePriority: "full",
    cell: (row) => formatTerm(row.term),
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
    key: "stddevTotalScore",
    header: "표준편차",
    align: "right",
    cell: (row) => <StatValue value={row.stddevTotalScore} />,
  },
  {
    key: "averageGpa",
    header: "평균 평점",
    align: "right",
    cell: (row) => formatNumber(row.averageGpa, 2),
  },
  {
    key: "gradeRates",
    header: "A / F 비율",
    align: "right",
    cell: (row) => (
      <span className="whitespace-nowrap">
        <span className="sr-only">
          A등급 비율 {formatNumber(row.aGradeRate, 1)}%, F등급 비율{" "}
          {formatNumber(row.fGradeRate, 1)}%
        </span>
        <span aria-hidden="true">
          {formatNumber(row.aGradeRate, 1)}% / {formatNumber(row.fGradeRate, 1)}%
        </span>
      </span>
    ),
  },
  {
    /* 편차에 tone="neutral" 을 쓰는 이유(design.md 4.21.2): 평균이 전체보다 높다 = "쉬운 강의"이고,
       그건 좋을 수도(잘 가르쳤다) 나쁠 수도(변별력 없음) 있다. 초록/빨강을 칠하면
       화면이 없는 판단을 내리는 것이다. 점(点)과 %p 를 한 줄로 합치지 않는다 —
       "+2.1점 (+2.1%p)" 로 보이면 두 값이 같은 것으로 오해된다. */
    key: "deviation",
    header: "전체 대비 편차",
    align: "right",
    cell: (row) => (
      <span className="flex flex-col items-end gap-0.5">
        <DeviationValue value={row.deviationFromOverall} unit="점" />
        <span className="text-caption text-muted">
          <DeviationValue value={row.deviationPercentagePoint} unit="%p" />
        </span>
      </span>
    ),
  },
];

/**
 * 스트립 칩 4개를 만든다.
 * 칩 3의 톤이 개수에 따라 바뀌는 이유: **0건인데 노란 칩은 거짓 경보**이기 때문이다.
 *
 * @param data 강의 난이도 응답
 * @returns 스트립 칩 목록
 */
function buildStatItems(data: LectureDifficultyResponseDto): SectionStatItem[] {
  const inflationCount = data.items.filter((item) => item.gradeInflation).length;
  const easyCount = data.items.filter((item) => item.difficultyOutlier === "EASY").length;
  const hardCount = data.items.filter((item) => item.difficultyOutlier === "HARD").length;
  const hasOutlier = easyCount + hardCount > 0;

  return [
    {
      // spec 3.7 (3)이 요구하는 "전체 가중평균 기준선" 표시가 여기다.
      key: "baseline",
      icon: <TargetIcon className="h-4 w-4" />,
      label: "전체 가중평균 (기준선)",
      value: `${formatNumber(data.overallAverageTotalScore, 1)}점`,
      badge: (
        <Badge tone="neutral">
          성취도 {formatNumber(data.overallAveragePercentage, 1)}%
        </Badge>
      ),
      tone: "accent",
    },
    {
      key: "lectures",
      icon: <BookIcon className="h-4 w-4" />,
      label: "집계 강의",
      value: `${formatCount(data.items.length)}개`,
      tone: "neutral",
    },
    {
      key: "inflation",
      icon: <AlertTriangleIcon className="h-4 w-4" />,
      label: "학점 인플레이션 의심",
      value: inflationCount > 0 ? `${formatCount(inflationCount)}개` : "없음",
      tone: inflationCount > 0 ? "warning" : "neutral",
    },
    {
      key: "outlier",
      icon: <TargetIcon className="h-4 w-4" />,
      label: "난이도 이상치",
      value: hasOutlier
        ? `쉬움 ${formatCount(easyCount)} · 어려움 ${formatCount(hardCount)}`
        : "없음",
      tone: hasOutlier ? "accent" : "neutral",
    },
  ];
}

interface LectureDifficultySectionProps {
  query: AsyncDataState<LectureDifficultyResponseDto>;
}

/**
 * 강의별 난이도·성적편차 섹션.
 *
 * @param query 이 섹션 전용 조회 상태
 * @returns 섹션 카드
 */
export function LectureDifficultySection({ query }: LectureDifficultySectionProps) {
  const state = deriveSectionState(query, (data) => data.items.length === 0);
  const data = query.data;
  const items = data?.items ?? [];

  const hasNullStddev = items.some((item) => item.stddevTotalScore === null);
  const footnotes = [
    INFLATION_REASON,
    OUTLIER_REASON,
    "수강생이 1~2명인 강의도 그대로 표시합니다. 통계가 불안정할 수 있으니 인원 열을 함께 보세요.",
    ...(hasNullStddev
      ? ["— 는 수강생이 1명 이하여서 표준편차를 계산할 수 없는 값입니다."]
      : []),
  ];

  return (
    <DashboardSection
      id={LECTURE_DIFFICULTY_SECTION_ID}
      title="강의별 난이도·성적편차"
      description="전체 평균을 기준선으로 두고 강의별로 얼마나 쉬웠는지·점수가 얼마나 흩어졌는지 봅니다."
      icon={<BookIcon />}
      badge={<Badge tone="accent">상세</Badge>}
      state={state}
      onRetry={query.refetch}
      emptyTitle="집계할 강의가 없습니다."
      emptyIcon={<BookIcon className="h-6 w-6 md:h-8 md:w-8" />}
      skeleton={<TableSectionSkeleton rows={SKELETON_ROWS} />}
      footnotes={footnotes}
    >
      {data ? (
        <>
          <SectionStatStrip items={buildStatItems(data)} />

          <div className="mt-4">
            <DataTable
              caption="강의별 난이도와 성적편차"
              columns={COLUMNS}
              rows={items}
              getRowKey={(row) => row.lectureId}
              tableMinWidth="table-lg"
              surface="plain"
              showScrollHint
            />
          </div>
        </>
      ) : null}
    </DashboardSection>
  );
}
