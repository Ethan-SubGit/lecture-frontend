import type { TableState } from "@/components/data/DataTable";

/** listTableState 의 입력 플래그. */
interface ListStateInput {
  /** 최초 로딩 중 */
  isLoading: boolean;
  /** 재조회 중 (기존 데이터 유지) */
  isRefetching: boolean;
  /** 조회 실패 여부 */
  hasError: boolean;
  /** 표시할 행이 0건인지 */
  isEmpty: boolean;
}

/**
 * 목록 화면의 여러 플래그를 DataTable 의 단일 state 값으로 환산한다.
 *
 * 우선순위가 중요하다 (spec.md 6절):
 * 1) 최초 로딩 — 아직 보여줄 데이터가 없으므로 스켈레톤이 최우선
 * 2) 에러 — 데이터를 못 받았으니 빈 상태가 아니라 에러를 보여준다
 * 3) 빈 상태
 * 4) 재조회 — 기존 데이터를 유지한 채 흐림 처리
 *
 * 목록 화면 5곳이 같은 분기를 각자 작성하지 않도록 함수로 뽑았다.
 *
 * @param input 상태 플래그
 * @returns DataTable 의 state prop 값
 */
export function listTableState({
  isLoading,
  isRefetching,
  hasError,
  isEmpty,
}: ListStateInput): TableState {
  if (isLoading) return "loading";
  if (hasError) return "error";
  if (isEmpty) return "empty";
  if (isRefetching) return "refetching";
  return "idle";
}
