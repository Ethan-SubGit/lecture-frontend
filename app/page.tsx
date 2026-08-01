"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DEFAULT_AUTHED_PATH, LOGIN_PATH } from "@/lib/constants";
import { getAccessToken } from "@/lib/cookies";
import { Spinner } from "@/components/ui/Spinner";

/**
 * 진입 리다이렉터 (`/`).
 *
 * 토큰 쿠키 유무만 보고 즉시 분기한다. 토큰이 유효한지는 여기서 검사하지 않는다
 * — 유효성 판정은 인증 레이아웃의 GET /users/me(2차 가드)가 담당한다.
 * 쿠키는 브라우저에서만 읽을 수 있으므로 클라이언트 컴포넌트로 둔다.
 *
 * @returns 이동 중 전체화면 로딩 표시
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const hasToken = Boolean(getAccessToken());
    // replace 로 이동해 뒤로가기 시 이 리다이렉터로 되돌아오지 않게 한다.
    router.replace(hasToken ? DEFAULT_AUTHED_PATH : LOGIN_PATH);
  }, [router]);

  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-3 text-muted">
        <Spinner size="lg" />
        <p className="text-body">이동 중…</p>
      </div>
    </div>
  );
}
