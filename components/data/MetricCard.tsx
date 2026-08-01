import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";

/**
 * 대시보드 KPI 카드 (design.md 4.14).
 *
 * 「라벨 + 숫자」만 있으면 5장이 같은 회색 덩어리로 보이므로
 * ① 아이콘 슬롯 ② 시맨틱 톤 ③ 그림자 계층 ④ 보조 설명 ⑤ (해당 카드만) 만점 대비 막대를 갖는다.
 *
 * ⚠️ **전기 대비 증감 배지는 넣지 않는다.** `DashboardSummaryDto` 에 비교 기준이 되는
 * 과거 값이 전혀 없어서(spec.md 5절) 지어낼 수밖에 없기 때문이다. 빈 배지 자리조차 만들지 않는다.
 * 증감값을 주는 API 가 생기면 그때 delta prop 을 추가한다.
 */

/**
 * 아이콘 슬롯 톤 (design.md 4.14).
 *
 * warning/danger 를 쓰지 않는 이유: 두 톤은 이 디자인 시스템에서 "확인 필요/실패"라는
 * 상태 의미를 이미 갖는다(에러 배너·F등급·삭제 버튼). 중립적인 집계 숫자에 붙이면
 * "평균 GPA에 문제가 있다"로 오독된다. 알록달록함보다 의미 일관성이 우선이다.
 *
 * 클래스는 전부 정적 문자열이다 — `bg-${tone}` 같은 동적 조합은 Tailwind 가 스캔하지 못한다.
 */
const iconSlotVariants = cva(
  "grid h-10 w-10 shrink-0 place-items-center rounded-lg md:h-12 md:w-12",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunken text-secondary", // 기준정보성 지표
        accent: "bg-accent-subtle text-accent-strong", // 운영 규모 지표
        success: "bg-success-subtle text-success-strong", // 품질/평균 지표
      },
      emphasis: {
        default: "",
        // 주인공 카드는 아이콘 슬롯을 솔리드로 승격해 시선의 시작점을 만든다.
        primary: "bg-accent text-on-accent",
      },
    },
    defaultVariants: { tone: "neutral", emphasis: "default" },
  },
);

/** 아이콘 톤 유니온. 호출부(대시보드)가 카드 배정표를 타입으로 검증받는다. */
export type MetricTone = NonNullable<VariantProps<typeof iconSlotVariants>["tone"]>;
/** 카드 계층 유니온. primary 는 화면당 1장만 쓴다. */
export type MetricEmphasis = NonNullable<
  VariantProps<typeof iconSlotVariants>["emphasis"]
>;

/** 만점 대비 진행 막대에 필요한 값. 지어낸 값이 아니라 응답값/만점의 실제 비율이다. */
interface MetricProgress {
  /** 현재 값(숫자 원본) */
  current: number;
  /** 만점 */
  max: number;
}

interface MetricCardProps {
  /** 지표 이름 */
  label: string;
  /** 이미 포맷된 값. 천단위 구분·소수 자릿수는 호출부 책임 */
  value: string | number;
  /** 단위 (개, 건, 점 등) */
  unit?: string;
  /** 지표의 정의를 설명하는 정적 문구 1줄 */
  hint?: string;
  /** h-5 w-5 인라인 SVG 아이콘 */
  icon: ReactNode;
  /** 아이콘 슬롯 톤 */
  tone?: MetricTone;
  /** 그림자 계층 */
  emphasis?: MetricEmphasis;
  /** 주어지면 만점 대비 진행 막대를 렌더한다 */
  progress?: MetricProgress;
}

/** 진행 막대 폭(%) 계산. 서버 값이 범위를 벗어나도 막대가 깨지지 않게 0~100 으로 가둔다. */
function toProgressPercentage({ current, max }: MetricProgress): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (current / max) * 100));
}

/**
 * KPI 카드 1장.
 *
 * 클릭할 수 없는 표시 전용 카드이므로 hover 반응을 두지 않는다("누를 수 있다"는 거짓 신호).
 * 아이콘 슬롯과 진행 막대는 aria-hidden 이며, 정보는 전부 텍스트(값·단위·hint)로도 존재한다.
 *
 * @param label 지표 이름
 * @param value 포맷된 지표 값
 * @param unit 단위
 * @param hint 보조 설명
 * @param icon 아이콘 노드
 * @param tone 아이콘 슬롯 톤
 * @param emphasis 그림자 계층
 * @param progress 만점 대비 막대 값
 * @returns li 로 감싼 KPI 카드 (호출부의 ul 안에 놓여 개수가 인식된다)
 */
export function MetricCard({
  label,
  value,
  unit,
  hint,
  icon,
  tone = "neutral",
  emphasis = "default",
  progress,
}: MetricCardProps) {
  return (
    <Card
      as="li"
      elevation={emphasis === "primary" ? "raised" : "card"}
      className="relative overflow-hidden"
    >
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className={cn(iconSlotVariants({ tone, emphasis }))}>
          {icon}
        </span>

        {/* min-w-0 이 없으면 좁은 5열에서 긴 숫자가 아이콘을 밀어낸다. */}
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-muted">{label}</p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="text-metric font-bold text-primary tabular-nums xl:text-metric-lg">
              {value}
            </span>
            {unit ? <span className="text-body font-medium text-muted">{unit}</span> : null}
          </p>
        </div>
      </div>

      {progress ? (
        <div
          aria-hidden="true"
          className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
        >
          {/* 폭만 데이터에서 온다. 채움색은 bg-success 고정 — 동적 클래스 조합을 만들지 않는다. */}
          <div
            className="h-full rounded-full bg-success"
            style={{ width: `${toProgressPercentage(progress)}%` }}
          />
        </div>
      ) : null}

      {hint ? <p className="mt-3 text-caption text-muted">{hint}</p> : null}
    </Card>
  );
}
