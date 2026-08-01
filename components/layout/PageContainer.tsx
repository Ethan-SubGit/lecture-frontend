import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageContainerProps {
  /**
   * 본문 최대 폭.
   * 'content' = 일반 페이지 / 'wide' = 대시보드·성적조회(KPI 5열, 10열 표)
   */
  width?: "content" | "wide";
  className?: string;
  children: ReactNode;
}

/** 최대 폭 토큰 매핑. 동적 클래스 조립을 피해 purge 안전성을 지킨다. */
const WIDTH_CLASSES = {
  content: "max-w-content",
  wide: "max-w-wide",
} as const;

/**
 * 전 인증 화면 공통 본문 컨테이너 (design.md 1.1).
 *
 * `<main id="main-content">` 로 렌더되어 스킵 링크의 목적지가 된다.
 * 화면마다 컨테이너 클래스를 복사하지 않도록 여기 한 곳에 고정한다.
 *
 * @param width 최대 폭 프리셋
 * @param children 페이지 내용
 * @returns main 요소
 */
export function PageContainer({
  width = "content",
  className,
  children,
}: PageContainerProps) {
  return (
    <main
      id="main-content"
      className={cn(
        "mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
        WIDTH_CLASSES[width],
        className,
      )}
    >
      {children}
    </main>
  );
}
