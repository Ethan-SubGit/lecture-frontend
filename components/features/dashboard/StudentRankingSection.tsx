import { Badge } from "@/components/ui/Badge";
import { BookIcon, StarIcon, TrophyIcon } from "@/components/ui/icons";
import { DataTable, type Column } from "@/components/data/DataTable";
import { EMPTY_VALUE_PLACEHOLDER, formatCount, formatNumber, maskStudentName } from "@/lib/format";
import type { AsyncDataState } from "@/hooks/useAsyncData";
import type { StudentRankingItemDto, StudentRankingResponseDto } from "@/types/api";
import { DashboardSection, deriveSectionState } from "./DashboardSection";
import { InitialAvatar } from "./InitialAvatar";
import { RankBadge } from "./RankBadge";
import { SectionStatStrip, type SectionStatItem } from "./SectionStatStrip";
import { TableSectionSkeleton } from "./SectionSkeletons";

/**
 * ⑨ 학생 종합 성적 랭킹 섹션 (design.md 4.28).
 *
 * 집계에서 **개인 단위로 내려가는 지점**이며 여기부터 학번·이름이 보인다.
 * 순위는 서버가 준 `rank` 를 그대로 표시한다 — 동점 처리(SQL RANK)는 서버 규칙이라
 * 클라이언트가 1,2,2,4 를 다시 매기면 서버와 화면이 어긋난다.
 */

export const STUDENT_RANKING_SECTION_ID = "student-ranking";

/** 로딩 스켈레톤 행 수. 요청 limit(10)에 맞춰 실제 표 높이에 가깝게 둔다. */
const SKELETON_ROWS = 10;

/** 표 컬럼. 정렬 UI 를 달지 않는다(서버 순서 = 평균 평점 내림차순이 전제). */
const COLUMNS: Column<StudentRankingItemDto>[] = [
  {
    key: "rank",
    header: "순위",
    mobilePriority: "badge",
    cell: (row) => <RankBadge rank={row.rank} />,
  },
  {
    key: "student",
    header: "학생",
    mobilePriority: "title",
    /* 이 섹션은 로그인 직후 착지 화면이라 노출 위험이 `/scores` 보다 오히려 높다(spec.md 2.2 (나)).
       행의 식별자는 이름이 아니라 **학번**이므로 이름을 가려도 "누구인지 특정해 행동한다"는
       섹션의 목적은 그대로 달성된다(design.md 6.7.6). */
    cell: (row) => {
      const maskedName = maskStudentName(row.studentName);
      // 값이 없으면 `—` 의 첫 글자를 칩에 그리지 않는다. 빈 값은 InitialAvatar 가 null 을 반환한다.
      const avatarName = maskedName === EMPTY_VALUE_PLACEHOLDER ? "" : maskedName;

      return (
        <div className="flex items-center gap-2">
          {/* 칩은 마스킹된 이름의 첫 글자다 — index 0 은 마스킹 대상이 아니라 결과가 원본과 같다. */}
          <InitialAvatar name={avatarName} />
          <div className="min-w-0">
            <p className="truncate text-body-sm font-medium text-primary">{maskedName}</p>
            <p className="text-caption tabular-nums text-muted">{row.studentNumber}</p>
          </div>
        </div>
      );
    },
  },
  {
    key: "departmentName",
    header: "학과",
    mobilePriority: "full",
    cell: (row) => row.departmentName,
  },
  {
    // 1과목만 듣고 1위가 되는 왜곡을 사용자가 알아볼 수 있도록 반드시 노출한다(spec.md 가정 28).
    key: "lectureCount",
    header: "수강 강의 수",
    align: "right",
    cell: (row) => `${formatCount(row.lectureCount)}과목`,
  },
  {
    key: "averageGpa",
    header: "평균 평점",
    align: "right",
    cell: (row) => formatNumber(row.averageGpa, 2),
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
];

/**
 * 스트립 칩 3개를 만든다. 서버가 평균 평점 내림차순으로 주므로 1위는 배열의 첫 항목이다.
 *
 * @param items 랭킹 목록(1건 이상)
 * @returns 스트립 칩 목록
 */
function buildStatItems(items: StudentRankingItemDto[]): SectionStatItem[] {
  const top = items[0];
  const maxLectureCount = Math.max(...items.map((item) => item.lectureCount));

  /* 배지는 **학번 없이 이름만 보이는 유일한 지점**이었다 — 마스킹으로 그 단독 실명이 사라진다.
     학번을 덧붙이지 않는다: 배지에 나온 사람은 바로 아래 표에 반드시 있고(랭킹 1위),
     칩이 길어지면 스트립 3칩 레이아웃이 모바일에서 무너진다(design.md 4.32.4). */
  const maskedTopName = maskStudentName(top.studentName);

  return [
    {
      key: "size",
      icon: <TrophyIcon className="h-4 w-4" />,
      label: "표시 인원",
      value: `상위 ${formatCount(items.length)}명`,
      tone: "neutral",
    },
    {
      key: "top-gpa",
      icon: <StarIcon className="h-4 w-4" />,
      label: "최고 평균 평점",
      value: formatNumber(top.averageGpa, 2),
      // `—` 만 든 배지는 "데이터 오류"로 읽히므로 배지 자리를 통째로 없앤다.
      badge:
        maskedTopName === EMPTY_VALUE_PLACEHOLDER ? undefined : (
          <Badge tone="neutral">{maskedTopName}</Badge>
        ),
      tone: "success",
    },
    {
      key: "max-lectures",
      icon: <BookIcon className="h-4 w-4" />,
      label: "최다 수강",
      value: `${formatCount(maxLectureCount)}과목`,
      tone: "neutral",
    },
  ];
}

interface StudentRankingSectionProps {
  query: AsyncDataState<StudentRankingResponseDto>;
}

/**
 * 학생 종합 성적 랭킹 섹션.
 *
 * 표시 인원 문구는 상수가 아니라 **`items.length`** 에서 만든다 —
 * 요청 limit 이 바뀌어도 화면 문구가 어긋나지 않는다.
 *
 * @param query 이 섹션 전용 조회 상태
 * @returns 섹션 카드
 */
export function StudentRankingSection({ query }: StudentRankingSectionProps) {
  const state = deriveSectionState(query, (data) => data.items.length === 0);
  const items = query.data?.items ?? [];

  return (
    <DashboardSection
      id={STUDENT_RANKING_SECTION_ID}
      title="학생 종합 성적 랭킹"
      description={`평균 평점이 높은 상위 ${formatCount(items.length)}명입니다. 수강 강의 수를 함께 보세요.`}
      icon={<TrophyIcon />}
      state={state}
      onRetry={query.refetch}
      emptyTitle="표시할 랭킹이 없습니다."
      emptyIcon={<TrophyIcon className="h-6 w-6 md:h-8 md:w-8" />}
      skeleton={<TableSectionSkeleton rows={SKELETON_ROWS} />}
      footnotes={[
        "동점자는 같은 순위이며 다음 순위는 건너뜁니다.",
        "이름·학과는 성적 데이터 기준의 대표값이며 학적상 소속을 보증하지 않습니다.",
        "1과목만 수강한 학생도 포함됩니다. 수강 강의 수 열을 함께 보세요.",
        // 각주 개수를 늘리지 않는다 — 마스킹은 이 경고가 말하던 위험에 대한 조치이므로
        // 같은 문장 안에 넣는 것이 의미상으로도 맞다(design.md 4.32.2 #4).
        "학번·이름이 포함된 명단입니다. 이름은 일부를 *로 가려 표시하며, 화면 공유·캡처에 주의하세요.",
      ]}
    >
      {items.length > 0 ? (
        <>
          <SectionStatStrip items={buildStatItems(items)} columns={3} />

          <div className="mt-4">
            <DataTable
              caption="학생 종합 성적 랭킹"
              columns={COLUMNS}
              rows={items}
              getRowKey={(row) => row.studentNumber}
              tableMinWidth="table-md"
              surface="plain"
              showScrollHint
            />
          </div>
        </>
      ) : null}
    </DashboardSection>
  );
}
