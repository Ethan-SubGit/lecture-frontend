import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { errorMessageId } from "./Field";

/**
 * 입력 요소 공통 base 클래스 (design.md 4.7).
 *
 * text-body(16px) 고정 — md 이상에서도 줄이지 않는다.
 * iOS 가 16px 미만 입력에 포커스하면 화면을 자동 확대하기 때문이다.
 */
const INPUT_BASE =
  "w-full rounded border border-strong bg-surface px-3 text-body text-primary placeholder-muted min-h-touch transition-colors duration-fast focus-ring hover:border-accent focus:border-accent disabled:bg-surface-sunken disabled:text-muted disabled:cursor-not-allowed read-only:bg-surface-sunken read-only:text-secondary";

/** 에러 상태 테두리. 메시지·아이콘과 함께 3중 단서를 이룬다. */
const INPUT_ERROR = "border-danger";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 입력 요소 id. Field 의 htmlFor 와 반드시 같은 값을 넘긴다 */
  id: string;
  /** 검증 실패 여부. true 면 aria-invalid 와 에러 테두리를 적용한다 */
  invalid?: boolean;
}

/**
 * 텍스트 입력.
 *
 * 검증 실패 시 첫 에러 필드로 포커스를 옮겨야 하므로 ref 를 전달한다(forwardRef).
 *
 * @param id 입력 id (Field 와 연결)
 * @param invalid 검증 실패 여부
 * @returns input 요소
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ id, invalid, className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        id={id}
        className={cn(INPUT_BASE, invalid && INPUT_ERROR, className)}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorMessageId(id) : undefined}
        {...rest}
      />
    );
  },
);

interface NumberInputProps extends Omit<TextInputProps, "type"> {
  /** 허용 최소값. 점수 0, gpa 0 등 도메인 제약을 반드시 지정한다 */
  min: number;
  /** 허용 최대값 */
  max: number;
}

/**
 * 숫자 입력.
 *
 * inputMode="numeric" 으로 모바일 숫자 키패드를 띄우고,
 * 자릿수 정렬을 위해 tabular-nums + 우측 정렬을 적용한다.
 *
 * @param id 입력 id
 * @param min/max 허용 범위 (필수)
 * @param invalid 검증 실패 여부
 * @returns number 타입 input 요소
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput({ id, min, max, invalid, className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        className={cn(
          INPUT_BASE,
          "text-right tabular-nums",
          invalid && INPUT_ERROR,
          className,
        )}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorMessageId(id) : undefined}
        {...rest}
      />
    );
  },
);

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** select 요소 id */
  id: string;
  /** 검증 실패 여부 */
  invalid?: boolean;
}

/**
 * 셀렉트 박스.
 *
 * 네이티브 <select> 를 쓴다 — 모바일에서 OS 피커가 가장 나은 경험이기 때문이다.
 * 화살표만 커스텀(appearance-none + 우측 글리프)하고 나머지는 브라우저에 맡긴다.
 *
 * @param id select id
 * @param invalid 검증 실패 여부
 * @returns 화살표가 겹쳐진 select 요소
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, invalid, className, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        id={id}
        className={cn(
          INPUT_BASE,
          "appearance-none pr-10",
          invalid && INPUT_ERROR,
          className,
        )}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorMessageId(id) : undefined}
        {...rest}
      >
        {children}
      </select>
      {/* 화살표는 장식이며 클릭이 select 로 전달되도록 pointer-events 를 끈다. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      >
        ▾
      </span>
    </div>
  );
});
