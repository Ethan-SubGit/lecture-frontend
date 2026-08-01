"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/Input";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/endpoints";
import {
  DEFAULT_AUTHED_PATH,
  EXPIRED_REASON,
  NETWORK_ERROR_MESSAGE,
  NEXT_QUERY_KEY,
  REASON_QUERY_KEY,
} from "@/lib/constants";
import { getAccessToken } from "@/lib/cookies";
import { resolveNextPath } from "@/lib/navigation";

/** 자격증명 오류(401) 시 표시할 문구. */
const INVALID_CREDENTIALS_MESSAGE = "로그인 ID 또는 비밀번호가 올바르지 않습니다.";

/** 폼 필드 검증 결과. 비어 있으면 검증 통과다. */
interface LoginFieldErrors {
  loginId?: string;
  password?: string;
}

/**
 * 로그인 화면 (`/login`).
 *
 * useSearchParams 를 쓰므로 Suspense 경계로 감싼다(Next.js App Router 요구사항).
 *
 * @returns 로그인 화면
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

/**
 * 로그인 폼 본체 (design.md 4.19).
 *
 * - 앱 셸(사이드바·상단바)을 렌더하지 않는다 (인증 라우트 그룹 밖이므로 자연히 렌더되지 않는다).
 * - 이미 로그인한 상태로 접근하면 /dashboard 로 되돌린다.
 * - 401 은 폼 하단 배너 + 비밀번호만 초기화 후 포커스 이동.
 * - reason=expired 로 진입하면 폼 위에 세션 만료 안내를 띄운다.
 *
 * @returns 로그인 카드
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // 로그인 성공 후 이동할 경로. 외부 도메인으로 튕기지 않도록 내부 경로만 허용한다.
  const nextPath = resolveNextPath(searchParams.get(NEXT_QUERY_KEY));
  const isExpiredSession = searchParams.get(REASON_QUERY_KEY) === EXPIRED_REASON;

  // 이미 토큰이 있는 상태로 로그인 화면에 접근하면 대시보드로 되돌린다.
  useEffect(() => {
    // 세션 만료로 온 경우에는 쿠키가 이미 삭제되었으므로 이 분기에 걸리지 않는다.
    if (getAccessToken()) router.replace(DEFAULT_AUTHED_PATH);
  }, [router]);

  /**
   * 필수 입력값을 검증한다.
   * @returns 필드별 에러 객체. 비어 있으면 통과
   */
  function validate(): LoginFieldErrors {
    const errors: LoginFieldErrors = {};
    if (!loginId.trim()) errors.loginId = "필수 입력입니다.";
    if (!password) errors.password = "필수 입력입니다.";
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      // 첫 번째 에러 필드로 포커스를 옮긴다 (design.md 6.3).
      if (errors.loginId) loginIdRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await login({ loginId: loginId.trim(), password });
      signIn(response.accessToken);
      // 쿠키가 심어진 뒤 미들웨어가 통과시키도록 replace 로 이동한다.
      router.replace(nextPath);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        // 자격증명 오류: loginId 는 유지하고 비밀번호만 비운 뒤 그 필드로 포커스한다.
        setSubmitError(INVALID_CREDENTIALS_MESSAGE);
        setPassword("");
        passwordRef.current?.focus();
      } else {
        setSubmitError(NETWORK_ERROR_MESSAGE);
      }
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <div className="w-full rounded-xl border border-subtle bg-surface p-6 shadow-card md:max-w-auth md:p-8">
        <h1 className="text-center text-title font-bold text-primary">성적관리</h1>
        <p className="mt-1 text-center text-caption text-muted">학사 담당자 전용</p>

        {isExpiredSession ? (
          <AlertBanner
            tone="info"
            title="세션이 만료되었습니다. 다시 로그인해 주세요."
            className="mt-6"
          />
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {/* 제출 중에는 fieldset 으로 폼 전체를 한 번에 잠근다. */}
          <fieldset disabled={isSubmitting} className="space-y-4">
            <Field label="로그인 ID" htmlFor="loginId" required error={fieldErrors.loginId}>
              <TextInput
                ref={loginIdRef}
                id="loginId"
                name="loginId"
                autoComplete="username"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                invalid={Boolean(fieldErrors.loginId)}
                required
              />
            </Field>

            <Field label="비밀번호" htmlFor="password" required error={fieldErrors.password}>
              <TextInput
                ref={passwordRef}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                invalid={Boolean(fieldErrors.password)}
                required
              />
            </Field>

            <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
              로그인
            </Button>
          </fieldset>
        </form>

        {/* 401/네트워크 오류는 폼 하단 배너로 표시한다 (design.md 4.19). */}
        {submitError ? (
          <AlertBanner tone="error" title={submitError} className="mt-4" />
        ) : null}
      </div>
    </main>
  );
}
