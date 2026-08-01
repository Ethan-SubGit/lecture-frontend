import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind 클래스 문자열을 조건부로 조합하고 충돌을 정리한다.
 *
 * clsx 로 조건부 값을 평탄화한 뒤 tailwind-merge 로 뒤에 온 클래스가
 * 앞의 같은 속성 클래스를 덮어쓰게 만든다. (예: "px-3" + "px-4" → "px-4")
 * 컴포넌트마다 문자열 연결 로직을 반복하지 않기 위한 단일 진입점이다.
 *
 * @param inputs 문자열 / 객체 / 배열 형태의 클래스 값들
 * @returns 병합·정리된 클래스 문자열
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
