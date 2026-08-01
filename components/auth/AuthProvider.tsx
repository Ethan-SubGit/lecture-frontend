"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearAccessToken, setAccessToken } from "@/lib/cookies";
import { LOGIN_PATH } from "@/lib/constants";
import type { User } from "@/types/api";

/**
 * 인증 컨텍스트.
 *
 * `GET /users/me` 결과를 앱 전역에 캐시해 상단바 등이 재사용하게 한다.
 * 화면 전환마다 다시 호출하지 않는다 (spec.md 가정 17 — 레이아웃 마운트당 1회).
 */

interface AuthContextValue {
  /** 현재 로그인 사용자. 검증 전이거나 로그아웃 상태면 null */
  user: User | null;
  /** 인증 레이아웃이 /users/me 결과를 컨텍스트에 심을 때 사용 */
  setUser: (user: User | null) => void;
  /** 로그인 성공 시 토큰 저장 + 사용자 캐시 */
  signIn: (token: string) => void;
  /** 로그아웃: 토큰 삭제 + 캐시 초기화 + 로그인 화면 이동 */
  signOut: () => void;
  /** 상단바·드로어에 표시할 이름. name 이 비어 있으면 loginId 로 대체된다 */
  displayName: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 인증 상태 프로바이더. 루트 레이아웃에 한 번만 마운트한다.
 *
 * @param children 하위 트리
 * @returns 컨텍스트 프로바이더
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  /** 로그인 직후 토큰을 쿠키에 심는다. 사용자 정보는 인증 레이아웃이 /users/me 로 채운다. */
  const signIn = useCallback((token: string) => {
    setAccessToken(token);
  }, []);

  const signOut = useCallback(() => {
    clearAccessToken();
    setUser(null);

    // replace 로 이동해 뒤로가기로 보호 화면 내용을 다시 볼 수 없게 한다.
    router.replace(LOGIN_PATH);
    // 캐시된 서버 컴포넌트 트리를 비워 로그아웃 전 화면이 남지 않도록 한다.
    router.refresh();
  }, [router]);

  const value = useMemo<AuthContextValue>(() => {
    // User.name 은 스키마상 non-null 이지만 빈 문자열 방어를 위해 loginId 로 폴백한다.
    const displayName = user ? user.name?.trim() || user.loginId : null;
    return { user, setUser, signIn, signOut, displayName };
  }, [user, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 인증 컨텍스트를 읽는 훅.
 *
 * @returns 사용자 정보와 로그인/로그아웃 함수
 * @throws AuthProvider 밖에서 호출하면 에러
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth 는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}
