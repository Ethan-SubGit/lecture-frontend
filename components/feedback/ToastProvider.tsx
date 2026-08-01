"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { TOAST_AUTO_DISMISS_MS } from "@/lib/constants";

/**
 * 토스트 알림 컨텍스트 + 뷰포트 (design.md 4.10).
 *
 * 규칙:
 * - success/info 는 3초 후 자동 소멸, error 는 자동 소멸 없이 수동 닫기.
 * - 동시에 최대 3개까지만 표시하고 초과하면 가장 오래된 것부터 제거한다.
 */

/** 토스트 톤. */
export type ToastTone = "success" | "error" | "info";

/** 화면에 떠 있는 토스트 1건. */
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

/** showToast 호출 시 넘기는 값 (id 는 내부에서 발급). */
type ToastInput = Omit<ToastItem, "id">;

interface ToastContextValue {
  /** 토스트를 띄운다. */
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** 동시에 표시할 토스트 최대 개수. */
const MAX_VISIBLE_TOASTS = 3;

/** 톤별 글리프와 테두리 색. 색 외 단서로 아이콘을 병행한다. */
const TONE_STYLES: Record<ToastTone, { icon: string; border: string; text: string }> = {
  success: { icon: "✓", border: "border-success", text: "text-success" },
  error: { icon: "✕", border: "border-danger", text: "text-danger" },
  info: { icon: "ⓘ", border: "border-accent", text: "text-accent" },
};

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * 토스트 상태를 보관하고 뷰포트를 렌더하는 프로바이더.
 * 앱 루트 레이아웃에 한 번만 마운트한다.
 *
 * @param children 하위 트리
 * @returns 컨텍스트 프로바이더 + 토스트 뷰포트
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // id 발급용 카운터. 렌더와 무관한 값이라 ref 로 둔다.
  const nextIdRef = useRef(0);

  /** id 로 토스트 1건을 제거한다. */
  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = nextIdRef.current++;

      setToasts((current) => {
        const appended = [...current, { ...input, id }];
        // 최대 개수를 넘으면 앞(가장 오래된)에서 잘라낸다.
        return appended.slice(-MAX_VISIBLE_TOASTS);
      });

      // 에러는 사용자가 읽고 직접 닫아야 하므로 자동 소멸시키지 않는다.
      if (input.tone !== "error") {
        window.setTimeout(() => dismissToast(id), TOAST_AUTO_DISMISS_MS);
      }
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        role="region"
        aria-label="알림"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col gap-2 p-4 md:inset-x-auto md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-toast"
      >
        {toasts.map((toast) => {
          const style = TONE_STYLES[toast.tone];
          return (
            <div
              key={toast.id}
              // 에러만 즉시 읽어준다. 성공/정보는 진행을 방해하지 않는 status 로 알린다.
              role={toast.tone === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border bg-surface-raised p-4 shadow-raised animate-toast-in",
                style.border,
              )}
            >
              <span aria-hidden="true" className={cn("font-semibold", style.text)}>
                {style.icon}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold text-primary">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-caption text-secondary">
                    {toast.description}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="알림 닫기"
                className="-m-1 ml-auto inline-flex min-h-touch min-w-touch items-center justify-center rounded text-secondary focus-ring"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * 토스트를 띄우는 훅.
 *
 * @returns showToast 함수
 * @throws ToastProvider 밖에서 호출하면 에러 (설정 실수를 조용히 넘기지 않는다)
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast 는 ToastProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}
