"use client";

import { useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  BookIcon,
  BuildingIcon,
  ChartIcon,
  DocumentCheckIcon,
  StarIcon,
  TargetIcon,
} from "@/components/ui/icons";
import { MetricCard } from "@/components/data/MetricCard";
import { GradeDistributionPanel } from "@/components/data/GradeDistributionPanel";
import { DataTable, type Column } from "@/components/data/DataTable";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { EmptyState } from "@/components/feedback/EmptyState";
import { MetricCardsSkeleton } from "@/components/feedback/Skeleton";
import { DashboardGroup } from "@/components/features/dashboard/DashboardGroup";
import { DASHBOARD_GROUPS } from "@/components/features/dashboard/groups";
import { SectionNav } from "@/components/features/dashboard/SectionNav";
import {
  ScoreHistogramSection,
} from "@/components/features/dashboard/ScoreHistogramSection";
import {
  DEPARTMENT_ACHIEVEMENT_SECTION_ID,
  DepartmentAchievementSection,
} from "@/components/features/dashboard/DepartmentAchievementSection";
import {
  LECTURE_DIFFICULTY_SECTION_ID,
  LectureDifficultySection,
} from "@/components/features/dashboard/LectureDifficultySection";
import { DepartmentLectureMatrixSection } from "@/components/features/dashboard/DepartmentLectureMatrixSection";
import { ComponentAnalysisSection } from "@/components/features/dashboard/ComponentAnalysisSection";
import {
  TERM_TREND_SECTION_ID,
  TermTrendSection,
} from "@/components/features/dashboard/TermTrendSection";
import { StudentRankingSection } from "@/components/features/dashboard/StudentRankingSection";
import { AtRiskStudentsSection } from "@/components/features/dashboard/AtRiskStudentsSection";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { fetchDashboardSummary } from "@/lib/api/endpoints";
import { formatCount, formatNumber, formatTerm } from "@/lib/format";
import { MAX_GPA, MAX_SCORE, NETWORK_ERROR_MESSAGE } from "@/lib/constants";
import type {
  DepartmentStatItemDto,
  LectureStatItemDto,
  TermStatItemDto,
} from "@/types/api";

/**
 * 대시보드 (`/dashboard`).
 *
 * 섹션 11개 · 그룹 5개의 한 페이지 문서다 (design.md 1.3).
 * - `GET /dashboard/summary` 1건 → KPI 5장 · 등급분포 · 요약 통계 3블록 (기존)
 * - 확장 분석 8건 → 그룹 A~D 의 섹션 8개 (2026-08-01 추가)
 *
 * **9건의 요청이 서로를 기다리지 않고 병렬로 발사되고, 섹션마다 로딩·빈·에러·재시도를
 * 독립적으로 갖는다** (spec.md 6.1). 한 섹션이 실패해도 나머지 8개는 정상 표시된다.
 * 새 라우트도, 새 사이드바 메뉴도 추가하지 않는다.
 *
 * @returns 대시보드 화면
 */
export default function DashboardPage() {
  // useAsyncData 가 fetcher 참조를 의존성으로 쓰므로 useCallback 으로 고정한다.
  const fetcher = useCallback(() => fetchDashboardSummary(), []);
  const { data, isLoading, error, refetch } = useAsyncData(fetcher);

  // 확장 분석 8건. summary 의 도착을 기다리지 않고 마운트 즉시 병렬 발사된다.
  const analytics = useDashboardAnalytics();

  // 성적이 0건이면 확장 분석 8섹션과 목차를 **렌더만** 억제한다(호출은 이미 나간 상태여도 무방).
  // 8개 섹션이 전부 "데이터 없음"으로 줄줄이 늘어서면 화면이 고장 난 것처럼 보이기 때문이다.
  // ⚠️ summary 가 실패했을 때는 억제하지 않는다 — 확장 분석 8건은 독립적인 조회이고,
  //    한 요청의 실패가 다른 섹션을 지우면 섹션 단위 격리(spec.md 6.1)가 깨진다.
  const isEmptyDashboard = Boolean(data && data.totalStudentScores === 0);

  const [overviewGroup, breakdownGroup, compositionGroup, studentsGroup, summaryGroup] =
    DASHBOARD_GROUPS;

  return (
    <PageContainer width="wide">
      <PageHeader
        title="대시보드"
        description="등록 현황과 성적 통계를 한눈에 확인합니다."
      />

      {/* 그룹 간 간격은 그룹 안 섹션 간격(space-y-4 lg:space-y-6)보다 확실히 넓다 —
          그림자를 더 쓸 수 없으므로 이것이 유일한 시각적 계층 장치다 (design.md 1.3.2). */}
      <div className="mt-6 space-y-8 lg:space-y-10">
        {error ? (
          <AlertBanner
            tone="error"
            title={NETWORK_ERROR_MESSAGE}
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                다시 시도
              </Button>
            }
          />
        ) : null}

        {/* 목차는 확장 분석 섹션이 실제로 렌더될 때만 의미가 있다. */}
        {isEmptyDashboard ? null : <SectionNav />}

        {/* ── 그룹 A: 전체 현황 ─────────────────────────────────────────── */}
        <DashboardGroup group={overviewGroup}>
          {/* 로딩 중에도 KPI·등급분포 자리를 잡아 두어 데이터 도착 시 화면이 튀지 않게 한다. */}
          {isLoading ? <MetricCardsSkeleton /> : null}

          {data ? (
            <>
              {/* KPI 5장 (design.md 4.14 배정표 그대로).
                  ul 로 감싸 스크린리더가 "지표 5개"임을 인식하게 한다.
                  shadow-raised 는 「성적 건수」 1장에만 준다 — 이 시스템의 핵심 산출물이자
                  한 화면에서 시선의 시작점이 되어야 하는 카드다. */}
              <section aria-label="요약 지표">
                <ul className={METRIC_GRID_CLASS}>
                  <MetricCard
                    label="학과"
                    value={formatCount(data.totalDepartments)}
                    unit="개"
                    hint="성적 등록에 사용되는 기준 학과"
                    icon={<BuildingIcon />}
                    tone="neutral"
                  />
                  <MetricCard
                    label="수강과목"
                    value={formatCount(data.totalLectures)}
                    unit="개"
                    hint="등록된 전체 강의"
                    icon={<BookIcon />}
                    tone="accent"
                  />
                  <MetricCard
                    label="성적 건수"
                    value={formatCount(data.totalStudentScores)}
                    unit="건"
                    hint="엑셀로 업로드된 학생 성적 행"
                    icon={<DocumentCheckIcon />}
                    tone="accent"
                    emphasis="primary"
                  />
                  <MetricCard
                    label="평균 합계점수"
                    value={formatNumber(data.averageTotalScore, 1)}
                    unit="점"
                    hint={`${MAX_SCORE}점 만점 기준 전체 평균`}
                    icon={<TargetIcon />}
                    tone="success"
                    progress={{ current: data.averageTotalScore, max: MAX_SCORE }}
                  />
                  <MetricCard
                    label="평균 평점"
                    value={formatNumber(data.averageGpa, 2)}
                    hint={`${MAX_GPA} 만점 기준 전체 평균`}
                    icon={<StarIcon />}
                    tone="success"
                    progress={{ current: data.averageGpa, max: MAX_GPA }}
                  />
                </ul>
              </section>

              {/* 성적이 한 건도 없으면 통계가 모두 무의미하므로 안내와 진입점만 보여준다. */}
              {isEmptyDashboard ? (
                <EmptyState
                  icon={<ChartIcon className="h-6 w-6 md:h-8 md:w-8" />}
                  title="아직 등록된 성적이 없습니다."
                  description="엑셀 업로드로 성적을 등록하면 통계가 표시됩니다."
                  action={
                    <Button variant="primary" href="/scores/upload" fullWidth className="sm:w-auto">
                      성적 입력하러 가기
                    </Button>
                  }
                />
              ) : null}
            </>
          ) : null}

          {/* 등급 분포는 KPI 다음가는 주역이므로 raised(패널이 직접 갖는다),
              나머지 카드는 전부 card 로 두어 2단 계층을 유지한다.
              빈/로딩 판정은 GradeDistributionPanel 이 한 곳에서 한다. */}
          {isLoading || data ? (
            <section aria-label="등급 분포">
              <GradeDistributionPanel
                items={data?.gradeDistribution ?? []}
                isLoading={isLoading}
              />
            </section>
          ) : null}

          {isEmptyDashboard ? null : (
            <ScoreHistogramSection query={analytics.scoreHistogram} />
          )}
        </DashboardGroup>

        {/* ── 그룹 B: 분해 분석 ─────────────────────────────────────────── */}
        {isEmptyDashboard ? null : (
          <DashboardGroup group={breakdownGroup}>
            <DepartmentAchievementSection query={analytics.departmentAchievement} />
            <LectureDifficultySection query={analytics.lectureDifficulty} />
            <DepartmentLectureMatrixSection query={analytics.departmentLectureMatrix} />
          </DashboardGroup>
        )}

        {/* ── 그룹 C: 구성과 추이 ───────────────────────────────────────── */}
        {isEmptyDashboard ? null : (
          <DashboardGroup group={compositionGroup}>
            <ComponentAnalysisSection query={analytics.componentAnalysis} />
            <TermTrendSection query={analytics.termTrend} />
          </DashboardGroup>
        )}

        {/* ── 그룹 D: 학생 단위 (학번·이름이 노출되는 구간) ──────────────── */}
        {isEmptyDashboard ? null : (
          <DashboardGroup group={studentsGroup}>
            <StudentRankingSection query={analytics.studentRanking} />
            <AtRiskStudentsSection query={analytics.atRiskStudents} />
          </DashboardGroup>
        )}

        {/* ── 그룹 E: 요약 통계 ───────────────────────────────────────────
            summary 응답의 일부라 섹션 단위 로딩/재시도의 대상이 아니다(KPI·등급분포와 운명을 같이한다).
            위 상세 섹션과 같은 지표가 두 군데 보이는 혼란을 막기 위해
            제목을 「…별 요약」으로 두고 `요약` 배지 + [상세 보기] 앵커 링크를 붙인다. */}
        {data ? (
          <DashboardGroup group={summaryGroup}>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              <StatBlock
                title="학과별 요약"
                caption="학과별 요약 통계"
                detailHref={`#${DEPARTMENT_ACHIEVEMENT_SECTION_ID}`}
                showDetailLink={!isEmptyDashboard}
                rows={data.departmentStats}
                getRowKey={(row) => row.departmentName}
                columns={DEPARTMENT_STAT_COLUMNS}
              />
              <StatBlock
                title="학기별 요약"
                caption="학기별 요약 통계"
                detailHref={`#${TERM_TREND_SECTION_ID}`}
                showDetailLink={!isEmptyDashboard}
                rows={data.termStats}
                getRowKey={(row) => row.term}
                columns={TERM_STAT_COLUMNS}
              />
              {/* 강의별 요약은 강의명이 길어 md 에서 2열을 다 쓰게 한다. */}
              <StatBlock
                title="강의별 요약"
                caption="강의별 요약 통계"
                detailHref={`#${LECTURE_DIFFICULTY_SECTION_ID}`}
                showDetailLink={!isEmptyDashboard}
                rows={data.lectureStats}
                getRowKey={(row) => `${row.lectureName}-${row.term}`}
                columns={LECTURE_STAT_COLUMNS}
                className="md:col-span-2 lg:col-span-1"
              />
            </div>
          </DashboardGroup>
        ) : null}
      </div>
    </PageContainer>
  );
}

/**
 * KPI 그리드 클래스 (design.md 4.14 반응형 표 + 1280px 실측 경고).
 *
 * 사이드바(272px)를 뺀 나머지에서 5열을 만들면 카드 1장이 1280px 뷰포트에서 약 170px 이라
 * 아이콘(48) + 36px 숫자가 겹친다. 그래서 5열 승격을 xl(1280↑ 여유 폭)로 미루고
 * lg 구간은 3열을 유지한다 — design.md 가 허용한 `lg:grid-cols-3 xl:grid-cols-5` 대안이다.
 */
const METRIC_GRID_CLASS =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:gap-6 xl:grid-cols-5";

/** 학과별 요약 컬럼 정의. */
const DEPARTMENT_STAT_COLUMNS: Column<DepartmentStatItemDto>[] = [
  { key: "departmentName", header: "학과명", mobilePriority: "title", cell: (row) => row.departmentName },
  { key: "studentCount", header: "인원", align: "right", cell: (row) => formatCount(row.studentCount) },
  {
    key: "averageTotalScore",
    header: "평균 합계점수",
    align: "right",
    cell: (row) => formatNumber(row.averageTotalScore, 1),
  },
];

/** 학기별 요약 컬럼 정의. */
const TERM_STAT_COLUMNS: Column<TermStatItemDto>[] = [
  { key: "term", header: "학기", mobilePriority: "title", cell: (row) => formatTerm(row.term) },
  { key: "studentCount", header: "인원", align: "right", cell: (row) => formatCount(row.studentCount) },
  {
    key: "averageTotalScore",
    header: "평균 합계점수",
    align: "right",
    cell: (row) => formatNumber(row.averageTotalScore, 1),
  },
];

/** 강의별 요약 컬럼 정의. 강의명과 학기를 함께 보여준다(수용 기준). */
const LECTURE_STAT_COLUMNS: Column<LectureStatItemDto>[] = [
  { key: "lectureName", header: "강의명", mobilePriority: "title", cell: (row) => row.lectureName },
  { key: "term", header: "학기", mobilePriority: "full", cell: (row) => formatTerm(row.term) },
  { key: "studentCount", header: "인원", align: "right", cell: (row) => formatCount(row.studentCount) },
  {
    key: "averageTotalScore",
    header: "평균 합계점수",
    align: "right",
    cell: (row) => formatNumber(row.averageTotalScore, 1),
  },
];

interface StatBlockProps<T> {
  title: string;
  caption: string;
  /** 대응하는 상세 섹션의 앵커 (`#department-achievement` 등) */
  detailHref: string;
  /** 상세 섹션이 렌더되지 않는 상황(성적 0건)에서는 링크를 감춘다 — 갈 곳이 없는 링크를 두지 않는다 */
  showDetailLink: boolean;
  rows: T[];
  getRowKey: (row: T) => string;
  columns: Column<T>[];
  className?: string;
}

/**
 * 그룹 E의 요약 통계 3블록 공통 렌더러 (design.md 4.30).
 *
 * 구현은 기존 그대로이고 **제목·배지·설명·앵커 링크 4가지만** 바뀌었다.
 * 같은 지표가 위(상세)와 아래(요약) 두 군데 있으므로, 제목이 비슷하면 사용자는
 * "두 표가 다른 데이터"라고 오해한다 — 위계를 문구와 배지로 명시한다.
 *
 * @param title 카드 제목
 * @param caption 표의 스크린리더용 캡션
 * @param detailHref 상세 섹션 앵커
 * @param showDetailLink 상세 보기 링크 노출 여부
 * @param rows 통계 행
 * @param getRowKey 행 key 추출 함수
 * @param columns 컬럼 정의
 * @returns 요약 통계 카드
 */
function StatBlock<T>({
  title,
  caption,
  detailHref,
  showDetailLink,
  rows,
  getRowKey,
  columns,
  className,
}: StatBlockProps<T>) {
  return (
    <Card className={className}>
      <CardHeader
        as="h3"
        title={title}
        badge={<Badge tone="neutral">요약</Badge>}
        description="인원수와 평균만 담은 간단 표입니다."
        action={
          showDetailLink ? (
            <Button variant="link" size="sm" href={detailHref}>
              상세 보기
            </Button>
          ) : undefined
        }
      />
      {rows.length === 0 ? (
        <p className="py-8 text-center text-body text-muted">데이터 없음</p>
      ) : (
        <DataTable
          caption={caption}
          columns={columns}
          rows={rows}
          getRowKey={getRowKey}
          surface="plain"
        />
      )}
    </Card>
  );
}
