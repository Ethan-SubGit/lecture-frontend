import {
  DEFAULT_AUTHED_PATH,
  LOGIN_PATH,
  NETWORK_ERROR_MESSAGE,
  NEXT_QUERY_KEY,
  REASON_QUERY_KEY,
  EXPIRED_REASON,
} from "@/lib/constants";
import { clearAccessToken, getAccessToken } from "@/lib/cookies";

/**
 * 중앙 fetch 래퍼 (spec.md 4.3 결정 3).
 *
 * 모든 API 호출이 이 파일 하나를 거친다. 여기서만 처리하는 것:
 * 1) Base URL 결합 — 환경변수 NEXT_PUBLIC_API_BASE_URL (기본 `/backend-proxy`).
 *    실제 엔드포인트에는 `/api` 접두어가 없다. 절대 붙이지 않는다.
 * 2) Authorization: Bearer <token> 자동 첨부
 * 3) 401 단일 처리 — 토큰 삭제 + 로그인 화면 이동(중복 리다이렉트 억제)
 * 4) 204(No Content) 는 .json() 을 호출하지 않고 undefined 반환
 * 5) 네트워크 실패/에러 응답을 ApiError 로 정규화
 */

/**
 * API Base URL. 끝의 슬래시를 제거해 경로 결합 시 `//` 가 생기지 않게 한다.
 *
 * 기본값을 백엔드 주소가 아니라 `/backend-proxy`(next.config.mjs 의 rewrites)로 둔다.
 * 백엔드는 CORS 가 없고(OPTIONS 프리플라이트 404 확인됨) HTTP 이므로, HTTPS 로 배포되는
 * 환경(Vercel 등)에서 브라우저가 직접 호출을 CORS 차단 + mixed content 차단 이중으로 막는다.
 * `.env.local.example` 은 이 프록시 경로를 기본값으로 안내하지만, 배포 환경에는
 * `.env.local` 파일 자체가 올라가지 않으므로(.gitignore) 환경변수를 따로 설정하지 않으면
 * 이 fallback 값이 그대로 쓰인다 — 그래서 fallback 도 프록시를 가리켜야 한다.
 */
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend-proxy"
).replace(/\/+$/, "");

/**
 * API 호출 실패를 표현하는 에러.
 * status 0 은 "네트워크 자체가 실패(fetch reject)" 를 의미하며 서버 응답이 없는 경우다.
 */
export class ApiError extends Error {
  /** HTTP 상태 코드. fetch 자체가 실패했으면 0. */
  readonly status: number;
  /** 서버가 준 원본 에러 본문 (형식이 확정되지 않아 unknown 으로 둔다). */
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** 서버 응답 없이 네트워크 계층에서 실패했는지. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/** requestJson 옵션. body 직렬화 방식을 호출자가 고르게 한다. */
interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** JSON 으로 직렬화해 보낼 본문. formData 와 동시에 쓰지 않는다. */
  json?: unknown;
  /** multipart/form-data 로 보낼 본문. Content-Type 을 직접 지정하지 않는다. */
  formData?: FormData;
  /** 쿼리 파라미터. undefined/null/빈 문자열 값은 전송하지 않는다. */
  query?: Record<string, string | number | undefined | null>;
  /**
   * 401 을 받아도 전역 로그아웃 리다이렉트를 하지 않는다.
   * 로그인 요청(POST /auth/login) 자체의 401 은 "자격증명 오류"이므로 화면에서 처리해야 한다.
   */
  skipAuthRedirect?: boolean;
}

/**
 * 401 로 인한 로그인 리다이렉트가 이미 시작되었는지 표시하는 플래그.
 * 여러 요청이 동시에 401 을 받아도 리다이렉트를 1회로 억제한다 (spec.md 4.3 결정 3).
 */
let isRedirectingToLogin = false;

/**
 * 쿼리 객체를 쿼리스트링으로 만든다.
 * 값이 undefined / null / 빈 문자열이면 파라미터 자체를 생략한다.
 * (빈 문자열로 부분검색을 보내면 서버 동작이 보장되지 않기 때문 — spec.md 5.3)
 *
 * @param query 쿼리 파라미터 객체
 * @returns "?a=1&b=2" 형태의 문자열. 보낼 파라미터가 없으면 빈 문자열
 */
function buildQueryString(
  query?: Record<string, string | number | undefined | null>,
): string {
  if (!query) return "";

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

/**
 * 에러 응답 본문에서 사용자에게 보여줄 메시지를 뽑는다.
 *
 * NestJS 기본 형식({ statusCode, message, error })을 가정하되,
 * message 가 배열(class-validator 다중 메시지)이면 첫 항목을 쓴다 (spec.md 가정 14).
 *
 * @param body 파싱된 에러 응답 본문
 * @param fallback 메시지를 못 찾았을 때 사용할 기본 문구
 * @returns 표시용 메시지
 */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== "object" || body === null) return fallback;

  const message = (body as { message?: unknown }).message;
  if (typeof message === "string" && message.trim() !== "") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];

  return fallback;
}

/**
 * 401 을 받았을 때의 전역 처리.
 * 토큰을 지우고 현재 경로를 next 로 실어 로그인 화면으로 보낸다.
 * 컨텍스트 초기화는 로그인 화면으로의 하드 내비게이션(location.replace)으로 함께 이루어진다.
 */
function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  // 이미 리다이렉트가 진행 중이면 중복 이동을 막는다.
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;

  clearAccessToken();

  const currentPath = `${window.location.pathname}${window.location.search}`;
  // 로그인 화면에서 401 이 났다면 next 로 자기 자신을 넣지 않는다(루프 방지).
  const nextPath = currentPath.startsWith(LOGIN_PATH)
    ? DEFAULT_AUTHED_PATH
    : currentPath;

  const search = new URLSearchParams({
    [NEXT_QUERY_KEY]: nextPath,
    [REASON_QUERY_KEY]: EXPIRED_REASON,
  });

  // replace 로 이동해 뒤로가기로 보호 화면에 되돌아갈 수 없게 한다.
  window.location.replace(`${LOGIN_PATH}?${search.toString()}`);
}

/**
 * API 요청을 수행하고 JSON 본문을 반환한다.
 *
 * @typeParam T 기대하는 성공 응답 타입
 * @param path `/lectures` 처럼 슬래시로 시작하는 엔드포인트 경로 (`/api` 접두어 없음)
 * @param options 메서드·본문·쿼리·401 처리 옵션
 * @returns 파싱된 응답 본문. 204 No Content 이면 undefined
 * @throws {ApiError} 네트워크 실패 또는 2xx 가 아닌 응답
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", json, formData, query, skipAuthRedirect } = options;

  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (formData) {
    // multipart 는 Content-Type 을 직접 지정하지 않는다.
    // FormData 를 그대로 넘기면 브라우저가 boundary 를 포함해 자동 설정한다 (spec.md 5.2).
    body = formData;
  } else if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }

  const url = `${API_BASE_URL}${path}${buildQueryString(query)}`;

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body });
  } catch {
    // fetch 자체가 reject 되는 경우: 네트워크 단절, CORS 차단, DNS 실패 등.
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  if (response.status === 401 && !skipAuthRedirect) {
    handleUnauthorized();
    // 화면이 401 에러를 그리지 않도록(spec.md 6절) 던지되, 호출부는 리다이렉트로 언마운트된다.
    throw new ApiError(401, "인증이 만료되었습니다.");
  }

  // 204 는 본문이 없다. .json() 을 호출하면 파싱 에러가 난다 (spec.md 5.1).
  if (response.status === 204) {
    return undefined as T;
  }

  // 에러 본문이 JSON 이 아닐 수도 있으므로 파싱 실패를 흡수한다.
  const rawText = await response.text();
  let parsed: unknown = undefined;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(parsed, NETWORK_ERROR_MESSAGE),
      parsed,
    );
  }

  return parsed as T;
}
