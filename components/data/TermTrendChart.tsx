import { cn } from "@/lib/cn";
import { formatNumber, formatTermShort } from "@/lib/format";
import type { TermTrendPointDto } from "@/types/api";

/* =============================================================================
   학기별 추이 차트 좌표 상수 (design.md 4.27.1)
   -----------------------------------------------------------------------------
   `GradeComboChart` / `ScoreHistogramChart` 와 같은 좌표계·토큰·aria 규약을 쓴다.
   다른 점은 **우축(평균 점수)을 데이터 범위에 맞춰 자동 확대**하고,
   그 사실을 눈금 라벨과 문구로 항상 밝힌다는 것 하나다.
   ============================================================================= */

const VB_W = 320;
const VB_H = 160;
const GRID_LINES = 4;
const TICK_SEGMENTS = GRID_LINES - 1;
/** 학기 = 이산 범주이므로 막대는 떨어져 있어야 한다(콤보 차트와 같은 0.5). */
const BAR_RATIO = 0.5;
const BAR_MIN_W = 6;
const BAR_MAX_W = 40;
const BAR_MIN_H = 2;
const BAR_RX = 2;
const MARKER_R = 4;
const LINE_W = 2;
const GRID_W = 1;
/** 우축 눈금을 5점 단위로 맞춘다(읽기 좋은 값). */
const AXIS_STEP = 5;
/** 데이터 범위의 25%를 위아래 여백으로 둔다. */
const AXIS_PAD_RATIO = 0.25;
/** 전 학기 값이 같을 때(범위 0) 쓸 고정 여백. 없으면 선이 축에 붙는다. */
const AXIS_FLAT_PAD = 10;
const COORD_DIGITS = 2;
const MIN_POINTS_FOR_LINE = 2;

const round = (value: number): number => Number(value.toFixed(COORD_DIGITS));

interface TermTrendChartProps {
  /** 서버가 학기 오름차순으로 준 시계열. **재정렬하지 않는다** */
  points: TermTrendPointDto[];
  /** 응답의 합계점수 만점. 우축 상한을 자를 때 쓴다(클라이언트 상수 100 금지) */
  totalScoreMax: number;
  className?: string;
}

/**
 * 학기별 추이 차트 — 세로 막대(성적 건수) + 꺾은선(평균 합계점수), **양쪽 y축** (design.md 4.27.1).
 *
 * **왜 양축인가**: 건수(수십~수천)와 평균점수(0~100 근처)는 단위가 완전히 달라
 * 한 축에 넣으면 한쪽이 바닥에 눌린다.
 * **왜 우축이 0에서 시작하지 않는가**: 학기 평균은 보통 65~85 사이에 몰려 0~100 축에서는
 * 추이가 거의 직선이 된다. 대신 **확대 사실을 눈금과 문구로 항상 밝힌다** —
 * 확대 자체가 문제가 아니라 확대를 숨기는 것이 문제다.
 *
 * 빈 상태·로딩은 부모 `DashboardSection` 이 판정한다.
 *
 * @param points 학기별 시계열(부모가 length > 0 을 보장한다)
 * @param totalScoreMax 합계점수 만점
 * @param className 배치용 추가 클래스
 * @returns 축 + 플롯 + 확대 안내 + 범례를 담은 figure
 */
export function TermTrendChart({ points, totalScoreMax, className }: TermTrendChartProps) {
  const bandCount = points.length;

  // ① x축: 학기 개수만큼 균등 밴드. 시계열이므로 막대·마커 모두 밴드 **중앙**이다.
  const band = VB_W / bandCount;
  const barW = Math.min(Math.max(band * BAR_RATIO, BAR_MIN_W), BAR_MAX_W);
  const centerX = (index: number) => band * (index + 0.5);

  // ② 좌축(막대, studentCount): 0 ~ maxCount. rawMax <= 0 방어는 **삭제 금지**.
  const rawMax = Math.max(...points.map((point) => point.studentCount));
  const maxCount = rawMax > 0 ? Math.ceil(rawMax / TICK_SEGMENTS) * TICK_SEGMENTS : 1;
  const barHeight = (count: number) =>
    count > 0 ? Math.max((count / maxCount) * VB_H, BAR_MIN_H) : 0;

  // ③ 우축(라인, averageTotalScore): 자동 확대. 0 아래 / 만점 위로는 넘어가지 않게 자르고
  //    5점 눈금에 스냅한다. lineMax === lineMin 이면 0 나눗셈이 되므로 최소 1스텝을 보장한다(삭제 금지).
  const values = points.map((point) => point.averageTotalScore);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const span = dataMax - dataMin;
  const pad = span > 0 ? span * AXIS_PAD_RATIO : AXIS_FLAT_PAD;
  const lineMin = Math.max(0, Math.floor((dataMin - pad) / AXIS_STEP) * AXIS_STEP);
  const lineMax = Math.min(totalScoreMax, Math.ceil((dataMax + pad) / AXIS_STEP) * AXIS_STEP);
  const lineSpan = lineMax > lineMin ? lineMax - lineMin : AXIS_STEP;

  const lineY = (value: number) => VB_H - ((value - lineMin) / lineSpan) * VB_H;

  // ④ 꺾은선 좌표
  const linePoints = points
    .map((point, index) => `${round(centerX(index))},${round(lineY(point.averageTotalScore))}`)
    .join(" ");

  // ⑤ 좌·우 눈금은 같은 분모(TICK_SEGMENTS)에서 나온다. 라벨은 위→아래 순서다.
  const segments = Array.from({ length: GRID_LINES }, (_, index) => TICK_SEGMENTS - index);

  return (
    <figure className={cn("flex min-w-0 flex-col gap-3", className)}>
      <figcaption className="sr-only">
        학기별 추이 그래프입니다. 세로 막대는 학기별 성적 건수(건), 겹쳐 그린 꺾은선은 학기별 평균
        합계점수(점)이며 오른쪽 축은 {formatNumber(lineMin, 0)}점부터 {formatNumber(lineMax, 0)}
        점까지 확대되어 있습니다. 학기별 정확한 값은 아래 표에서 확인할 수 있습니다.
      </figcaption>

      {/* 좌 눈금 / 플롯 / 우 눈금 3열 그리드. minmax(0,1fr) 이라 SVG 가 트랙을 밀지 않는다. */}
      <div className="grid grid-cols-chart-axis-2y gap-x-2 gap-y-1">
        {/* 1열: 좌축 눈금(성적 건수) */}
        <ul
          aria-hidden="true"
          className="flex h-chart flex-col justify-between text-micro leading-none tabular-nums text-muted md:h-chart-lg"
        >
          {segments.map((segment) => (
            <li key={segment} className="-my-1.5 text-right">
              {Math.round((maxCount * segment) / TICK_SEGMENTS)}
            </li>
          ))}
        </ul>

        {/* 2열: 플롯 */}
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="h-chart w-full overflow-visible md:h-chart-lg"
          aria-hidden="true"
          focusable="false"
        >
          {segments.map((segment) => {
            const y = round(VB_H - (segment / TICK_SEGMENTS) * VB_H);
            return (
              <line
                key={segment}
                x1={0}
                y1={y}
                x2={VB_W}
                y2={y}
                className="stroke-chart-grid"
                strokeWidth={GRID_W}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* 막대는 accent 단색이다 — 학기에는 좋고 나쁨이 없다. */}
          {points.map((point, index) => {
            const height = barHeight(point.studentCount);
            if (height === 0) return null;

            return (
              <rect
                key={point.term}
                x={round(centerX(index) - barW / 2)}
                y={round(VB_H - height)}
                width={round(barW)}
                height={round(height)}
                rx={BAR_RX}
                className="fill-accent"
              />
            );
          })}

          {bandCount >= MIN_POINTS_FOR_LINE ? (
            <polyline
              fill="none"
              points={linePoints}
              className="stroke-chart-line"
              strokeWidth={LINE_W}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {points.map((point, index) => (
            <circle
              key={point.term}
              cx={round(centerX(index))}
              cy={round(lineY(point.averageTotalScore))}
              r={MARKER_R}
              className="fill-surface stroke-chart-line"
              strokeWidth={LINE_W}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* 3열: 우축 눈금(평균 합계점수). text-left 로 플롯 쪽에 붙인다. */}
        <ul
          aria-hidden="true"
          className="flex h-chart flex-col justify-between text-micro leading-none tabular-nums text-muted md:h-chart-lg"
        >
          {segments.map((segment) => (
            <li key={segment} className="-my-1.5 text-left">
              {formatNumber(lineMin + (lineSpan * segment) / TICK_SEGMENTS, 0)}
            </li>
          ))}
        </ul>

        {/* 2행: 좌 스페이서 / x축 라벨 / 우 스페이서 */}
        <div aria-hidden="true" />
        <ul aria-hidden="true" className="grid auto-cols-fr grid-flow-col">
          {points.map((point) => (
            <li
              key={point.term}
              className="min-w-0 truncate px-0.5 text-center text-micro font-medium text-secondary sm:text-caption"
            >
              {formatTermShort(point.term)}
            </li>
          ))}
        </ul>
        <div aria-hidden="true" />
      </div>

      {/* 확대 안내는 aria-hidden 이 아니다 — 축 눈금에만 담긴 사실이라 낭독되어야 한다. */}
      <p className="text-micro text-muted">
        오른쪽 축은 0이 아니라 {formatNumber(lineMin, 0)}점부터 시작합니다(변화를 크게 보이게 한
        확대입니다).
      </p>

      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <li className="flex min-w-0 items-center gap-2 text-caption text-secondary">
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm bg-accent" />
          성적 건수 (건)
        </li>
        <li className="flex min-w-0 items-center gap-2 text-caption text-secondary">
          <svg viewBox="0 0 20 8" className="h-2 w-5 shrink-0" aria-hidden="true" focusable="false">
            <line
              x1="0"
              y1="4"
              x2="20"
              y2="4"
              strokeWidth="2"
              strokeLinecap="round"
              className="stroke-chart-line"
            />
            <circle cx="10" cy="4" r="3" strokeWidth="2" className="fill-surface stroke-chart-line" />
          </svg>
          평균 합계점수 (점)
          <span className="text-micro text-muted">
            {formatNumber(lineMin, 0)}~{formatNumber(lineMax, 0)} 확대
          </span>
        </li>
      </ul>
    </figure>
  );
}
