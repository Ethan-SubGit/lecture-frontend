import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * 그림자 계층 (design.md 4.4).
 * - card   : 일반 카드(폼·상세·통계 블록)
 * - raised : 화면의 주역. **한 화면에 최대 2개** — 남발하면 계층이 사라진다
 * 모달·드로어의 shadow-overlay 는 카드가 아니라 오버레이 컴포넌트가 직접 갖는다.
 */
const ELEVATION_CLASSES = {
  card: "shadow-card",
  raised: "shadow-raised",
} as const;

type CardElevation = keyof typeof ELEVATION_CLASSES;

interface CardProps {
  /** 렌더할 태그. 시맨틱이 필요하면 section/article 등을 넘긴다. 기본 div */
  as?: ElementType;
  /** 내부 패딩. 표를 담을 때는 'none' 으로 두어 표가 카드 모서리에 붙게 한다 */
  padding?: "none" | "md";
  /** 그림자 계층. 기본은 평범한 카드 */
  elevation?: CardElevation;
  className?: string;
  children: ReactNode;
}

/**
 * 카드 컨테이너 (design.md 4.4).
 *
 * @param as 렌더할 태그
 * @param padding 내부 패딩 프리셋
 * @param elevation 그림자 계층 프리셋
 * @param className 추가 클래스
 * @returns 카드 요소
 */
export function Card({
  as: Tag = "div",
  padding = "md",
  elevation = "card",
  className,
  children,
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-subtle bg-surface",
        ELEVATION_CLASSES[elevation],
        padding === "md" && "p-4 md:p-6",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  /** 카드 제목. 페이지 h1 아래이므로 기본 h2 로 렌더한다 */
  title: string;
  /** 제목 태그 레벨. 카드 안의 하위 블록이면 h3 를 넘긴다 */
  as?: "h2" | "h3";
  /** 제목 요소의 id. 바깥 `<section aria-labelledby>` 가 가리킬 때 넘긴다 */
  titleId?: string;
  /** 좌측 아이콘 슬롯 (h-5 w-5 인라인 SVG). 확장 분석 섹션이 쓴다 */
  icon?: ReactNode;
  /** 제목 아래 설명 1줄. "이 카드가 무슨 질문에 답하는가" */
  description?: ReactNode;
  /** 제목 **오른쪽 인라인** 배지(상세/요약). action(우측 끝)과 자리가 다르다 */
  badge?: ReactNode;
  /** 우측 액션 영역 (링크·버튼) */
  action?: ReactNode;
  className?: string;
}

/**
 * 카드 상단 제목 줄 (design.md 4.4.1).
 *
 * icon / description / badge 는 전부 선택이라 `title` 만 넘기던 기존 호출부는 그대로 동작한다.
 * ⚠️ 정렬만 `items-center` → `items-start` 로 바뀌었다 — description 이 붙어 제목 줄이
 * 2줄이 되면 세로 중앙 정렬이 어색해지기 때문이며, 설명 없는 카드는 시각 차이가 없다.
 *
 * @param title 제목 텍스트
 * @param as 제목 태그 레벨
 * @param titleId 제목 요소 id (aria-labelledby 연결용)
 * @param icon 좌측 아이콘 노드
 * @param description 제목 아래 설명
 * @param badge 제목 옆 인라인 배지
 * @param action 우측 액션 노드
 * @returns 카드 헤더 요소
 */
export function CardHeader({
  title,
  as: Heading = "h2",
  titleId,
  icon,
  description,
  badge,
  action,
  className,
}: CardHeaderProps) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-sunken text-secondary md:h-10 md:w-10"
          >
            {icon}
          </span>
        ) : null}

        <div className="min-w-0">
          {/* 배지는 제목과 같은 줄에 두되, 좁은 화면에서는 flex-wrap 으로 아래로 내려간다. */}
          <div className="flex flex-wrap items-center gap-2">
            <Heading id={titleId} className="text-section font-semibold text-primary">
              {title}
            </Heading>
            {badge}
          </div>
          {description ? (
            <p className="mt-1 text-caption text-muted">{description}</p>
          ) : null}
        </div>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
