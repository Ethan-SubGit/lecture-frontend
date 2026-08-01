"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { ApiError } from "@/lib/api/client";
import { fetchCurrentUser } from "@/lib/api/endpoints";
import {
  EXPIRED_REASON,
  LOGIN_PATH,
  NEXT_QUERY_KEY,
  REASON_QUERY_KEY,
} from "@/lib/constants";
import { clearAccessToken } from "@/lib/cookies";

/** 가드 진행 상태. */
type GuardStatus = "verifying" | "authorized" | "failed";

interface AuthedLayoutProps {
  children: ReactNode;
}

/**
 * 인증 라우트 그룹 레이아웃 — 2차 가드 (spec.md 4.3 결정 2-b).
 *
 * 마운트 시 `GET /users/me` 를 호출해 토큰이 실제로 유효한지 확인한다.
 * - 이 호출이 끝나기 전에는 자식을 렌더하지 않고 전체 화면 로딩을 보여준다.
 *   (만료된 토큰으로 보호 화면이 한 프레임 스치듯 보이는 현상을 막는다)
 * - 401 이면 로그아웃 처리 후 `/login?next=…&reason=expired` 로 보낸다.
 * - 네트워크 오류면 화면을 비우지 않고 [다시 시도] / [로그아웃] 을 제공한다.
 * - 결과는 인증 컨텍스트에 캐시되어 앱 셸(상단바)이 재사용한다. 라우트 전환마다 재호출하지 않는다.
 *
 * @param children 보호 대상 화면
 * @returns 검증 상태에 따른 로딩 / 에러 / 앱 셸
 */
export default function AuthedLayout({ children }: AuthedLayoutProps) {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [status, setStatus] = useState<GuardStatus>(
    // 컨텍스트에 이미 사용자가 있으면(같은 세션 내 재마운트) 재검증하지 않는다.
    user ? "authorized" : "verifying",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // React StrictMode 의 개발 모드 이중 마운트에서 /users/me 가 2번 나가지 않게 막는다.
  const hasRequestedRef = useRef(false);

  /** 세션 만료 처리: 토큰·캐시를 비우고 원래 경로를 next 로 실어 로그인으로 보낸다. */
  const redirectToLoginAsExpired = useCallback(() => {
    clearAccessToken();
    setUser(null);

    const currentPath = `${window.location.pathname}${window.location.search}`;
    const search = new URLSearchParams({
      [NEXT_QUERY_KEY]: currentPath,
      [REASON_QUERY_KEY]: EXPIRED_REASON,
    });
    router.replace(`${LOGIN_PATH}?${search.toString()}`);
  }, [router, setUser]);

  /** /users/me 를 호출해 토큰 유효성을 검증한다. */
  const verifySession = useCallback(async () => {
    setStatus("verifying");
    setErrorMessage(null);

    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      setStatus("authorized");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        // 401 은 화면에 그리지 않는다. 즉시 로그인으로 보낸다 (spec.md 6절).
        redirectToLoginAsExpired();
        return;
      }
      setErrorMessage("사용자 정보를 불러오지 못했습니다.");
      setStatus("failed");
    }
  }, [setUser, redirectToLoginAsExpired]);

  useEffect(() => {
    if (user || hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    void verifySession();
  }, [user, verifySession]);

  if (status === "verifying") {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-3 text-muted" aria-busy="true">
          <Spinner size="lg" />
          <p className="text-body">사용자 정보를 확인하는 중…</p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4">
        <AlertBanner
          tone="error"
          title={errorMessage ?? "사용자 정보를 불러오지 못했습니다."}
          className="w-full md:max-w-form"
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                onClick={() => {
                  // 재시도 시 중복 요청 가드를 풀어 다시 호출할 수 있게 한다.
                  hasRequestedRef.current = true;
                  void verifySession();
                }}
              >
                다시 시도
              </Button>
              <Button variant="ghost" onClick={redirectToLoginAsExpired}>
                로그아웃
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  // 스킵 링크·사이드바·상단바 조립은 전부 AppShell 이 책임진다.
  return <AppShell>{children}</AppShell>;
}
