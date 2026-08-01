import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

/**
 * 모든 클릭 액션의 단일 진입점 (design.md 4.1).
 *
 * variant/size 유니온으로만 조합을 표현한다. isPrimary 같은 boolean prop 을 늘리지 않는다.
 * `href` 를 주면 <Link>, 없으면 <button> 으로 렌더된다.
 */

/** variant/size 조합을 cva 로 정의한다. JSX 안에 조건부 문자열을 흩뿌리지 않기 위함이다. */
const buttonVariants = cva(
  // base — 모든 버튼 공통. focus-ring 은 globals.css 의 단일 정의를 쓴다.
  "inline-flex items-center justify-center gap-2 rounded font-medium text-body whitespace-nowrap select-none transition-colors duration-fast ease-standard focus-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-active",
        secondary:
          "bg-surface text-primary border border-strong hover:bg-surface-hover active:bg-surface-sunken",
        ghost:
          "bg-transparent text-secondary hover:bg-surface-hover hover:text-primary active:bg-surface-sunken",
        danger: "bg-danger text-on-danger hover:bg-danger-hover active:bg-danger-hover",
        link: "text-accent underline underline-offset-2 px-0 hover:text-accent-hover",
      },
      size: {
        // 모바일에서는 어떤 크기도 44px(min-h-touch) 아래로 내려가지 않는다.
        sm: "min-h-touch px-3 md:min-h-0 md:h-control-dense md:text-caption",
        md: "min-h-touch px-4 md:h-control-dense",
        lg: "min-h-touch h-control px-5 text-body",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
      fullWidth: false,
    },
  },
);

/** cva 가 만들어내는 variant prop 타입에서 fullWidth 는 boolean 으로 다시 노출한다. */
type ButtonVariantProps = Omit<VariantProps<typeof buttonVariants>, "fullWidth">;

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">,
    ButtonVariantProps {
  /** 제출 버튼 여부. 기본은 button (의도치 않은 폼 제출 방지) */
  type?: "button" | "submit";
  /** 로딩 중이면 스피너를 띄우고 비활성화한다. 라벨은 유지해 폭이 흔들리지 않게 한다 */
  loading?: boolean;
  /** 모바일 주 액션에서 자주 쓰는 100% 폭 */
  fullWidth?: boolean;
  /** 라벨 좌/우 아이콘 */
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** 값이 있으면 next/link 의 <Link> 로 렌더한다 */
  href?: string;
  children: ReactNode;
}

/**
 * 버튼 / 링크 버튼.
 *
 * 모달의 초기 포커스 지정 등을 위해 ref 를 버튼 요소로 전달한다(forwardRef).
 *
 * @param variant 시각적 역할 (primary/secondary/ghost/danger/link)
 * @param size 크기 프리셋 (sm/md/lg)
 * @param loading 로딩 상태. true 면 자동으로 disabled + aria-busy
 * @param fullWidth 100% 폭 여부
 * @param iconLeft/iconRight 라벨 좌우 아이콘. loading 중에는 iconLeft 가 스피너로 대체된다
 * @param href 있으면 <Link> 로 렌더 (loading/disabled 는 무시된다)
 * @returns 버튼 또는 링크 요소
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    loading = false,
    fullWidth = false,
    iconLeft,
    iconRight,
    href,
    className,
    disabled,
    type = "button",
    children,
    ...rest
  },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className);

  // 링크 버튼은 로딩/비활성 개념이 없다. 비활성이 필요하면 호출부가 렌더 자체를 막는다.
  if (href) {
    return (
      <Link href={href} className={classes}>
        {iconLeft}
        {children}
        {iconRight}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      // 로딩 중에는 중복 제출을 원천 차단한다.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : iconLeft}
      {children}
      {iconRight}
    </button>
  );
});
