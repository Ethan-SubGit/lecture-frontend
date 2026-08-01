import { EMPTY_VALUE_PLACEHOLDER, formatNumber } from "@/lib/format";

/** `null` 값의 기본 설명. 표준편차·중앙값이 계산 불가인 이유는 항상 이것이다. */
const DEFAULT_NULL_HINT = "집계 대상이 1건 이하여서 계산할 수 없습니다";

interface StatValueProps {
  /** 지표 값. null 이면 "계산 불가" 표시로 바뀐다 */
  value: number | null;
  /** 소수 자릿수 */
  digits?: number;
  /** 값 뒤에 붙는 단위 (점 / % 등) */
  unit?: string;
  /** null 일 때의 보조 설명. 툴팁과 sr-only 문구에 함께 쓰인다 */
  nullHint?: string;
}

/**
 * nullable 지표 값 (design.md 4.21.3).
 *
 * `stddevTotalScore` / `medianTotalScore` / `medianPercentage` 의 `null` 은
 * **`0` 이 아니라 "계산 불가"** 다(spec.md 가정 24). 0으로 표시하면 "편차가 전혀 없는 균일한 학과"라는
 * 정반대 의미가 되므로 절대 같게 보이면 안 된다.
 *
 * 구분 단서 4중: 글리프(`—`) + `text-muted` + `sr-only` "계산 불가" + 표 각주.
 * (각주는 이 컴포넌트가 아니라 `DashboardSection.footnotes` 가 담당한다 —
 *  `title` 툴팁은 터치 기기에서 열 수 없어 유일한 경로가 되면 안 되기 때문이다.)
 *
 * @param value 지표 값 또는 null
 * @param digits 소수 자릿수
 * @param unit 단위
 * @param nullHint null 일 때의 설명 문구
 * @returns 값 또는 계산 불가 표시
 */
export function StatValue({
  value,
  digits = 1,
  unit,
  nullHint = DEFAULT_NULL_HINT,
}: StatValueProps) {
  if (value === null) {
    return (
      <span className="text-muted" title={nullHint}>
        <span aria-hidden="true">{EMPTY_VALUE_PLACEHOLDER}</span>
        <span className="sr-only">계산 불가 — {nullHint}</span>
      </span>
    );
  }

  return (
    <span className="tabular-nums text-primary">
      {formatNumber(value, digits)}
      {unit ? <span className="text-caption text-muted">{unit}</span> : null}
    </span>
  );
}
