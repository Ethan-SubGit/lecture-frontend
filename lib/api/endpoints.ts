import { apiRequest } from "./client";
import {
  AT_RISK_STUDENTS_LIMIT,
  STUDENT_RANKING_LIMIT,
} from "@/lib/constants";
import type {
  AtRiskStudentsResponseDto,
  ComponentAnalysisResponseDto,
  CreateDepartmentDto,
  CreateGradeScaleDto,
  CreateLectureDto,
  DashboardFilterQuery,
  DashboardSummaryDto,
  Department,
  DepartmentAchievementResponseDto,
  DepartmentLectureMatrixResponseDto,
  FindStudentScoresQuery,
  FindStudentScoresResponseDto,
  GradeScale,
  Lecture,
  LectureDifficultyResponseDto,
  LoginDto,
  LoginResponseDto,
  ScoreHistogramResponseDto,
  StudentRankingResponseDto,
  StudentScore,
  TermTrendResponseDto,
  UpdateDepartmentDto,
  UpdateGradeScaleDto,
  UpdateLectureDto,
  UploadExcelResponseDto,
  User,
} from "@/types/api";

/**
 * 백엔드 엔드포인트 호출 함수 모음 (spec.md 5.1 API 계약 요약 표 그대로).
 *
 * 화면 코드는 URL 문자열을 직접 다루지 않고 여기 함수만 호출한다.
 * 경로에 `/api` 접두어를 붙이지 않는다 (Swagger UI 주소와 혼동 금지).
 */

// ─────────────────────────────── 인증 / 사용자

/**
 * 로그인한다.
 *
 * @param dto loginId / password
 * @returns accessToken 과 축약 사용자 정보
 * @throws {ApiError} 401 이면 자격증명 오류. 이 호출의 401 은 전역 리다이렉트 대상이 아니므로
 *                    skipAuthRedirect 로 예외 처리한다 (spec.md 4.3 결정 3).
 */
export function login(dto: LoginDto): Promise<LoginResponseDto> {
  return apiRequest<LoginResponseDto>("/auth/login", {
    method: "POST",
    json: dto,
    skipAuthRedirect: true,
  });
}

/**
 * 현재 로그인 사용자 정보를 조회한다. 토큰 유효성 검증(2차 가드)에도 사용한다.
 * @returns User (name 은 non-null)
 */
export function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>("/users/me");
}

// ─────────────────────────────── 대시보드

/** 대시보드 요약 통계를 조회한다. */
export function fetchDashboardSummary(): Promise<DashboardSummaryDto> {
  return apiRequest<DashboardSummaryDto>("/dashboard/summary");
}

/* ─────────────────────── 대시보드 확장 분석 8종 (spec.md 5.1 / 5.4 / 5.5)
   여덟 함수 모두 공통 필터(term/departmentId/lectureId)를 **선택 인자**로 받는다.
   이번 라운드의 호출부는 아무것도 넘기지 않으며(전체 기준 집계),
   값이 undefined 이면 client 의 buildQueryString 이 파라미터 자체를 생략한다.
   → 다음 라운드에서 공통 필터 바를 얹어도 이 시그니처를 고칠 필요가 없다. */

/**
 * 점수 구간 히스토그램을 조회한다.
 * `bucketSize` 는 보내지 않는다 — 응답의 `bucketSize` 를 화면 문구에 그대로 쓰므로
 * 서버 기본값(10)이 바뀌어도 표시가 어긋나지 않는다.
 */
export function fetchScoreHistogram(
  filter: DashboardFilterQuery = {},
): Promise<ScoreHistogramResponseDto> {
  return apiRequest<ScoreHistogramResponseDto>("/dashboard/score-histogram", {
    query: { ...filter },
  });
}

/** 학과별 학업성취도(+ 학과 × 등급 교차표)를 조회한다. 공통 필터 외 파라미터가 없다. */
export function fetchDepartmentAchievement(
  filter: DashboardFilterQuery = {},
): Promise<DepartmentAchievementResponseDto> {
  return apiRequest<DepartmentAchievementResponseDto>(
    "/dashboard/department-achievement",
    { query: { ...filter } },
  );
}

/**
 * 강의별 난이도·성적편차를 조회한다.
 * `minStudentCount` 는 보내지 않는다(서버 기본 1) — 소수 인원 강의를 임의로 감추면
 * "왜 이 강의가 안 보이지"라는 설명 불가능한 누락이 생긴다 (spec.md 가정 27).
 */
export function fetchLectureDifficulty(
  filter: DashboardFilterQuery = {},
): Promise<LectureDifficultyResponseDto> {
  return apiRequest<LectureDifficultyResponseDto>("/dashboard/lecture-difficulty", {
    query: { ...filter },
  });
}

/** 평가항목별 분석(시험 vs 과제, 전반부 vs 후반부)을 조회한다. */
export function fetchComponentAnalysis(
  filter: DashboardFilterQuery = {},
): Promise<ComponentAnalysisResponseDto> {
  return apiRequest<ComponentAnalysisResponseDto>("/dashboard/component-analysis", {
    query: { ...filter },
  });
}

/**
 * 학기별 추이를 조회한다.
 * `breakdown` 은 보내지 않는다(서버 기본 none) → `departmentSeries` 는 항상 빈 배열이며
 * 화면도 학과별 시리즈 영역을 렌더하지 않는다 (spec.md 3.7 (5)).
 */
export function fetchTermTrend(
  filter: DashboardFilterQuery = {},
): Promise<TermTrendResponseDto> {
  return apiRequest<TermTrendResponseDto>("/dashboard/term-trend", {
    query: { ...filter },
  });
}

/** 학과 × 강의 교차표를 조회한다. 공통 필터 외 파라미터가 없다. */
export function fetchDepartmentLectureMatrix(
  filter: DashboardFilterQuery = {},
): Promise<DepartmentLectureMatrixResponseDto> {
  return apiRequest<DepartmentLectureMatrixResponseDto>(
    "/dashboard/department-lecture-matrix",
    { query: { ...filter } },
  );
}

/**
 * 학생 종합 성적 랭킹을 조회한다.
 * `limit` 은 서버 기본값과 같더라도 **항상 명시 전송**한다 (spec.md 5.5).
 */
export function fetchStudentRanking(
  filter: DashboardFilterQuery = {},
): Promise<StudentRankingResponseDto> {
  return apiRequest<StudentRankingResponseDto>("/dashboard/student-ranking", {
    query: { ...filter, limit: STUDENT_RANKING_LIMIT },
  });
}

/**
 * 학사경고 위험군 학생을 조회한다.
 * `limit` 만 명시 전송하고 판정 기준(averageBelow / failCountAtLeast)은 서버 기본값을 쓴다.
 * 화면 문구는 요청값이 아니라 **응답의 기준값**을 출력한다 (spec.md 5.5).
 */
export function fetchAtRiskStudents(
  filter: DashboardFilterQuery = {},
): Promise<AtRiskStudentsResponseDto> {
  return apiRequest<AtRiskStudentsResponseDto>("/dashboard/at-risk-students", {
    query: { ...filter, limit: AT_RISK_STUDENTS_LIMIT },
  });
}

// ─────────────────────────────── 강의(수강과목)

/**
 * 강의 전체 목록을 조회한다.
 * 이 API 에는 쿼리 파라미터가 없다. 검색·정렬·페이지네이션은 클라이언트가 처리한다.
 * @returns 봉투 없이 배열 그대로
 */
export function fetchLectures(): Promise<Lecture[]> {
  return apiRequest<Lecture[]>("/lectures");
}

/** 강의 단건을 조회한다. 없으면 404. */
export function fetchLecture(id: string): Promise<Lecture> {
  return apiRequest<Lecture>(`/lectures/${id}`);
}

/** 강의를 생성한다. code 는 서버가 자동 생성하므로 보내지 않는다. 중복이면 409. */
export function createLecture(dto: CreateLectureDto): Promise<Lecture> {
  return apiRequest<Lecture>("/lectures", { method: "POST", json: dto });
}

/** 강의를 부분 수정한다. 변경된 필드만 담아 보낸다. */
export function updateLecture(
  id: string,
  dto: UpdateLectureDto,
): Promise<Lecture> {
  return apiRequest<Lecture>(`/lectures/${id}`, { method: "PATCH", json: dto });
}

/** 강의를 삭제(소프트 삭제)한다. 성공 시 204 본문 없음. */
export function deleteLecture(id: string): Promise<void> {
  return apiRequest<void>(`/lectures/${id}`, { method: "DELETE" });
}

// ─────────────────────────────── 학과

/** 학과 전체 목록을 조회한다 (쿼리 파라미터 없음, 배열 직접 반환). */
export function fetchDepartments(): Promise<Department[]> {
  return apiRequest<Department[]>("/departments");
}

/** 학과 단건을 조회한다. */
export function fetchDepartment(id: string): Promise<Department> {
  return apiRequest<Department>(`/departments/${id}`);
}

/** 학과를 생성한다. 코드 중복이면 409. */
export function createDepartment(
  dto: CreateDepartmentDto,
): Promise<Department> {
  return apiRequest<Department>("/departments", { method: "POST", json: dto });
}

/** 학과를 부분 수정한다. */
export function updateDepartment(
  id: string,
  dto: UpdateDepartmentDto,
): Promise<Department> {
  return apiRequest<Department>(`/departments/${id}`, {
    method: "PATCH",
    json: dto,
  });
}

/** 학과를 삭제한다. 성공 시 204. */
export function deleteDepartment(id: string): Promise<void> {
  return apiRequest<void>(`/departments/${id}`, { method: "DELETE" });
}

// ─────────────────────────────── 학점환산기준

/** 학점환산기준 전체 목록을 조회한다 (배열 직접 반환). */
export function fetchGradeScales(): Promise<GradeScale[]> {
  return apiRequest<GradeScale[]>("/grade-scales");
}

/** 학점환산기준 단건을 조회한다. */
export function fetchGradeScale(id: string): Promise<GradeScale> {
  return apiRequest<GradeScale>(`/grade-scales/${id}`);
}

/**
 * 점수를 등급으로 변환한다.
 * @param score 0~100 사이의 백분위 점수
 * @returns 해당 구간의 GradeScale. 구간이 없으면 404
 */
export function convertScoreToGrade(score: number): Promise<GradeScale> {
  return apiRequest<GradeScale>("/grade-scales/convert", { query: { score } });
}

/** 학점환산기준을 생성한다. min>max 면 400, 등급 중복이면 409. */
export function createGradeScale(
  dto: CreateGradeScaleDto,
): Promise<GradeScale> {
  return apiRequest<GradeScale>("/grade-scales", { method: "POST", json: dto });
}

/** 학점환산기준을 부분 수정한다. */
export function updateGradeScale(
  id: string,
  dto: UpdateGradeScaleDto,
): Promise<GradeScale> {
  return apiRequest<GradeScale>(`/grade-scales/${id}`, {
    method: "PATCH",
    json: dto,
  });
}

/** 학점환산기준을 삭제한다. 성공 시 204. */
export function deleteGradeScale(id: string): Promise<void> {
  return apiRequest<void>(`/grade-scales/${id}`, { method: "DELETE" });
}

// ─────────────────────────────── 성적

/**
 * 성적 목록을 조회한다. 이 엔드포인트만 서버 페이지네이션 봉투를 반환한다.
 * 빈 문자열 파라미터는 client 의 buildQueryString 이 자동으로 제외한다.
 *
 * @param query page/pageSize/검색어/정렬 조건
 */
export function fetchStudentScores(
  query: FindStudentScoresQuery,
): Promise<FindStudentScoresResponseDto> {
  return apiRequest<FindStudentScoresResponseDto>("/student-scores", { query });
}

/** 성적 단건 상세를 조회한다. 없으면 404. */
export function fetchStudentScore(id: string): Promise<StudentScore> {
  return apiRequest<StudentScore>(`/student-scores/${id}`);
}

/**
 * 성적 엑셀을 업로드한다.
 *
 * multipart/form-data 로 file / lectureName / term 을 보낸다.
 * lectureName 은 강의 id 가 아니라 **강의명**이다 (spec.md 5.2).
 *
 * @param file 업로드할 .xlsx / .xls 파일
 * @param lectureName 성적을 등록할 강의명
 * @param term 개설학기 코드. 생략하면 서버 기본값(2610)
 * @returns 등록 건수와 실패 행 목록
 */
export function uploadStudentScores(
  file: File,
  lectureName: string,
  term?: string,
): Promise<UploadExcelResponseDto> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("lectureName", lectureName);
  if (term) formData.append("term", term);

  return apiRequest<UploadExcelResponseDto>("/student-scores/upload", {
    method: "POST",
    formData,
  });
}
