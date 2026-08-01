import { ACCESS_TOKEN_COOKIE } from "./constants";

/**
 * 토큰 쿠키 읽기/쓰기/삭제 유틸 (브라우저 전용).
 *
 * spec.md 4.3 결정 1 —
 * 토큰은 JS 접근 가능한 쿠키(`access_token`, Path=/, SameSite=Lax, 세션 쿠키)에 둔다.
 * · 쿠키여야 하는 이유: Next.js middleware 는 서버에서 실행되어 localStorage 를 볼 수 없다.
 * · HttpOnly 가 아닌 이유: 클라이언트 JS 가 Authorization 헤더를 직접 붙여야 한다.
 * XSS 노출을 인지하고 채택한 트레이드오프이며, 완화책으로 dangerouslySetInnerHTML 과
 * 서드파티 스크립트를 쓰지 않는다.
 */

/**
 * 문서 쿠키에서 특정 이름의 값을 읽는다.
 * 서버(SSR) 환경에서는 document 가 없으므로 null 을 반환한다.
 *
 * @param name 쿠키 이름
 * @returns 디코딩된 쿠키 값. 없으면 null
 */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const entries = document.cookie ? document.cookie.split("; ") : [];
  for (const entry of entries) {
    // 값 안에 '=' 가 들어갈 수 있으므로 첫 '=' 만 기준으로 자른다.
    const separatorIndex = entry.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = entry.slice(0, separatorIndex);
    if (key === name) {
      return decodeURIComponent(entry.slice(separatorIndex + 1));
    }
  }
  return null;
}

/**
 * 저장된 액세스 토큰을 읽는다.
 * @returns JWT 문자열. 없으면 null
 */
export function getAccessToken(): string | null {
  return readCookie(ACCESS_TOKEN_COOKIE);
}

/**
 * 액세스 토큰을 세션 쿠키로 저장한다.
 * Expires/Max-Age 를 주지 않아 브라우저를 닫으면 사라지게 한다(세션 쿠키).
 *
 * @param token 로그인 응답의 accessToken
 */
export function setAccessToken(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
}

/**
 * 액세스 토큰 쿠키를 삭제한다.
 * 과거 시각의 Expires 를 지정해 브라우저가 즉시 폐기하도록 한다.
 */
export function clearAccessToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
