/**
 * "형태(차트) / 값(목록)" 2분할 카드의 공통 레이아웃 클래스 (design.md 4.15.0 · 4.22).
 *
 * 등급 분포 카드와 점수 구간 분포 카드가 **의도적으로 같은 2분할 문법**을 쓴다.
 * 두 카드가 나란히 놓여 "A가 많다"와 "90점대가 많다"가 서로를 설명해야 하므로,
 * 클래스 문자열을 각자 갖게 두면 언젠가 한쪽만 바뀌어 문법이 갈라진다.
 */

/**
 * 2분할 그리드. `<lg` 세로 스택(차트 위 / 목록 아래) → `lg` 좌우 절반.
 * `lg:items-center` 는 항목이 적어 목록이 짧아졌을 때 차트와 높이가 어긋나는 것을 보정한다.
 * (`md` 에서 좌우로 쪼개지 않는 이유: 반쪽 폭이 ≈330px 이라 가로 막대가 찌그러진다.)
 */
export const SPLIT_GRID_CLASS =
  "grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-center lg:gap-6";

/** 절반 1(차트) 컬럼. min-w-0 이 없으면 SVG 가 그리드 트랙을 밀어낸다. */
export const SPLIT_CHART_COLUMN_CLASS = "flex min-w-0 flex-col gap-4";

/**
 * 절반 2(막대 리스트) 컬럼.
 * 분할선은 방향만 바뀐다 — 모바일 가로선(border-t), 데스크탑 세로선(lg:border-l).
 * min-w-0 이 없으면 막대의 flex-1 이 트랙을 밀어 카드가 가로로 넘친다. 필수.
 */
export const SPLIT_LIST_COLUMN_CLASS =
  "min-w-0 border-t border-subtle pt-5 lg:border-l lg:border-t-0 lg:border-subtle lg:pl-6 lg:pt-0";
