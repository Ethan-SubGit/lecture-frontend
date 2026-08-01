import { Badge, type BadgeTone } from "./Badge";

/**
 * 등급별 톤과 글리프 매핑 (design.md 4.8).
 *
 * 색맹 대응: 등급 문자 텍스트가 항상 보이고, 도형 글리프가 병행된다.
 * 색은 세 번째 단서일 뿐이며 색만으로 등급을 구분하게 하지 않는다.
 */
const GRADE_STYLE_BY_INITIAL: Record<string, { tone: BadgeTone; icon: string }> = {
  A: { tone: "success", icon: "▲" },
  B: { tone: "accent", icon: "◆" },
  C: { tone: "warning", icon: "●" },
  D: { tone: "warning", icon: "▽" },
  F: { tone: "danger", icon: "✕" },
};

/** 매핑에 없는 등급(서버가 임의 등급을 줄 수 있음)에 적용할 기본값. */
const DEFAULT_GRADE_STYLE = { tone: "neutral" as BadgeTone, icon: "" };

/**
 * 등급 문자에 대응하는 톤을 돌려준다.
 *
 * 등급분포 막대(DistributionBar)가 배지와 **같은 색**을 쓰게 하려면 매핑이 한 벌이어야 한다.
 * 첫 글자로 계열을 판정하고, 매핑에 없으면 neutral 로 떨어뜨린다.
 *
 * @param grade 등급 문자. 예: "A+", "B0", "F"
 * @returns 배지/막대에 공통으로 쓰는 톤
 */
export function getGradeTone(grade: string): BadgeTone {
  return (
    GRADE_STYLE_BY_INITIAL[grade.charAt(0).toUpperCase()]?.tone ??
    DEFAULT_GRADE_STYLE.tone
  );
}

interface GradeBadgeProps {
  /** 등급 문자. 예: "A+", "B0", "F" */
  grade: string;
  /** 평점. 있으면 등급 옆에 병기한다 */
  gpa?: number;
}

/**
 * 성적 등급 배지.
 *
 * @param grade 등급 문자 (항상 텍스트로 표시된다)
 * @param gpa 평점. 있으면 배지 뒤에 작은 글씨로 병기
 * @returns 등급 배지 요소
 */
export function GradeBadge({ grade, gpa }: GradeBadgeProps) {
  // 첫 글자로 계열을 판정한다. 매핑에 없으면 neutral 로 떨어뜨린다.
  const style = GRADE_STYLE_BY_INITIAL[grade.charAt(0).toUpperCase()] ?? DEFAULT_GRADE_STYLE;

  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={style.tone} icon={style.icon || undefined}>
        {/* 스크린리더가 "A+" 만 읽으면 맥락이 없으므로 "등급" 을 앞에 덧붙인다. */}
        <span className="sr-only">등급 </span>
        {grade}
      </Badge>
      {gpa !== undefined ? (
        <span className="text-caption text-muted tabular-nums md:text-micro">
          {gpa.toFixed(1)}
        </span>
      ) : null}
    </span>
  );
}
