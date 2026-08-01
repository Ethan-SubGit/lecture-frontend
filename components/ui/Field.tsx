import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  /** 라벨 텍스트 */
  label: string;
  /** 연결할 입력 요소의 id. 에러 메시지 id 도 이 값에서 파생된다 */
  htmlFor: string;
  /** 필수 입력 여부. `*` 기호 + sr-only "(필수)" 로 이중 표기한다 */
  required?: boolean;
  /** 보조 설명 */
  hint?: string;
  /** 검증 실패 메시지. 있으면 role="alert" 로 즉시 알린다 */
  error?: string;
  className?: string;
  children: ReactNode;
}

/**
 * 에러 메시지 요소의 id 를 만든다.
 * 입력의 aria-describedby 와 메시지의 id 가 어긋나지 않도록 단일 규칙으로 통일한다.
 *
 * @param inputId 입력 요소 id
 * @returns 에러 메시지 요소 id
 */
export function errorMessageId(inputId: string): string {
  return `${inputId}-error`;
}

/**
 * 폼 필드 래퍼 — 라벨 / 입력 / 힌트 / 에러를 한 덩어리로 묶는다 (design.md 4.7).
 *
 * 필수 표시와 에러를 색·기호 단독이 아니라 텍스트로도 전달한다.
 *
 * @param label 라벨 텍스트
 * @param htmlFor 입력 id
 * @param required 필수 여부
 * @param hint 보조 설명
 * @param error 검증 실패 메시지
 * @param children 입력 요소
 * @returns 필드 블록
 */
export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-caption font-medium text-secondary"
      >
        {label}
        {required ? (
          <>
            {/* 시각 단서(*)와 스크린리더 단서("(필수)")를 함께 제공한다. */}
            <span className="text-danger" aria-hidden="true">
              {" *"}
            </span>
            <span className="sr-only"> (필수)</span>
          </>
        ) : null}
      </label>

      {children}

      {hint && !error ? (
        <p className="text-caption text-muted">{hint}</p>
      ) : null}

      {error ? (
        <p
          id={errorMessageId(htmlFor)}
          role="alert"
          className="flex items-start gap-1 text-caption text-danger-strong"
        >
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
