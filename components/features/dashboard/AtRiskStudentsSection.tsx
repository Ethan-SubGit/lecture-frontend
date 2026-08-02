import { Badge } from "@/components/ui/Badge";
import { AlertTriangleIcon, ShieldCheckIcon, TargetIcon } from "@/components/ui/icons";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { DataTable, type Column } from "@/components/data/DataTable";
import { EMPTY_VALUE_PLACEHOLDER, formatCount, formatNumber, maskStudentName } from "@/lib/format";
import { AT_RISK_STUDENTS_LIMIT } from "@/lib/constants";
import type { AsyncDataState } from "@/hooks/useAsyncData";
import type { AtRiskStudentItemDto, AtRiskStudentsResponseDto } from "@/types/api";
import { DashboardSection, deriveSectionState } from "./DashboardSection";
import { InitialAvatar } from "./InitialAvatar";
import { SectionStatStrip, type SectionStatItem } from "./SectionStatStrip";
import { TableSectionSkeleton } from "./SectionSkeletons";

/**
 * ⑩ 학사경고 위험군 학생 섹션 (design.md 4.29).
 *
 * **행동을 요구하는 유일한 섹션**이라 맨 마지막에 온다.
 * 판정 기준값은 요청값이 아니라 **응답의 `failCountAtLeast` / `averageBelow`** 를 쓴다 —
 * 서버 기본값이 바뀌어도 화면 안내가 거짓말이 되지 않게 하기 위함이다.
 */

export const AT_RISK_STUDENTS_SECTION_ID = "at-risk-students";

const SKELETON_ROWS = 8;

/**
 * 표 컬럼을 만든다. `averageBelow` 기준 미달 여부를 셀에서 판정해야 하므로
 * 정적 상수가 아니라 응답값을 받는 함수다.
 *
 * @param averageBelow 응답의 평균 성취도 기준(%)
 * @returns 컬럼 정의
 */
function buildColumns(averageBelow: number): Column<AtRiskStudentItemDto>[] {
  return [
    {
      key: "student",
      header: "학생",
      mobilePriority: "title",
      /* 랭킹 섹션과 동일한 규약이다(design.md 4.32 / 6.7.6).
         학번은 그대로 남으므로 담당자가 명단을 보고 행동하는 데 지장이 없다. */
      cell: (row) => {
        const maskedName = maskStudentName(row.studentName);
        // 값이 없으면 `—` 의 첫 글자를 칩에 그리지 않는다(InitialAvatar 가 빈 값이면 null).
        const avatarName = maskedName === EMPTY_VALUE_PLACEHOLDER ? "" : maskedName;

        return (
          <div className="flex items-center gap-2">
            <InitialAvatar name={avatarName} tone="danger" />
            <div className="min-w-0">
              <p className="truncate text-body-sm font-medium text-primary">{maskedName}</p>
              <p className="text-caption tabular-nums text-muted">{row.studentNumber}</p>
            </div>
          </div>
        );
      },
    },
    {
      // failCount === 0 인 학생은 성취도 기준으로만 걸린 경우다. F학점 배지를 붙이면 거짓이 된다.
      key: "failCount",
      header: "F학점",
      mobilePriority: "badge",
      cell: (row) =>
        row.failCount > 0 ? (
          <Badge tone="danger" icon="✕">
            F {formatCount(row.failCount)}개
          </Badge>
        ) : (
          <Badge tone="warning">성취도 미달</Badge>
        ),
    },
    {
      key: "departmentName",
      header: "학과",
      mobilePriority: "full",
      cell: (row) => row.departmentName,
    },
    {
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
      cell: (row) => {
        const isBelowThreshold = row.averagePercentage < averageBelow;
        return (
          <span className={isBelowThreshold ? "font-semibold text-danger-strong" : undefined}>
            {formatNumber(row.averagePercentage, 1)}%
            {isBelowThreshold ? <span className="sr-only"> 기준 미만</span> : null}
          </span>
        );
      },
    },
    {
      /* 위험 사유는 **서버 문자열 그대로, 배열 원소를 전부** 표시한다(spec.md 가정 25).
         톤을 danger 로 통일하는 이유: 사유마다 색을 나누면 "어느 사유가 더 나쁜가"라는 없는 축이 생긴다. */
      key: "riskReasons",
      header: "위험 사유",
      mobilePriority: "full",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.riskReasons.map((reason) => (
            <Badge key={reason} tone="danger" className="whitespace-normal break-words">
              {reason}
            </Badge>
          ))}
        </div>
      ),
    },
  ];
}

/**
 * 스트립 칩 3개를 만든다.
 *
 * @param data 위험군 응답
 * @returns 스트립 칩 목록
 */
function buildStatItems(data: AtRiskStudentsResponseDto): SectionStatItem[] {
  const maxFailCount = Math.max(...data.items.map((item) => item.failCount));
  const topFailStudent = data.items.find((item) => item.failCount === maxFailCount);

  /* 「F학점 최다」 배지는 학번 없이 이름만 보이는 지점이다. 마스킹하되 학번을 덧붙이지 않는다 —
     같은 학생이 바로 아래 표(학번 포함)에 반드시 있다(design.md 4.32.4). */
  const maskedTopFailName = topFailStudent
    ? maskStudentName(topFailStudent.studentName)
    : EMPTY_VALUE_PLACEHOLDER;

  return [
    {
      key: "size",
      icon: <AlertTriangleIcon className="h-4 w-4" />,
      label: "표시 인원",
      value: `${formatCount(data.items.length)}명`,
      tone: "danger",
    },
    {
      key: "criteria",
      icon: <TargetIcon className="h-4 w-4" />,
      label: "판정 기준",
      value: `F학점 ${formatCount(data.failCountAtLeast)}개 이상 또는 성취도 ${formatNumber(
        data.averageBelow,
        0,
      )}% 미만`,
      tone: "warning",
    },
    {
      key: "max-fail",
      icon: <AlertTriangleIcon className="h-4 w-4" />,
      label: "F학점 최다",
      value: `${formatCount(maxFailCount)}개`,
      // 이름이 빈 값이면 `—` 만 든 배지 대신 배지 자리를 통째로 없앤다.
      badge:
        maskedTopFailName === EMPTY_VALUE_PLACEHOLDER ? undefined : (
          <Badge tone="neutral">{maskedTopFailName}</Badge>
        ),
      tone: "danger",
    },
  ];
}

interface AtRiskStudentsSectionProps {
  query: AsyncDataState<AtRiskStudentsResponseDto>;
}

/**
 * 학사경고 위험군 학생 섹션.
 *
 * 빈 상태가 **에러가 아니라 좋은 소식**인 유일한 섹션이라 `emptyTone="positive"` 를 쓴다
 * (빨강 톤으로 그리지 않는다).
 *
 * @param query 이 섹션 전용 조회 상태
 * @returns 섹션 카드
 */
export function AtRiskStudentsSection({ query }: AtRiskStudentsSectionProps) {
  const state = deriveSectionState(query, (data) => data.items.length === 0);
  const data = query.data;
  // 받은 건수가 요청 limit 과 같으면 잘렸을 가능성이 있다. 총원 필드가 없어 "N명 중"이라고 쓸 수 없다.
  const isPossiblyTruncated = data ? data.items.length === AT_RISK_STUDENTS_LIMIT : false;

  return (
    <DashboardSection
      id={AT_RISK_STUDENTS_SECTION_ID}
      title="학사경고 위험군 학생"
      description={
        data ? (
          <>
            F학점 {formatCount(data.failCountAtLeast)}개 이상{" "}
            <b className="font-semibold text-secondary">또는</b> 평균 성취도{" "}
            {formatNumber(data.averageBelow, 0)}% 미만인 학생입니다.
          </>
        ) : (
          "F학점 개수 또는 평균 성취도 기준에 해당하는 학생을 보여줍니다."
        )
      }
      icon={<AlertTriangleIcon />}
      state={state}
      onRetry={query.refetch}
      emptyTitle="기준에 해당하는 위험군 학생이 없습니다."
      emptyDescription="현재 기준으로는 학사경고 위험군이 확인되지 않았습니다."
      emptyTone="positive"
      emptyIcon={<ShieldCheckIcon className="h-6 w-6 md:h-8 md:w-8" />}
      skeleton={<TableSectionSkeleton rows={SKELETON_ROWS} />}
      footnotes={[
        "두 조건은 OR입니다. 하나만 해당해도 명단에 포함됩니다.",
        "이름·학과는 성적 데이터 기준의 대표값이며 학적상 소속을 보증하지 않습니다.",
        // 각주 개수를 늘리지 않고 기존 PII 각주 문장만 갱신한다(design.md 4.32.2 #4).
        "학번·이름이 포함된 개인 명단입니다. 이름은 일부를 *로 가려 표시하며, 화면 공유·캡처에 주의하세요.",
      ]}
    >
      {data && data.items.length > 0 ? (
        <>
          <SectionStatStrip items={buildStatItems(data)} columns={3} />

          {isPossiblyTruncated ? (
            <AlertBanner
              tone="warning"
              title="기준에 해당하는 학생이 더 있을 수 있습니다."
              description={`한 번에 최대 ${formatCount(
                AT_RISK_STUDENTS_LIMIT,
              )}명까지만 표시합니다. 응답에 위험군 총원 정보가 없어 전체 인원은 알 수 없습니다.`}
              className="mt-4"
            />
          ) : null}

          <div className="mt-4">
            <DataTable
              caption="학사경고 위험군 학생 명단"
              columns={buildColumns(data.averageBelow)}
              rows={data.items}
              getRowKey={(row) => row.studentNumber}
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
