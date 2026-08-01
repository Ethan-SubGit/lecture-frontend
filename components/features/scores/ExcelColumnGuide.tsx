import { Badge } from "@/components/ui/Badge";

/**
 * 엑셀 컬럼 순서 (고정). 서버 파서가 이 순서를 전제하므로 화면에 그대로 노출한다.
 * 합계점수와 등급은 서버 계산값이라 파일에 넣지 않는다.
 */
const EXCEL_COLUMNS = [
  "학번",
  "이름",
  "학과",
  "중간고사점수",
  "중간과제점수",
  "기말고사점수",
  "기말과제점수",
];

/**
 * 엑셀 컬럼 순서 안내 (design.md 4.17).
 *
 * 가로로 나열하면 좁은 화면에서 스크롤이 생기므로 항상 세로 번호 목록으로 표시한다.
 *
 * @returns 컬럼 안내 박스
 */
export function ExcelColumnGuide() {
  return (
    <div className="rounded-lg border border-subtle bg-surface-sunken p-4">
      <p className="text-caption font-semibold text-secondary">
        엑셀 컬럼 순서 (고정)
      </p>

      <ol className="mt-3 space-y-1.5 text-body text-primary">
        {EXCEL_COLUMNS.map((column, index) => (
          <li key={column} className="flex items-center gap-2">
            <Badge tone="neutral">{index + 1}</Badge>
            {column}
          </li>
        ))}
      </ol>

      <p className="mt-3 text-caption text-muted">
        합계점수와 등급은 서버가 자동 계산합니다.
      </p>
    </div>
  );
}
