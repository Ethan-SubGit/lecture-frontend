import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import type { ScoreHistogramBucketDto } from "@/types/api";

/* =============================================================================
   점수 구간 히스토그램 좌표 상수 (design.md 4.22.1)
   -----------------------------------------------------------------------------
   `GradeComboChart` 의 좌표계·토큰·aria 규약을 글자 그대로 승계한다.
   여기 값들은 **viewBox 사용자 단위**이지 CSS px 이 아니다 → Tailwind 토큰으로 만들지 않는다.
   ============================================================================= */

/** viewBox 가로. 콤보 차트와 동일한 논리 폭. */
const VB_W = 320;
/** viewBox 세로. 실제 높이는 h-chart / md:h-chart-lg 가 정한다. */
const VB_H = 160;
/** 가로 그리드선 개수(= 3구간). */
const GRID_LINES = 4;
/** 눈금 구간 수. 그리드선과 y축 라벨이 같은 분모를 쓰게 하는 단일 출처. */
const TICK_SEGMENTS = GRID_LINES - 1;
/**
 * 밴드 폭 대비 막대 폭 비율.
 * ⚠️ 콤보 차트(0.5)와 다른 **유일한** 상수다 — 등급은 이산 범주라 떨어져 있어야 하지만
 * 점수는 연속 축이라 막대가 붙어 있어야 "분포의 능선"으로 읽힌다.
 */
const BAR_RATIO = 0.82;
/** 구간이 20개를 넘어도 막대가 사라지지 않게 하는 최소 폭. */
const BAR_MIN_W = 3;
/** count > 0 인데 비율이 극히 작아도 "보이게" 하는 최소 높이. */
const BAR_MIN_H = 2;
/** 막대 모서리 반경. */
const BAR_RX = 2;
/** 누적 마커 반지름. 콤보(4)보다 작다 — 막대가 붙어 있어 마커가 클수록 겹친다. */
const MARKER_R = 3;
/** 라인·마커 테두리 굵기. */
const LINE_W = 2;
/** 그리드선 굵기. */
const GRID_W = 1;
/** 누적 비율 축의 상한(고정). */
const PERCENT_MAX = 100;
/** 좌표 소수 자릿수. */
const COORD_DIGITS = 2;
/** 꺾은선이 성립하는 최소 점 개수. */
const MIN_POINTS_FOR_LINE = 2;

/** 좌표를 소수 2자리로 끊는다. */
const round = (value: number): number => Number(value.toFixed(COORD_DIGITS));

interface ScoreHistogramChartProps {
  /** 서버가 bucketIndex 오름차순으로 준 구간 목록. **재정렬하지 않는다** */
  buckets: ScoreHistogramBucketDto[];
  /** 응답의 합계점수 만점. 마지막 구간 상한 안내에 쓴다(클라이언트 상수 100 금지) */
  totalScoreMax: number;
  className?: string;
}

/**
 * 점수 구간 히스토그램 — 세로 막대(구간 인원) + 누적 비율 라인 (design.md 4.22.1).
 *
 * **왜 누적 라인인가**: `percentage` 는 `count` 에 정비례하므로 비누적으로 그리면
 * 막대와 픽셀 단위로 같은 모양이 겹쳐 무의미하다. 누적은 단조 증가 S자라 모양이 확실히 다르고,
 * "합격선 아래가 몇 %인가"라는 히스토그램에서만 답할 수 있는 질문을 담는다.
 * 누적값은 **응답 `percentage` 의 단순 합**이며 서버 값을 재계산하지 않는다.
 *
 * 빈 상태·로딩은 이 컴포넌트가 정의하지 않는다 — 부모 `DashboardSection` 이 판정한다.
 *
 * @param buckets 구간 목록(부모가 totalCount > 0 을 보장한다)
 * @param totalScoreMax 합계점수 만점
 * @param className 배치용 추가 클래스
 * @returns 축 + 플롯 + 범례를 담은 figure
 */
export function ScoreHistogramChart({
  buckets,
  totalScoreMax,
  className,
}: ScoreHistogramChartProps) {
  const bandCount = buckets.length;

  // ① x축: 구간 개수만큼 균등 밴드. 막대 폭에 상한을 두지 않는다(구간이 적으면 넓은 편이 자연스럽다).
  const band = VB_W / bandCount;
  const barW = Math.max(band * BAR_RATIO, BAR_MIN_W);
  const centerX = (index: number) => band * (index + 0.5);

  // ② 좌축(막대, count): 0 ~ maxCount. 눈금 3구간이 정수로 떨어지도록 3의 배수 올림.
  //    ⚠️ rawMax <= 0 방어는 0 나눗셈(NaN/Infinity) 차단용이며 **삭제 금지**다.
  const rawMax = Math.max(...buckets.map((bucket) => bucket.count));
  const maxCount = rawMax > 0 ? Math.ceil(rawMax / TICK_SEGMENTS) * TICK_SEGMENTS : 1;

  const barHeight = (count: number) =>
    count > 0 ? Math.max((count / maxCount) * VB_H, BAR_MIN_H) : 0;

  // ③ 우축(라인, 누적 비율): 0~100 고정.
  //    서버 percentage 합이 반올림으로 100.1 이 될 수 있으므로 100 으로 클램프한다.
  const cumulative: number[] = [];
  buckets.forEach((bucket, index) => {
    cumulative.push(
      Math.min(PERCENT_MAX, (cumulative[index - 1] ?? 0) + bucket.percentage),
    );
  });
  const lineY = (percentage: number) => VB_H - (percentage / PERCENT_MAX) * VB_H;

  // ④ 누적 라인의 x 는 밴드 중앙이 아니라 **구간의 오른쪽 경계**다
  //    ("이 구간까지 포함해 몇 %"라는 뜻이므로). 마지막 점은 플롯 우단(x=320)에 걸친다
  //    → overflow-visible 이 없으면 마지막 마커가 잘린다.
  const boundaryX = (index: number) => band * (index + 1);
  const linePoints = cumulative
    .map((percentage, index) => `${round(boundaryX(index))},${round(lineY(percentage))}`)
    .join(" ");

  // ⑤ 그리드선 y좌표와 좌축 눈금 라벨은 같은 분모(TICK_SEGMENTS)에서 나온다. 라벨은 위→아래.
  const segments = Array.from({ length: GRID_LINES }, (_, index) => TICK_SEGMENTS - index);

  return (
    <figure className={cn("flex min-w-0 flex-col gap-3", className)}>
      {/* 그림은 접근성 트리에서 제외하고 이 캡션이 두 계열의 의미를 대신 말한다.
          별도의 대체 표는 만들지 않는다 — 같은 카드의 구간 막대 리스트가 이미 전 구간을 낭독한다. */}
      <figcaption className="sr-only">
        점수 구간별 분포 그래프입니다. 세로 막대는 각 점수 구간의 인원수(명), 겹쳐 그린 꺾은선은
        해당 구간까지의 누적 비율(%)입니다. 구간별 정확한 인원과 비율은 오른쪽(모바일에서는 아래)
        목록에서 확인할 수 있습니다.
      </figcaption>

      <div className="grid grid-cols-chart-axis gap-x-2 gap-y-1">
        {/* 좌축 눈금(인원수). -my-1.5 는 <ul> 이 아니라 각 <li> 에 붙인다 —
            li 바깥 박스 높이를 0 으로 만들어야 justify-between 이 글자 중앙을 그리드선에 맞춘다. */}
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

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="h-chart w-full overflow-visible md:h-chart-lg"
          aria-hidden="true"
          focusable="false"
        >
          {/* 1) 가로 그리드선(맨 아래 선이 x축 기준선을 겸한다) */}
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

          {/* 2) 막대. 구간에는 좋고 나쁨이 없으므로 등급 톤 5색이 아니라 accent 단색이다.
                 count === 0 이면 height="0" rect 를 남기지 않고 건너뛴다
                 (x축 라벨과 누적 마커가 남아 "이 구간은 0명"이라는 정보는 사라지지 않는다). */}
          {buckets.map((bucket, index) => {
            const height = barHeight(bucket.count);
            if (height === 0) return null;

            return (
              <rect
                key={bucket.bucketIndex}
                x={round(centerX(index) - barW / 2)}
                y={round(VB_H - height)}
                width={round(barW)}
                height={round(height)}
                rx={BAR_RX}
                className="fill-accent"
              />
            );
          })}

          {/* 3) 누적 라인. 점이 1개뿐이면 polyline 은 아무것도 그리지 않으므로 생략한다. */}
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

          {/* 4) 누적 마커. 막대 오른쪽 끝(band×(i+0.91))보다 바깥이라 막대 사이 틈에 놓인다. */}
          {buckets.map((bucket, index) => (
            <circle
              key={bucket.bucketIndex}
              cx={round(boundaryX(index))}
              cy={round(lineY(cumulative[index]))}
              r={MARKER_R}
              className="fill-surface stroke-chart-line"
              strokeWidth={LINE_W}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* 2행 1열: 좌축 라벨 열의 폭을 유지하기 위한 빈 칸 */}
        <div aria-hidden="true" />

        {/* x축 라벨 — 구간의 **하한값만** 쓴다.
            "90 ~ 100" 전체 라벨은 구간 10개 × 8자라 모바일에 절대 안 들어간다.
            정보가 사라지는 것이 아니다 — 전체 라벨은 옆 구간 막대 리스트에 그대로 있다. */}
        <ul aria-hidden="true" className="grid auto-cols-fr grid-flow-col">
          {buckets.map((bucket) => (
            <li
              key={bucket.bucketIndex}
              className="min-w-0 truncate px-0.5 text-center text-micro font-medium text-secondary sm:text-caption"
            >
              {bucket.minScore}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-micro text-muted">
        각 눈금은 구간의 시작 점수입니다. 마지막 구간의 상한은 {formatCount(totalScoreMax)}점입니다.
      </p>

      {/* 범례 — 목록에 없는 정보(계열의 의미)라 aria-hidden 이 아니다. */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <li className="flex min-w-0 items-center gap-2 text-caption text-secondary">
          {/* 막대가 단색이므로 콤보 차트의 3색 스와치가 아니라 1색 사각형이다. */}
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm bg-accent" />
          구간별 인원수 (명)
        </li>
        <li className="flex min-w-0 items-center gap-2 text-caption text-secondary">
          {/* 콤보 차트와 같은 stroke 토큰을 쓰므로 세 차트의 라인 색이 갈라질 수 없다. */}
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
          누적 비율 (%)
          <span className="text-micro text-muted">0~100 기준</span>
        </li>
      </ul>
    </figure>
  );
}
