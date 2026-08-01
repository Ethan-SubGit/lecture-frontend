"use client";

import { useEffect, useState } from "react";

/**
 * 미디어 쿼리 일치 여부를 구독하는 훅.
 *
 * 서버 렌더 시에는 window 가 없으므로 항상 false 로 시작하고,
 * 마운트 직후 실제 값으로 맞춘다(하이드레이션 불일치 방지).
 *
 * CSS 만으로 처리할 수 있는 표시/숨김에는 쓰지 않는다.
 * "뷰포트가 넓어지면 드로어 상태를 되돌린다"처럼 **상태를 바꿔야 할 때만** 쓴다.
 *
 * @param query 미디어 쿼리 문자열 (예: "(min-width: 1024px)")
 * @returns 현재 일치 여부
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
