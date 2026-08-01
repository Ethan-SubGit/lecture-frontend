/**
 * 백엔드 OpenAPI(REQ/openapi.json) 스키마를 그대로 옮긴 도메인 타입 정의.
 *
 * 규칙 (spec.md 5절):
 * - `?`(옵셔널)가 없는 필드는 OpenAPI 의 required 배열에 포함된 필드다.
 * - `| null` 은 nullable: true 인 필드다.
 * - 임의로 옵셔널을 추가하지 않는다. 이 파일이 도메인 타입의 유일한 정의처다.
 */

// ─────────────────────────────── 인증 / 사용자

/** POST /auth/login 요청 본문. 두 필드 모두 필수. */
export interface LoginDto {
  loginId: string; // 예: "user001"
  password: string; // 예: "password123"
}

/** 로그인 응답에 동봉되는 축약 사용자. name 만 null 가능. */
export interface LoginUserDto {
  id: string; // UUID
  loginId: string;
  email: string;
  name: string | null; // 표시명. null 이면 loginId 로 대체해 표기한다
}

/** POST /auth/login 200 응답. */
export interface LoginResponseDto {
  accessToken: string; // 이후 요청의 Authorization: Bearer 값
  user: LoginUserDto;
}

/** GET /users/me 200 응답. 비밀번호는 응답에 포함되지 않는다. */
export interface User {
  id: string;
  loginId: string;
  email: string;
  name: string; // 이 스키마에서는 non-null (LoginUserDto 와 다름)
  employeeNo: string; // 사번
  lastLoginAt: string | null; // ISO date-time. 최초 로그인 전이면 null
  createdAt: string; // ISO date-time
  updatedAt: string; // ISO date-time
}

// ─────────────────────────────── 학과

export interface Department {
  id: string;
  code: string; // 학과 코드. 중복 불가. 예: "CSE"
  name: string; // 예: "컴퓨터공학과"
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null; // 소프트 삭제 시각. 미삭제면 null
}

/** POST /departments — 두 필드 모두 필수. */
export interface CreateDepartmentDto {
  code: string;
  name: string;
}

/** PATCH /departments/{id} — 모든 필드 선택(부분 수정). */
export interface UpdateDepartmentDto {
  code?: string;
  name?: string;
}

// ─────────────────────────────── 강의(수강과목)

export interface Lecture {
  id: string;
  code: string; // 서버가 "LEC-0001" 형식으로 자동 생성. 클라이언트가 보내지 않는다
  name: string; // 강의명
  term: string; // 개설학기 코드. YY10=1학기 / YY11=계절 / YY20=2학기 / YY21=계절
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** POST /lectures — name 만 필수. term 미입력 시 서버가 "2610" 을 적용. */
export interface CreateLectureDto {
  name: string;
  term?: string;
}

/** PATCH /lectures/{id} — 모든 필드 선택. */
export interface UpdateLectureDto {
  name?: string;
  term?: string;
}

// ─────────────────────────────── 학점환산기준

export interface GradeScale {
  id: string;
  grade: string; // 등급 문자. 중복 불가. 예: "A+"
  gpa: number; // 평점 (4.5 만점). 예: 4.5
  minScore: number; // 백분위 최소값 0~100
  maxScore: number; // 백분위 최대값 0~100
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** POST /grade-scales — 네 필드 모두 필수. minScore <= maxScore 여야 한다(위반 시 400). */
export interface CreateGradeScaleDto {
  grade: string;
  gpa: number;
  minScore: number;
  maxScore: number;
}

/** PATCH /grade-scales/{id} — 모든 필드 선택. */
export interface UpdateGradeScaleDto {
  grade?: string;
  gpa?: number;
  minScore?: number;
  maxScore?: number;
}

// ─────────────────────────────── 성적

/**
 * GET /student-scores, GET /student-scores/{id} 응답 항목.
 * lecture 와 department 는 id 가 아니라 객체 전체가 임베드되어 온다.
 */
export interface StudentScore {
  id: string;
  studentNumber: string; // 학번
  studentName: string; // 학생 이름
  lecture: Lecture; // 임베드된 강의 객체
  department: Department; // 임베드된 학과 객체
  midtermExamScore: number; // 중간고사 점수
  midtermAssignmentScore: number; // 중간과제 점수
  finalExamScore: number; // 기말고사 점수
  finalAssignmentScore: number; // 기말과제 점수
  totalScore: number; // 합계점수. 서버 계산값 (클라이언트가 다시 계산하지 않는다)
  grade: string; // 등급. 서버 계산값
  createdAt: string;
  updatedAt: string;
}

/** GET /student-scores 200 응답 봉투. */
export interface FindStudentScoresResponseDto {
  data: StudentScore[];
  total: number; // 검색 조건에 해당하는 전체 건수
  page: number; // 현재 페이지 번호
  totalPages: number; // 전체 페이지 수
}

/** 업로드 시 형식 오류로 건너뛴 행. */
export interface FailedRowDto {
  row: number; // 실패한 엑셀 행 번호 (1부터 시작)
  reason: string; // 예: "학번, 이름, 학과는 모두 필수입니다."
}

/** POST /student-scores/upload 201 응답. */
export interface UploadExcelResponseDto {
  createdCount: number; // 새로 등록된 성적 건수
  failedRows: FailedRowDto[]; // 빈 배열이면 전량 성공
}

// ─────────────────────────────── 대시보드

export interface GradeDistributionItemDto {
  grade: string; // 예: "A+"
  count: number; // 해당 등급 인원수
  percentage: number; // 전체 대비 비율(%). 예: 24.5
}

export interface DepartmentStatItemDto {
  departmentName: string;
  studentCount: number;
  averageTotalScore: number;
}

export interface LectureStatItemDto {
  lectureName: string;
  term: string;
  studentCount: number;
  averageTotalScore: number;
}

export interface TermStatItemDto {
  term: string;
  studentCount: number;
  averageTotalScore: number;
}

/** GET /dashboard/summary 200 응답. 모든 필드 required. */
export interface DashboardSummaryDto {
  totalDepartments: number; // 등록된 학과 수
  totalLectures: number; // 등록된 강의 수
  totalStudentScores: number; // 등록된 성적 건수
  averageTotalScore: number; // 전체 평균 합계점수
  averageGpa: number; // 전체 평균 평점 (4.5 만점)
  gradeDistribution: GradeDistributionItemDto[];
  departmentStats: DepartmentStatItemDto[];
  lectureStats: LectureStatItemDto[];
  termStats: TermStatItemDto[];
}

// ─────────────────────────────── 대시보드 확장 분석 8종 (spec.md 5.0)

/**
 * 8개 확장 분석 엔드포인트가 공통으로 받는 선택 필터. 셋 다 AND 로 결합된다.
 * 존재하지 않는 id 를 줘도 404 가 아니라 빈 결과가 온다.
 *
 * 이번 라운드(2026-08-01)에는 화면에서 이 값을 채우지 않는다 (spec.md 2.1).
 * 그래도 **처음부터 선택 인자로 받는 시그니처**를 유지해, 다음 라운드에서 공통 필터 바를
 * 얹을 때 호출 함수의 시그니처를 고치지 않아도 되게 한다.
 *
 * ⚠️ spec.md 는 interface 로 적었지만 여기서는 `FindStudentScoresQuery` 와 같은 이유로
 * **type 별칭**으로 선언한다 — TypeScript 는 type 별칭에만 암묵적 인덱스 시그니처를 주므로
 * fetch 래퍼의 Record 타입 쿼리 인자에 타입 단언 없이 그대로 넘길 수 있다. 필드는 동일하다.
 */
export type DashboardFilterQuery = {
  term?: string; // 개설학기 코드 (예: "2610")
  departmentId?: string; // 학과 UUID
  lectureId?: string; // 강의 UUID
};

// (1) GET /dashboard/score-histogram

export interface ScoreHistogramBucketDto {
  bucketIndex: number; // 구간 번호 (0부터 시작)
  label: string; // 구간 표시용 라벨. 예: "90 ~ 100"
  minScore: number; // 구간 하한 (포함)
  maxScore: number; // 구간 상한. 마지막 구간의 상한은 만점으로 잘린다
  count: number; // 이 구간의 인원수. 데이터가 없는 구간도 0으로 온다(항목이 생략되지 않는다)
  percentage: number; // 전체 대비 비율(%)
}

export interface ScoreHistogramResponseDto {
  totalScoreMax: number; // 구간 생성의 기준이 된 합계점수 만점
  bucketSize: number; // 실제 적용된 구간 폭 (요청값이 아니라 서버 확정값)
  totalCount: number; // 집계 대상 성적 건수
  buckets: ScoreHistogramBucketDto[]; // bucketIndex 오름차순. 빈 구간 포함
}

// (2) GET /dashboard/department-achievement

/** 학과 × 등급 교차표의 한 칸. 해당 등급 인원이 0명이어도 항목이 생략되지 않는다. */
export interface DepartmentGradeCountItemDto {
  grade: string; // 등급 문자. 예: "A+"
  gpa: number; // 해당 등급의 평점
  count: number; // 인원수 (0 가능)
  percentage: number; // 학과 내 비율(%)
}

export interface DepartmentAchievementItemDto {
  departmentId: string;
  departmentName: string;
  studentCount: number; // 집계 대상 성적 건수
  averageTotalScore: number; // 평균 합계점수
  averagePercentage: number; // 평균 성취도(만점 대비 %)
  medianTotalScore: number | null; // 중앙값. 집계 대상이 없으면 null
  medianPercentage: number | null; // 중앙값의 백분율. 위와 동일 조건에서 null
  stddevTotalScore: number | null; // 표본표준편차. 대상이 1건 이하면 계산 불가 → null (0이 아니다)
  minTotalScore: number;
  maxTotalScore: number;
  averageGpa: number; // 평균 평점. 학점환산표에 없는 등급은 계산에서 제외된다
  aGradeCount: number; // A등급(평점 4.0 이상) 인원수
  aGradeRate: number; // A등급 비율(%)
  fGradeCount: number; // F등급(평점 0) 인원수
  fGradeRate: number; // F등급 비율(%)
  gradeCounts: DepartmentGradeCountItemDto[]; // 응답 최상위 grades 축과 개수·순서가 동일
}

export interface DepartmentAchievementResponseDto {
  totalScoreMax: number; // 백분율 환산에 쓴 합계점수 만점
  grades: string[]; // 교차표의 등급 축. 평점 내림차순
  items: DepartmentAchievementItemDto[]; // 평균 합계점수 내림차순. 성적 0건 학과는 미포함
}

// (3) GET /dashboard/lecture-difficulty

/** 난이도 이상치 판정값. 전체 평균과 10%p 이상 차이날 때만 값이 있다. */
export type DifficultyOutlier = "EASY" | "HARD";

export interface LectureDifficultyItemDto {
  lectureId: string;
  lectureName: string;
  term: string;
  studentCount: number;
  averageTotalScore: number;
  averagePercentage: number; // 평균 성취도(만점 대비 %)
  stddevTotalScore: number | null; // 수강생 1명 이하면 계산 불가 → null
  averageGpa: number;
  aGradeRate: number; // A등급(평점 4.0 이상) 비율(%)
  fGradeRate: number; // F등급(평점 0) 비율(%)
  deviationFromOverall: number; // 전체 가중평균 대비 편차(합계점수). 양수면 상대적으로 쉬운 강의
  deviationPercentagePoint: number; // 위 편차를 만점 대비 %p 로 환산한 값
  gradeInflation: boolean; // A등급 비율 50% 이상이면 true (학점 인플레이션 의심)
  difficultyOutlier: DifficultyOutlier | null; // 차이가 10%p 미만이면 null
}

export interface LectureDifficultyResponseDto {
  totalScoreMax: number;
  overallAverageTotalScore: number; // 필터 집합 전체의 **가중평균**(강의 평균의 단순 평균이 아님)
  overallAveragePercentage: number;
  items: LectureDifficultyItemDto[]; // 평균 합계점수 내림차순(쉬운 강의부터)
}

// (4) GET /dashboard/component-analysis

/** 평가항목별 집계. 항목별 만점 정보가 없어 개별 항목의 백분율은 제공되지 않는다. */
export interface ComponentAveragesDto {
  studentCount: number; // 집계 대상 성적 건수
  midtermExamAverage: number; // 중간고사 평균
  midtermAssignmentAverage: number; // 중간과제 평균
  finalExamAverage: number; // 기말고사 평균
  finalAssignmentAverage: number; // 기말과제 평균
  examAverage: number; // 시험 평균 (중간고사 + 기말고사)
  assignmentAverage: number; // 과제 평균 (중간과제 + 기말과제)
  examVsAssignmentGap: number; // 시험 − 과제. 양수면 시험에서 더 득점
  midtermHalfAverage: number; // 전반부 평균 (중간고사 + 중간과제)
  finalHalfAverage: number; // 후반부 평균 (기말고사 + 기말과제)
  improvement: number; // 후반부 − 전반부. 양수면 학기 후반에 성취 상승
  improvedStudentCount: number; // 후반부 점수가 전반부보다 높아진 학생 수
  improvedStudentRate: number; // 향상 학생 비율(%)
}

/** 강의별 평가항목 집계 = ComponentAveragesDto + 강의 식별 3필드. */
export interface LectureComponentAveragesDto extends ComponentAveragesDto {
  lectureId: string;
  lectureName: string;
  term: string;
}

export interface ComponentAnalysisResponseDto {
  totalScoreMax: number; // 합계점수 만점 (시험/과제/전후반은 그 부분합)
  overall: ComponentAveragesDto; // 필터 전체 기준 집계
  byLecture: LectureComponentAveragesDto[]; // 학기 → 강의명 순 정렬
}

// (5) GET /dashboard/term-trend

export interface TermTrendPointDto {
  term: string; // 개설학기 코드 (YYnn)
  studentCount: number; // 해당 학기의 성적 건수
  averageTotalScore: number;
  averagePercentage: number; // 평균 성취도(만점 대비 %)
  averageGpa: number;
}

export interface DepartmentTermSeriesDto {
  departmentId: string;
  departmentName: string;
  points: TermTrendPointDto[]; // 학기 오름차순. 성적이 없는 학기는 항목 자체가 없다
}

export interface TermTrendResponseDto {
  totalScoreMax: number;
  points: TermTrendPointDto[]; // 전체 기준 시계열 (학기 오름차순)
  departmentSeries: DepartmentTermSeriesDto[]; // breakdown=department 일 때만 채워짐
}

// (6) GET /dashboard/department-lecture-matrix

export interface DepartmentLectureCellDto {
  departmentId: string;
  departmentName: string;
  studentCount: number; // 이 강의를 수강한 해당 학과 인원수
  averageTotalScore: number;
  averagePercentage: number;
  deviationFromLectureAverage: number; // 해당 강의 전체 평균 대비 편차(난이도 영향이 상쇄된 값)
}

export interface DepartmentLectureMatrixRowDto {
  lectureId: string;
  lectureName: string;
  term: string;
  studentCount: number; // 강의 전체 수강 인원수
  averageTotalScore: number; // 강의 전체 평균 (셀 편차의 기준선)
  averagePercentage: number;
  cells: DepartmentLectureCellDto[]; // 평균 합계점수 내림차순
}

export interface DepartmentLectureMatrixResponseDto {
  totalScoreMax: number;
  rows: DepartmentLectureMatrixRowDto[]; // 학기 → 강의명 순 정렬
}

// (7) GET /dashboard/student-ranking

export interface StudentRankingItemDto {
  rank: number; // SQL RANK() 기준. 동점자는 같은 순위, 다음 순위는 건너뛴다
  studentNumber: string;
  studentName: string; // 성적 레코드에 기록된 이름의 최빈값
  departmentName: string; // 성적 레코드 학과의 최빈값. 학적상 소속을 보증하지 않는다
  lectureCount: number; // 집계에 포함된 수강 강의 수
  averageGpa: number; // 종합 평균 평점
  averageTotalScore: number;
  averagePercentage: number;
}

export interface StudentRankingResponseDto {
  totalScoreMax: number;
  items: StudentRankingItemDto[]; // 평균 평점 내림차순 (동점이면 평균 합계점수 내림차순)
}

// (8) GET /dashboard/at-risk-students

export interface AtRiskStudentItemDto {
  studentNumber: string;
  studentName: string; // 성적 레코드 이름의 최빈값
  departmentName: string; // 성적 레코드 학과의 최빈값
  lectureCount: number; // 집계에 포함된 수강 강의 수
  failCount: number; // F등급(평점 0) 과목 수
  averageGpa: number;
  averageTotalScore: number;
  averagePercentage: number; // 평균 성취도(만점 대비 %)
  riskReasons: string[]; // 예: ["F학점 2개", "평균 성취도 60% 미만"]
}

export interface AtRiskStudentsResponseDto {
  totalScoreMax: number;
  averageBelow: number; // 실제 적용된 평균 성취도 기준(%) — 화면 문구에 이 값을 쓴다
  failCountAtLeast: number; // 실제 적용된 F학점 개수 기준 — 화면 문구에 이 값을 쓴다
  items: AtRiskStudentItemDto[]; // F학점 수 내림차순, 동수면 평균 합계점수 오름차순(위험한 순)
}

// ─────────────────────────────── 성적 조회 쿼리 (spec.md 5.3)

/** GET /student-scores 의 정렬 가능 필드. 이 목록 밖의 컬럼은 정렬 UI 를 제공하지 않는다. */
export type StudentScoreSortBy =
  | "studentNumber"
  | "studentName"
  | "departmentName"
  | "totalScore"
  | "grade";

/** 정렬 방향. 기본값은 ASC. */
export type SortOrder = "ASC" | "DESC";

/**
 * GET /student-scores 쿼리 파라미터. 전부 optional 이며 빈 값은 전송하지 않는다.
 *
 * interface 가 아니라 type 별칭으로 선언한다 — TypeScript 는 type 별칭에만
 * 암묵적 인덱스 시그니처를 부여하므로, fetch 래퍼의 Record 타입 쿼리 인자에
 * 타입 단언 없이 그대로 넘길 수 있다.
 */
export type FindStudentScoresQuery = {
  page?: number;
  pageSize?: number;
  lectureName?: string;
  studentName?: string;
  studentNumber?: string;
  departmentName?: string;
  sortBy?: StudentScoreSortBy;
  order?: SortOrder;
};
