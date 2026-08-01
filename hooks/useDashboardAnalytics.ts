"use client";

import { useCallback } from "react";
import { useAsyncData, type AsyncDataState } from "./useAsyncData";
import {
  fetchAtRiskStudents,
  fetchComponentAnalysis,
  fetchDepartmentAchievement,
  fetchDepartmentLectureMatrix,
  fetchLectureDifficulty,
  fetchScoreHistogram,
  fetchStudentRanking,
  fetchTermTrend,
} from "@/lib/api/endpoints";
import type {
  AtRiskStudentsResponseDto,
  ComponentAnalysisResponseDto,
  DepartmentAchievementResponseDto,
  DepartmentLectureMatrixResponseDto,
  LectureDifficultyResponseDto,
  ScoreHistogramResponseDto,
  StudentRankingResponseDto,
  TermTrendResponseDto,
} from "@/types/api";

/**
 * 대시보드 확장 분석 8종의 조회 상태 (spec.md 6.1).
 *
 * **`Promise.all` 로 묶지 않는다.** 8개는 서로 다른 엔드포인트이고 실패도 독립적이라
 * 한 덩어리로 묶으면 하나만 실패해도 대시보드 전체가 에러 화면이 되고,
 * 화면 완성 시간이 가장 느린 하나에 끌려간다.
 * 섹션 1개 = `useAsyncData` 1개이며, 훅이 마운트되는 즉시 8건이 **병렬로** 발사된다.
 *
 * 성적이 0건이어도 이 훅은 그대로 호출된다 — 8섹션을 감추는 처리는 **렌더 억제**이지
 * 호출 억제가 아니다(summary 도착을 기다렸다가 8개를 호출하면 첫 화면 완성 시간이 두 배가 된다).
 */
export interface DashboardAnalyticsQueries {
  scoreHistogram: AsyncDataState<ScoreHistogramResponseDto>;
  departmentAchievement: AsyncDataState<DepartmentAchievementResponseDto>;
  lectureDifficulty: AsyncDataState<LectureDifficultyResponseDto>;
  componentAnalysis: AsyncDataState<ComponentAnalysisResponseDto>;
  termTrend: AsyncDataState<TermTrendResponseDto>;
  departmentLectureMatrix: AsyncDataState<DepartmentLectureMatrixResponseDto>;
  studentRanking: AsyncDataState<StudentRankingResponseDto>;
  atRiskStudents: AsyncDataState<AtRiskStudentsResponseDto>;
}

/**
 * 확장 분석 8종을 각각 독립적으로 조회한다.
 *
 * 각 `fetcher` 는 `useCallback` 으로 참조를 고정한다 — `useAsyncData` 가 fetcher 를 의존성으로
 * 쓰므로 참조가 매 렌더 바뀌면 무한 재조회가 된다.
 * 이번 라운드는 필터를 넘기지 않는다(전체 기준 집계, spec.md 2.1).
 *
 * @returns 섹션별 조회 상태 8개. 각각 자기 `refetch` 를 갖는다(재시도는 섹션 로컬이다)
 */
export function useDashboardAnalytics(): DashboardAnalyticsQueries {
  const scoreHistogramFetcher = useCallback(() => fetchScoreHistogram(), []);
  const departmentAchievementFetcher = useCallback(() => fetchDepartmentAchievement(), []);
  const lectureDifficultyFetcher = useCallback(() => fetchLectureDifficulty(), []);
  const componentAnalysisFetcher = useCallback(() => fetchComponentAnalysis(), []);
  const termTrendFetcher = useCallback(() => fetchTermTrend(), []);
  const departmentLectureMatrixFetcher = useCallback(() => fetchDepartmentLectureMatrix(), []);
  const studentRankingFetcher = useCallback(() => fetchStudentRanking(), []);
  const atRiskStudentsFetcher = useCallback(() => fetchAtRiskStudents(), []);

  return {
    scoreHistogram: useAsyncData(scoreHistogramFetcher),
    departmentAchievement: useAsyncData(departmentAchievementFetcher),
    lectureDifficulty: useAsyncData(lectureDifficultyFetcher),
    componentAnalysis: useAsyncData(componentAnalysisFetcher),
    termTrend: useAsyncData(termTrendFetcher),
    departmentLectureMatrix: useAsyncData(departmentLectureMatrixFetcher),
    studentRanking: useAsyncData(studentRankingFetcher),
    atRiskStudents: useAsyncData(atRiskStudentsFetcher),
  };
}
