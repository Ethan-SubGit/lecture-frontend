import { DEFAULT_AUTHED_PATH } from "./constants";

/**
 * 리다이렉트 경로 안전성 검사 유틸.
 * 오픈 리다이렉트(외부 사이트로 튕기는 공격)를 막는 단일 지점이다.
 */

/**
 * `next` 쿼리 값이 안전한 내부 경로인지 판정한다.
 *
 * 허용 조건 (spec.md 4.3 결정 3):
 * - `/` 로 시작한다 (절대 URL, 상대 경로 모두 배제)
 * - `//` 로 시작하지 않는다 (`//evil.com` 은 프로토콜 상대 URL 이라 외부로 나간다)
 * - `/\` 로 시작하지 않는다 (일부 브라우저가 `\` 를 `/` 로 정규화해 우회가 가능하다)
 *
 * @param next 검사할 경로 문자열
 * @returns 내부 경로로 사용해도 안전하면 true
 */
export function isSafeInternalPath(next: string | null | undefined): boolean {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.startsWith("/\\")) return false;
  return true;
}

/**
 * 로그인 성공 후 이동할 경로를 결정한다.
 *
 * @param next URL 의 next 쿼리 값
 * @returns 안전한 내부 경로면 그대로, 아니면 기본 경로(/dashboard)
 */
export function resolveNextPath(next: string | null | undefined): string {
  return isSafeInternalPath(next) ? (next as string) : DEFAULT_AUTHED_PATH;
}
