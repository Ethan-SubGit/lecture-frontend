import { cn } from "@/lib/cn";
import { getGradeTone } from "@/components/ui/GradeBadge";
import type { BadgeTone } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/format";
import type { GradeDistributionItemDto } from "@/types/api";

/* =============================================================================
   등급분포 콤보 차트 좌표 상수 (design.md 4.15.2)
   -----------------------------------------------------------------------------
   여기 값들은 **viewBox 사용자 단위**이지 CSS px 이 아니다.
   실제 크기는 클래스(h-chart / md:h-chart-lg / w-full)가 정하고,
   SVG 내부는 항상 320×160 논리 좌표계 위에서 계산된다.
   → 그래서 Tailwind 토큰으로 만들지 않고 이 파일 상단에 한 번만 둔다.
   ============================================================================= */

/** viewBox 가로. "논리 폭"일 뿐 실제 px 이 아니다. */
const VB_W = 320;
/** viewBox 세로. 실제 높이는 h-chart / md:h-chart-lg 가 정한다. */
const VB_H = 160;
/** 가로 그리드선 개수(= 3구간). 0 / 1/3 / 2/3 / 최대. */
const GRID_LINES = 4;
/** 눈금 구간 수. y축 라벨과 그리드선이 같은 분모를 쓰게 하는 단일 출처. */
const TICK_SEGMENTS = GRID_LINES - 1;
/** 밴드 폭 대비 막대 폭 비율. 나머지 50% 는 막대 사이 여백이 된다. */
const BAR_RATIO = 0.5;
/** 등급이 아주 많을 때의 막대 최소 폭. */
const BAR_MIN_W = 6;
/** 등급이 1~2개일 때 막대가 판때기처럼 보이지 않게 하는 상한. */
const BAR_MAX_W = 40;
/** count > 0 인데 비율이 극히 작을 때도 "보이게" 하는 최소 높이. */
const BAR_MIN_H = 2;
/** 막대 모서리 반경. 아래쪽은 축선에 닿아 둥근 것이 티나지 않는다. */
const BAR_RX = 2;
/** 라인 마커 반지름(각 등급 지점의 실제 값 위치를 확정한다). */
const MARKER_R = 4;
/** 라인·마커 테두리 굵기. non-scaling-stroke 라 CSS px 로 고정된다. */
const LINE_W = 2;
/** 그리드선 굵기. 데이터보다 앞서면 안 되므로 가장 얇게. */
const GRID_W = 1;
/** 라인(비율)의 보조축 상한. **막대의 자동 확대 스케일과 무관한 고정값**이다. */
const PERCENT_MAX = 100;
/** 좌표 소수 자릿수. DOM 문자열이 길어지는 것을 막는다. */
const COORD_DIGITS = 2;
/** 꺾은선이 성립하는 최소 점 개수. 1점짜리 polyline 은 아무것도 그려지지 않는다. */
const MIN_POINTS_FOR_LINE = 2;

/**
 * 등급 톤 → 막대 채움색 정적 매핑 (design.md 4.15.2).
 *
 * `DistributionBar` 의 `BAR_FILL_BY_TONE`(bg-*) 과 쌍이 되는 SVG 용 맵이다.
 * Tailwind 는 `fill-${tone}` 같은 조합 문자열을 인식하지 못하므로 정적 맵이 필수다.
 * neutral(서버가 준 임의 등급)은 막대 리스트와 같은 규칙으로 accent 에 떨어뜨린다.
 */
const BAR_SVG_FILL_BY_TONE: Record<BadgeTone, string> = {
  neutral: "fill-accent",
  accent: "fill-accent",
  success: "fill-success",
  warning: "fill-warning",
  danger: "fill-danger",
};

/** 좌표를 소수 2자리로 끊는다. 계산 오차로 생기는 긴 소수를 DOM 에 흘리지 않기 위함. */
const round = (value: number): number => Number(value.toFixed(COORD_DIGITS));

interface GradeComboChartProps {
  /** 부모가 `length > 0` **그리고** 합계 count > 0 을 보장한 등급 분포 배열 */
  items: GradeDistributionItemDto[];
  /**
   * 헤드라인용 최다 등급. 부모가 헤더 배지와 **같은** `summarizeGradeDistribution`
   * 결과를 내려준다(최다 판정을 두 곳에서 하면 값이 갈라진다). null 이면 헤드라인을 렌더하지 않는다.
   */
  topGrade?: Pick<GradeDistributionItemDto, "grade" | "percentage"> | null;
  /** 배치용 여백 클래스만 받는다. 색·크기 클래스는 넘기지 않는다 */
  className?: string;
}

/**
 * 등급분포 콤보 차트 — 세로 막대(인원수) + 꺾은선(비율) (design.md 4.15.2).
 *
 * 차트 라이브러리를 쓰지 않고 `<rect>`/`<polyline>`/`<circle>`/`<line>` 만으로 그린다.
 * 두 계열의 y축이 다르다는 점이 이 차트의 핵심이다:
 * - 막대 = `count`, `0 ~ maxCount` 자동 확대 → **등급들끼리의 상대 비교**
 * - 라인 = `percentage`, `0 ~ 100` 고정 → **전체에서 차지하는 절대 비중**
 * (라인도 자동 확대하면 막대와 픽셀 단위로 동일한 그래프가 겹쳐 무의미해진다.)
 *
 * 빈 상태·로딩은 이 컴포넌트가 정의하지 않는다. 부모 `GradeDistributionPanel` 이 한 번만 판정한다.
 *
 * @param items 등급별 인원수/비율 목록(서버 정렬 순서를 그대로 신뢰한다)
 * @param topGrade 최다 등급과 그 비중. 요약 헤드라인에만 쓴다
 * @param className 배치용 추가 클래스
 * @returns 요약 헤드라인 + 축 + 플롯 + 범례를 담은 figure
 */
export function GradeComboChart({ items, topGrade = null, className }: GradeComboChartProps) {
  const bandCount = items.length;

  // ① x축: 등급 개수만큼 균등 밴드로 나눈다. 밴드 중앙이 "그 등급의 x좌표"다.
  const band = VB_W / bandCount;
  // 막대 폭은 밴드의 절반이되, 등급이 많으면 BAR_MIN_W, 1~2개면 BAR_MAX_W 로 클램프한다.
  const barW = Math.min(Math.max(band * BAR_RATIO, BAR_MIN_W), BAR_MAX_W);
  const centerX = (index: number) => band * (index + 0.5);

  // ② y축 좌(막대, count): 0 ~ maxCount.
  //    눈금 3구간이 정수로 떨어지도록 3의 배수로 올림한다(3/6/9… 처럼 읽기 좋은 눈금).
  //    ⚠️ rawMax <= 0 이면 1 로 둔다 — 0 나눗셈(NaN/Infinity) 원천 차단용 방어이며 삭제 금지.
  //    (전량 0명은 부모가 빈 상태로 걸러내지만, 여기서도 계산이 깨지지 않아야 한다.)
  const rawMax = Math.max(...items.map((item) => item.count));
  const maxCount = rawMax > 0 ? Math.ceil(rawMax / TICK_SEGMENTS) * TICK_SEGMENTS : 1;

  // SVG 의 y 는 위가 0 이므로, 막대는 바닥(VB_H)에서 위로 자란다.
  const barHeight = (count: number) =>
    count > 0 ? Math.max((count / maxCount) * VB_H, BAR_MIN_H) : 0;

  // ③ y축 우(라인, percentage): 0~100 고정 보조 스케일.
  //    0% → y=160(바닥) / 50% → y=80(중앙) / 100% → y=0(천장)
  const lineY = (percentage: number) => VB_H - (percentage / PERCENT_MAX) * VB_H;

  // ④ 꺾은선 좌표 문자열.
  const linePoints = items
    .map((item, index) => `${round(centerX(index))},${round(lineY(item.percentage))}`)
    .join(" ");

  // ⑤ 그리드선 y좌표와 y축 눈금 라벨은 **같은 분모(TICK_SEGMENTS)** 에서 나온다.
  //    k = 0 이 바닥, k = 3 이 천장. 라벨은 위→아래 순서라 k 를 역순으로 돈다.
  const segments = Array.from({ length: GRID_LINES }, (_, index) => TICK_SEGMENTS - index);

  return (
    <figure className={cn("flex min-w-0 flex-col gap-3", className)}>
      {/* 그림(svg)은 접근성 트리에서 제외하고, 이 캡션이 두 계열의 의미를 대신 말한다.
          별도의 스크린리더용 대체 표는 만들지 않는다 — 같은 카드의 DistributionBar 가 이미 낭독한다. */}
      <figcaption className="sr-only">
        등급별 인원수와 비율 그래프입니다. 세로 막대는 등급별 인원수(명), 막대 위에 겹쳐 그린
        꺾은선은 전체 대비 비율(%)을 나타냅니다. 정확한 값은 오른쪽(모바일에서는 아래) 목록에서
        등급·인원수·비율로 확인할 수 있습니다.
      </figcaption>

      {/* ① 요약 헤드라인 — 헤더 배지에 없는 값("최다 등급이 얼마나 지배적인가")을 말한다. */}
      {topGrade ? (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-title font-semibold tabular-nums text-primary lg:text-display">
            {formatNumber(topGrade.percentage, 1)}%
          </span>
          <span className="text-caption text-muted">최다 {topGrade.grade} 비중</span>
        </p>
      ) : null}

      {/* ② 축 + 플롯: 1열=y축 눈금(내용폭), 2열=플롯 / 2행 2열=x축 라벨.
          grid-cols-chart-axis 의 minmax(0,1fr) 덕분에 SVG 가 트랙을 밀지 않는다. */}
      <div className="grid grid-cols-chart-axis gap-x-2 gap-y-1">
        {/* y축 눈금(인원수). 같은 값이 옆 목록에 텍스트로 있으므로 aria-hidden.
            -my-1.5 는 <ul> 이 아니라 각 <li> 에 붙인다 — li 바깥 박스 높이를 0 으로 만들어야
            justify-between 이 글자 중앙을 그리드선에 정확히 맞춘다. ul 에 걸면 목록 전체가 밀린다. */}
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

        {/* 플롯. preserveAspectRatio="none" 이라 폭은 부모에 100% 맞고 높이는 토큰이 정한다.
            대신 선 굵기가 x/y 로 다르게 늘어나므로 선 요소마다 non-scaling-stroke 가 필수다.
            overflow-visible: 100% 에 가까운 마커가 상단에서 잘리지 않게 한다. */}
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="h-chart w-full overflow-visible md:h-chart-lg"
          aria-hidden="true"
          focusable="false"
        >
          {/* 1) 가로 그리드선(맨 아래 선이 x축 기준선 역할을 겸한다) */}
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

          {/* 2) 막대(인원수). count === 0 이면 height="0" 인 rect 를 남기지 않고 아예 건너뛴다.
                 x축 라벨과 0% 마커가 남으므로 "이 등급은 0명"이라는 정보는 사라지지 않는다. */}
          {items.map((item, index) => {
            const height = barHeight(item.count);
            if (height === 0) return null;

            return (
              <rect
                key={item.grade}
                x={round(centerX(index) - barW / 2)}
                y={round(VB_H - height)}
                width={round(barW)}
                height={round(height)}
                rx={BAR_RX}
                className={BAR_SVG_FILL_BY_TONE[getGradeTone(item.grade)]}
              />
            );
          })}

          {/* 3) 비율 라인. 막대 뒤에 그려 위에 겹치게 한다. 색은 등급과 무관한 중립색이다.
                 점이 1개뿐이면 polyline 은 아무것도 그리지 않으므로 렌더 자체를 생략한다(마커만 남는다). */}
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

          {/* 4) 마커. 안쪽을 surface 로 뚫어 막대 위에서도 값 위치가 읽힌다.
                 preserveAspectRatio="none" 아래에서 r 은 보정되지 않아 살짝 타원이 되는데,
                 실제 렌더 폭은 SSR 에서 알 수 없으므로 보정하지 않고 감수한다(design.md 4.15.2 ⑤). */}
          {items.map((item, index) => (
            <circle
              key={item.grade}
              cx={round(centerX(index))}
              cy={round(lineY(item.percentage))}
              r={MARKER_R}
              className="fill-surface stroke-chart-line"
              strokeWidth={LINE_W}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* 2행 1열: y축 라벨 열의 폭을 유지하기 위한 빈 칸 */}
        <div aria-hidden="true" />

        {/* x축 라벨(등급). auto-cols-fr 이라 SVG 밴드와 폭이 정확히 일치한다. */}
        <ul aria-hidden="true" className="grid auto-cols-fr grid-flow-col">
          {items.map((item) => (
            <li
              key={item.grade}
              className="min-w-0 truncate px-0.5 text-center text-micro font-medium text-secondary sm:text-caption"
            >
              {item.grade}
            </li>
          ))}
        </ul>
      </div>

      {/* ③ 범례 — 막대와 라인이 각각 무엇인지 말한다(등급-색 대응은 옆 목록의 배지가 이미 보여준다).
          목록에 없는 정보라 aria-hidden 이 아니다. */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <li className="flex min-w-0 items-center gap-2 text-caption text-secondary">
          {/* 막대 스와치: "여러 색 막대"임을 3색 미니 막대로 표현 */}
          <span aria-hidden="true" className="flex h-3 shrink-0 items-end gap-0.5">
            <i className="h-2 w-1 rounded-sm bg-success" />
            <i className="h-3 w-1 rounded-sm bg-accent" />
            <i className="h-1.5 w-1 rounded-sm bg-warning" />
          </span>
          인원수 (명)
        </li>
        <li className="flex min-w-0 items-center gap-2 text-caption text-secondary">
          {/* 라인 스와치: 차트와 같은 stroke 토큰을 쓰므로 색이 갈라질 수 없다.
              bg-primary 같은 클래스는 존재하지 않으므로 인라인 SVG 로 표현한다. */}
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
          비율 (%)
          {/* 두 계열의 y축이 다르다는 사실을 눈으로 추측하게 두지 않고 문자로 알린다. */}
          <span className="text-micro text-muted">0~100 기준</span>
        </li>
      </ul>
    </figure>
  );
}
