import { BookIcon, BuildingIcon, DocumentCheckIcon, GridIcon } from "@/components/ui/icons";
import { DataTable, type Column } from "@/components/data/DataTable";
import { EMPTY_VALUE_PLACEHOLDER, formatCount, formatNumber, formatTerm } from "@/lib/format";
import type { AsyncDataState } from "@/hooks/useAsyncData";
import type {
  DepartmentLectureMatrixResponseDto,
  DepartmentLectureMatrixRowDto,
} from "@/types/api";
import { DashboardSection, deriveSectionState } from "./DashboardSection";
import { DeviationValue } from "./DeviationValue";
import { SectionStatStrip, type SectionStatItem } from "./SectionStatStrip";
import { TableSectionSkeleton } from "./SectionSkeletons";

/**
 * ⑥ 학과 × 강의 교차표 섹션 (design.md 4.25).
 *
 * ④와 ⑤를 곱한 축이며 **편차 열이 이 섹션의 존재 이유**다.
 * 편차는 강의 전체 평균 대비 값이라 강의 난이도의 영향이 상쇄되어 있고,
 * 그래서 서로 다른 강의의 칸끼리 비교해도 된다 — 이 문장이 설명문에서 빠지면
 * 편차 컬럼은 그냥 또 하나의 숫자로 읽힌다(spec.md 3.7 (6)).
 */

export const DEPARTMENT_LECTURE_MATRIX_SECTION_ID = "department-lecture-matrix";

const SKELETON_ROWS = 6;

/** 셀 편차의 스크린리더 문구. 어느 기준선 대비인지 말해야 숫자가 의미를 갖는다. */
const CELL_DEVIATION_SR_LABEL = {
  up: "강의 평균보다 높음",
  down: "강의 평균보다 낮음",
  flat: "강의 평균과 같음",
};

/** 표의 열 축이 되는 학과. 응답에 "학과 축" 필드가 없어 셀에서 유도한다. */
interface MatrixDepartment {
  id: string;
  name: string;
}

/**
 * 열 축(학과 목록)을 `rows[].cells[]` 에서 유도한다 (design.md 4.25).
 *
 * **학과명 가나다순으로 고정**한다 — 서버가 각 행의 cells 를 평균 내림차순으로 주므로
 * "처음 등장한 순서"를 쓰면 첫 행의 성적에 따라 열 순서가 매번 흔들려
 * 사용자가 표를 읽는 법을 익힐 수 없다. (백엔드가 최상위 학과 축을 주면 그 순서를 따르는 것이 옳다.)
 *
 * @param rows 강의별 행
 * @returns 학과 열 축
 */
function buildDepartmentAxis(rows: DepartmentLectureMatrixRowDto[]): MatrixDepartment[] {
  const departments = new Map<string, MatrixDepartment>();

  for (const row of rows) {
    for (const cell of row.cells) {
      if (!departments.has(cell.departmentId)) {
        departments.set(cell.departmentId, {
          id: cell.departmentId,
          name: cell.departmentName,
        });
      }
    }
  }

  return Array.from(departments.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/**
 * 교차표 컬럼을 학과 축에서 만든다.
 *
 * 첫 컬럼(강의)은 `stickyFirstColumn` 대상이라 `DataTable` 이 `<th scope="row">` 로 렌더한다.
 * 데이터 셀은 인원 / 평균 / 강의 평균 대비 편차 3줄 구조이며, 편차는 **부호 + 방향 글리프 +
 * 숫자 + 색** 4중 단서를 갖는다(셀 배경 히트맵은 도입하지 않는다 — 색만으로 크기를 전달하게 된다).
 *
 * @param departments 학과 열 축
 * @returns 교차표 컬럼 정의
 */
function buildMatrixColumns(
  departments: MatrixDepartment[],
): Column<DepartmentLectureMatrixRowDto>[] {
  return [
    {
      key: "lecture",
      header: "강의",
      mobilePriority: "title",
      cell: (row) => (
        <div className="min-w-matrix-head">
          <p className="text-body-sm font-medium text-primary">{row.lectureName}</p>
          <p className="text-caption text-muted">
            {formatTerm(row.term)} · {formatCount(row.studentCount)}명 · 평균{" "}
            {formatNumber(row.averageTotalScore, 1)}점
          </p>
        </div>
      ),
    },
    ...departments.map<Column<DepartmentLectureMatrixRowDto>>((department) => ({
      key: department.id,
      header: department.name,
      align: "right",
      mobilePriority: "full",
      cell: (row) => {
        const cell = row.cells.find((item) => item.departmentId === department.id);

        // 미수강 칸의 `—` 는 4.21.3 의 "계산 불가"와 **다른 의미**이므로 sr-only 문구를 구분한다.
        if (!cell) {
          return (
            <span className="min-w-matrix-cell text-muted">
              <span aria-hidden="true">{EMPTY_VALUE_PLACEHOLDER}</span>
              <span className="sr-only">수강 없음</span>
            </span>
          );
        }

        return (
          <div className="min-w-matrix-cell text-right leading-tight">
            <p className="text-body-sm font-medium tabular-nums text-primary">
              {formatNumber(cell.averageTotalScore, 1)}
            </p>
            <p className="text-caption tabular-nums text-muted">
              {formatCount(cell.studentCount)}명
            </p>
            <p>
              <DeviationValue
                value={cell.deviationFromLectureAverage}
                tone="evaluative"
                unit="점"
                srLabel={CELL_DEVIATION_SR_LABEL}
              />
            </p>
          </div>
        );
      },
    })),
  ];
}

/**
 * 스트립 칩 3개를 만든다. 전부 응답 배열의 단순 집계(개수·합)다.
 *
 * @param rows 렌더 대상 행
 * @param departmentCount 학과 열 수
 * @returns 스트립 칩 목록
 */
function buildStatItems(
  rows: DepartmentLectureMatrixRowDto[],
  departmentCount: number,
): SectionStatItem[] {
  const totalScoreCount = rows.reduce((sum, row) => sum + row.studentCount, 0);

  return [
    {
      key: "lectures",
      icon: <BookIcon className="h-4 w-4" />,
      label: "집계 강의",
      value: `${formatCount(rows.length)}개`,
      tone: "neutral",
    },
    {
      key: "departments",
      icon: <BuildingIcon className="h-4 w-4" />,
      label: "비교 학과",
      value: `${formatCount(departmentCount)}개`,
      tone: "accent",
    },
    {
      key: "scores",
      icon: <DocumentCheckIcon className="h-4 w-4" />,
      label: "집계 성적",
      value: `${formatCount(totalScoreCount)}건`,
      tone: "neutral",
    },
  ];
}

interface DepartmentLectureMatrixSectionProps {
  query: AsyncDataState<DepartmentLectureMatrixResponseDto>;
}

/**
 * 학과 × 강의 교차표 섹션.
 *
 * `cells` 가 비어 있는 행은 렌더하지 않는다(spec.md 3.7 (6)) — 비교할 학과가 없는 행이다.
 *
 * @param query 이 섹션 전용 조회 상태
 * @returns 섹션 카드
 */
export function DepartmentLectureMatrixSection({
  query,
}: DepartmentLectureMatrixSectionProps) {
  const state = deriveSectionState(
    query,
    (data) => data.rows.filter((row) => row.cells.length > 0).length === 0,
  );

  const rows = (query.data?.rows ?? []).filter((row) => row.cells.length > 0);
  const departments = buildDepartmentAxis(rows);

  return (
    <DashboardSection
      id={DEPARTMENT_LECTURE_MATRIX_SECTION_ID}
      title="학과 × 강의 교차표"
      description={
        <>
          같은 강의를 들은 학과끼리 비교합니다. 편차는 강의 난이도의 영향을 걷어낸 값이라{" "}
          <b className="font-semibold text-secondary">
            서로 다른 강의의 칸끼리 비교해도 됩니다.
          </b>
        </>
      }
      icon={<GridIcon />}
      state={state}
      onRetry={query.refetch}
      emptyTitle="집계할 강의가 없습니다."
      emptyIcon={<GridIcon className="h-6 w-6 md:h-8 md:w-8" />}
      skeleton={<TableSectionSkeleton rows={SKELETON_ROWS} />}
      footnotes={[
        "편차는 그 강의의 전체 평균 대비 값입니다. 강의 난이도의 영향이 상쇄되어 있어 다른 강의의 칸과 비교해도 됩니다.",
        "— 는 해당 학과 학생이 그 강의를 수강하지 않았다는 뜻입니다.",
        "학과 열은 학과명 가나다순입니다.",
      ]}
    >
      {rows.length > 0 ? (
        <>
          <SectionStatStrip items={buildStatItems(rows, departments.length)} columns={3} />

          <div className="mt-4">
            {/* 표 최소폭은 낮게 두고(min-w-table-md) 셀의 min-w-matrix-cell 이 실질 폭을 결정한다.
                열 수 = 학과 수라 데스크탑에서도 스크롤이 남을 수 있는데 **정상 동작**이며,
                가로 스크롤은 .scroll-x 안에서만 일어난다(페이지 본문은 밀리지 않는다). */}
            <DataTable
              caption="학과별 강의 성취도 교차표. 행은 강의, 열은 학과이며 각 칸은 인원수·평균·강의 평균 대비 편차입니다."
              columns={buildMatrixColumns(departments)}
              rows={rows}
              getRowKey={(row) => row.lectureId}
              tableMinWidth="table-md"
              surface="plain"
              stickyFirstColumn
              showScrollHint
            />
          </div>
        </>
      ) : null}
    </DashboardSection>
  );
}
