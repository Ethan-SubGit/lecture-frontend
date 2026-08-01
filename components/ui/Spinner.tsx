import { cn } from "@/lib/cn";

/** 스피너 크기 토큰. 버튼 내부(sm)와 전체 화면 로딩(md/lg)에 쓴다. */
type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  /** 크기. 기본 sm (버튼 안) */
  size?: SpinnerSize;
  /** 추가 클래스 */
  className?: string;
}

/** 크기별 지름 클래스. 스케일 밖 임의 값을 쓰지 않기 위해 맵으로 고정한다. */
const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

/**
 * 회전 로딩 인디케이터.
 *
 * 테두리 한 변만 투명하게 두고 회전시켜 원형 스피너를 만든다.
 * 색은 `border-current` 로 부모 텍스트 색을 그대로 따라가므로
 * 버튼 variant 마다 따로 색을 지정할 필요가 없다.
 *
 * @param size 지름 프리셋
 * @param className 추가 클래스
 * @returns 장식 요소(aria-hidden). 의미는 부모의 aria-busy/라벨이 전달한다
 */
export function Spinner({ size = "sm", className }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        SIZE_CLASSES[size],
        className,
      )}
    />
  );
}
