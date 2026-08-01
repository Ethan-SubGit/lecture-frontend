import { Badge, type BadgeTone } from "@/components/ui/Badge";

/** 1위 / 2·3위 / 그 외의 경계값. 매직 넘버를 조건식에 흩뿌리지 않는다. */
const FIRST_RANK = 1;
const PODIUM_LAST_RANK = 3;

interface RankBadgeProps {
  /** 서버가 준 순위(SQL RANK). 클라이언트가 다시 매기지 않는다 */
  rank: number;
}

/**
 * 순위 배지 (design.md 4.28.1).
 *
 * **숫자가 항상 1차 단서**다. 왕관·메달 글리프를 쓰지 않는다 —
 * 글리프가 순위를 대체하면 4위 이하와 표현 문법이 갈라진다.
 * 동점으로 순위가 건너뛰어도(1, 2, 2, 4) 응답값을 그대로 표시한다.
 *
 * @param rank 순위
 * @returns 순위 배지
 */
export function RankBadge({ rank }: RankBadgeProps) {
  const tone: BadgeTone =
    rank === FIRST_RANK ? "success" : rank <= PODIUM_LAST_RANK ? "accent" : "neutral";

  return (
    <Badge tone={tone} className="min-w-touch justify-center tabular-nums">
      <span className="sr-only">순위 </span>
      {rank}
      <span className="sr-only">위</span>
    </Badge>
  );
}
