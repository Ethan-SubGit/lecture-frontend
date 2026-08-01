/**
 * Next.js 설정.
 *
 * ── CORS 우회 프록시 (spec.md 9절 가정 15 / 미결사항) ─────────────────────────
 * 데이터 페칭은 전부 클라이언트 컴포넌트에서 이루어진다(spec.md 4.3 결정 4).
 * 그런데 실제 백엔드를 점검한 결과 응답에 Access-Control-Allow-Origin 헤더가 없고
 * OPTIONS 프리플라이트가 404 를 반환한다(= CORS 미설정). 이 상태로는 브라우저가
 * 직접 호출을 차단하므로, 스펙이 제시한 대체 수단인 rewrites 프록시를 준비해 둔다.
 *
 * 사용법: 환경변수 NEXT_PUBLIC_API_BASE_URL 을 `/backend-proxy` 로 두면
 * 모든 API 호출이 같은 오리진(Next.js 서버)을 거쳐 백엔드로 전달되어 CORS 가 사라진다.
 * 백엔드에 CORS 가 설정되면 이 환경변수를 백엔드 주소로 되돌리기만 하면 된다.
 *
 * 주의: 프록시 경로에도 `/api` 접두어를 붙이지 않는다.
 *       `/backend-proxy/lectures` → `http://58.239.220.254:3330/lectures`
 */

/** 프록시가 바라볼 실제 백엔드 오리진. */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://58.239.220.254:3330";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: "/backend-proxy/:path*",
        destination: `${BACKEND_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
