import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  /** 페이지 제목. 화면당 유일한 <h1> 이다 */
  title: string;
  /** 부제 설명 */
  description?: string;
  /** 우측 액션 영역. 모바일에서는 아래로 내려가 전체폭이 된다 */
  actions?: ReactNode;
  /** 상위 목록으로 돌아가는 링크 경로 */
  backHref?: string;
  /** 돌아가기 링크의 라벨 */
  backLabel?: string;
}

/**
 * 페이지 상단 제목 영역 (design.md 4.3).
 *
 * 모바일은 세로 스택(액션 풀폭), md 이상은 좌우 배치다.
 *
 * @param title 제목
 * @param description 설명
 * @param actions 액션 노드
 * @param backHref 뒤로가기 링크 경로
 * @param backLabel 뒤로가기 링크 라벨 (기본 "목록으로")
 * @returns 페이지 헤더 요소
 */
export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "목록으로",
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {backHref ? (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center rounded text-caption text-accent underline underline-offset-2 hover:text-accent-hover focus-ring"
          >
            <span aria-hidden="true">←&nbsp;</span>
            {backLabel}
          </Link>
        ) : null}
        <h1 className="text-display font-bold text-primary lg:text-display-lg">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-caption text-muted md:text-body">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-col gap-2 sm:flex-row md:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
