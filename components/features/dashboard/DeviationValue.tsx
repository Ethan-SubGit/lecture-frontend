import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

/**
 * 부호 있는 편차 값 (design.md 4.21.2).
 *
 * 확장 분석의 ± 값 5곳(강의 난이도 편차 / 학과×강의 셀 편차 / 시험−과제 격차 /
 * 전반→후반 향상도 / 직전 학기 대비)이 전부 이 컴포넌트 하나로 표현된다.
 */

/**
 * 음수 부호는 ASCII 하이픈이 아니라 U+2212 MINUS SIGN 을 쓴다.
 * `tabular-nums` 에서 하이픈은 폭이 좁아 세로 정렬이 어긋나기 때문이다.
 */
const MINUS_SIGN = "−";
const PLUS_SIGN = "+";

/** 방향 글리프. 색맹·흑백 인쇄에서도 방향이 남는 1차 단서다. */
const GLYPH = { up: "▲", down: "▼", flat: "=" } as const;

/**
 * 톤별 색 (design.md 4.21.2 배정 표).
 *
 * - neutral    : 양·음·0 전부 같은 색. **양수가 좋은 것이 아닌** 값에 쓴다
 *                (강의가 쉽다 = 좋다? 시험이 과제보다 높다 = 좋다? 둘 다 말할 수 없다).
 * - evaluative : 같은 모집단 안에서 위/아래가 도메인상 명확한 값에만 쓴다.
 */
const TONE_CLASSES = {
  neutral: { up: "text-secondary", down: "text-secondary", flat: "text-secondary" },
  evaluative: {
    up: "text-success-strong",
    down: "text-danger-strong",
    flat: "text-muted",
  },
} as const;

/** 편차 색 배정. */
export type DeviationTone = keyof typeof TONE_CLASSES;

/** 방향별 스크린리더 문구. 섹션 문맥에 맞게 덮어쓴다. */
interface DeviationSrLabel {
  up: string;
  down: string;
  flat: string;
}

const DEFAULT_SR_LABEL: DeviationSrLabel = {
  up: "기준보다 높음",
  down: "기준보다 낮음",
  flat: "기준과 같음",
};

/**
 * 표시 자릿수 기준으로 0인지 판정한다.
 *
 * 편차 값과 그 값을 풀어 쓴 문장(design.md 4.26.3)이 **같은 기준으로 0을 판단해야**
 * "= 0.0" 인데 "시험에서 더 득점했습니다" 같은 모순이 생기지 않는다.
 *
 * @param value 편차 값
 * @param digits 표시 소수 자릿수
 * @returns 반올림하면 0이 되는 값인지
 */
export function isFlatDeviation(value: number, digits = 1): boolean {
  return Math.abs(value) < 0.5 * 10 ** -digits;
}

interface DeviationValueProps {
  /** 원본 편차 값 */
  value: number;
  /** 단위. 점 / %p / 명 */
  unit?: string;
  /** 소수 자릿수 */
  digits?: number;
  tone?: DeviationTone;
  srLabel?: DeviationSrLabel;
  className?: string;
}

/**
 * 부호 · 방향 글리프 · 숫자 3중 단서를 갖춘 편차 표시.
 *
 * 색은 **네 번째 단서일 뿐**이며 `tone="neutral"` 에서는 색을 아예 쓰지 않는다.
 * 표시 자릿수에서 반올림하면 0이 되는 값(`|value| < 0.5 × 10^-digits`)은 0으로 취급한다 —
 * `+0.0` / `−0.0` 은 방향이 있는 것처럼 보이는 거짓 신호이기 때문이다.
 *
 * @param value 편차 값
 * @param unit 단위 문자열
 * @param digits 소수 자릿수
 * @param tone 색 배정 (가치 판단이 가능한 값에만 evaluative)
 * @param srLabel 방향별 스크린리더 문구
 * @returns 편차 표시 요소
 */
export function DeviationValue({
  value,
  unit = "점",
  digits = 1,
  tone = "neutral",
  srLabel = DEFAULT_SR_LABEL,
  className,
}: DeviationValueProps) {
  const direction = isFlatDeviation(value, digits) ? "flat" : value > 0 ? "up" : "down";

  // 절댓값을 포맷하고 부호를 앞에 붙인다(포매터가 주는 ASCII 하이픈을 쓰지 않기 위함).
  const sign = direction === "up" ? PLUS_SIGN : direction === "down" ? MINUS_SIGN : "";

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums",
        TONE_CLASSES[tone][direction],
        className,
      )}
    >
      <span aria-hidden="true" className="text-micro leading-none">
        {GLYPH[direction]}
      </span>
      <span className="font-medium">
        {sign}
        {formatNumber(Math.abs(value), digits)}
        {unit}
      </span>
      <span className="sr-only">{srLabel[direction]}</span>
    </span>
  );
}
