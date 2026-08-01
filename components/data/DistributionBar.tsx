import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BadgeTone } from "@/components/ui/Badge";

/**
 * 톤 → 막대 채움색 정적 매핑 (design.md 4.15.1).
 *
 * Tailwind 는 `bg-${tone}` 같은 조합 문자열을 스캔하지 못하므로 정적 맵이 필수다.
 * neutral 은 배경으로 쓸 수 있는 중립색이 없으므로 accent 로 떨어뜨린다
 * (`bg-border-strong` 같은 클래스는 존재하지 않는다).
 */
const BAR_FILL_BY_TONE: Record<BadgeTone, string> = {
  neutral: "bg-accent",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** 가로 막대 리스트의 행 1개. */
export interface DistributionBarItem {
  /** React key */
  key: string;
  /** 좌측 라벨 슬롯. GradeBadge · Badge · 텍스트 칩 무엇이든 온다 */
  label: ReactNode;
  /**
   * 막대 채움 **폭 비율**(0~100).
   * ⚠️ "비율(%) 값"이 아니라 폭이다. 만점 정보가 없는 평가항목(design.md 4.26)에서는
   * 「4개 항목 중 최댓값 = 100」인 상대 폭으로 쓰며, 이때 화면에 %를 절대 출력하지 않는다.
   */
  fillRatio: number;
  /** 우측 수치 텍스트. **이 텍스트가 유일한 정보 전달자**다(막대는 aria-hidden) */
  valueText: string;
  /** 막대 색 톤. 호출부가 정한다 */
  tone: BadgeTone;
  /** 최댓값 행 강조(색 외 단서 = 굵기) */
  emphasized?: boolean;
}

interface DistributionBarProps {
  items: DistributionBarItem[];
}

/**
 * 가로 막대 리스트 (design.md 4.15.1) — "값을 읽는" 표현.
 *
 * 등급 분포 / 점수 구간 분포 / 평가항목 평균 **3곳**이 같은 모양을 쓰므로
 * 특정 응답 타입에 결합하지 않고 라벨·폭·수치·톤만 받는 범용 시그니처로 둔다.
 * 최다 항목 판정과 톤 배정은 전부 호출부 책임이다(판정 로직이 두 벌이 되지 않게).
 *
 * 빈 상태·로딩은 이 컴포넌트가 모른다 — 부모 패널/섹션이 한 번만 판정한다.
 *
 * @param items 막대 행 목록(부모가 비어 있지 않음을 보장한다)
 * @returns 분포 리스트
 */
export function DistributionBar({ items }: DistributionBarProps) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li
          key={item.key}
          className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors duration-fast ease-standard hover:bg-surface-hover"
        >
          {/* 라벨이 무엇이든 좌측 폭이 맞아야 막대 시작선이 행마다 정렬된다. */}
          <span className="flex min-w-touch shrink-0 justify-center">{item.label}</span>

          {/* 막대 트랙. min-w-0 을 줘야 좁은 화면에서 수치를 밀어내지 않고 막대가 줄어든다. */}
          <span
            aria-hidden="true"
            className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken"
          >
            {/* 폭만 데이터에서 오는 값이라 인라인 스타일을 쓴다. 색·모양은 토큰이다. */}
            <span
              className={cn("block h-full rounded-full", BAR_FILL_BY_TONE[item.tone])}
              style={{ width: `${item.fillRatio}%` }}
            />
          </span>

          <span
            className={cn(
              "shrink-0 text-caption tabular-nums",
              item.emphasized ? "font-semibold text-primary" : "text-secondary",
            )}
          >
            {item.valueText}
          </span>
        </li>
      ))}
    </ul>
  );
}
