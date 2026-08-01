import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  LOGIN_PATH,
  NEXT_QUERY_KEY,
} from "@/lib/constants";

/**
 * 1차 라우트 가드 (spec.md 4.3 결정 2-a).
 *
 * 서버에서 실행되며 쿠키 `access_token` 의 **존재 여부만** 확인한다.
 * - 서명 검증은 하지 않는다: 미들웨어에 비밀키가 없고, 최종 권한 판정은 백엔드 401 이 한다.
 * - 토큰이 없으면 보호 화면의 DOM 이 한 프레임도 렌더되기 전에 307 로 로그인으로 보낸다.
 * - 실제 유효성 검증은 2차 가드(인증 레이아웃의 GET /users/me)가 담당한다.
 *
 * @param request 들어온 요청
 * @returns 리다이렉트 또는 통과 응답
 */
export function middleware(request: NextRequest): NextResponse {
  const hasToken = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);

  if (hasToken) return NextResponse.next();

  // 로그인 후 원래 가려던 경로로 복귀시키기 위해 pathname + search 를 next 에 실어 보낸다.
  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set(NEXT_QUERY_KEY, `${pathname}${search}`);

  return NextResponse.redirect(loginUrl, 307);
}

/**
 * 미들웨어 적용 대상.
 *
 * 보호가 필요한 경로만 나열한다. `/` 와 `/login` 은 공개이므로 제외한다.
 * (`/` 는 클라이언트에서 토큰 유무를 보고 분기하는 진입 리다이렉터다.)
 * 정적 자원(_next, favicon 등)은 매처에 포함되지 않아 자동으로 통과한다.
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/lectures/:path*",
    "/scores/:path*",
    "/departments/:path*",
    "/grade-scales/:path*",
  ],
};
