"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";

/**
 * 비동기 조회의 로딩/재조회/에러/데이터 상태를 한곳에서 관리하는 훅.
 *
 * 화면마다 useState 4개와 useEffect 를 반복 작성하지 않기 위해 추출했다.
 * spec.md 6절의 상태 규칙을 그대로 구현한다:
 * - 최초 진입은 loading (스켈레톤)
 * - 재조회는 데이터를 유지한 채 refetching (흐림 오버레이)
 * - 401 은 여기서 다루지 않는다 (fetch 래퍼가 전역 리다이렉트로 처리)
 */

/** 조회 상태. */
export interface AsyncDataState<T> {
  /** 마지막으로 성공한 데이터. 재조회 중에도 유지된다 */
  data: T | null;
  /** 최초 로딩 중(표시할 데이터가 아직 없음) */
  isLoading: boolean;
  /** 재조회 중(기존 데이터 유지) */
  isRefetching: boolean;
  /** 실패 정보. 성공하면 null 로 초기화된다 */
  error: ApiError | null;
  /** 수동 재조회 (에러의 [다시 시도] 버튼 등) */
  refetch: () => void;
}

/**
 * 비동기 조회를 실행하고 상태를 반환한다.
 *
 * @typeParam T 조회 결과 타입
 * @param fetcher 데이터를 가져오는 함수. useCallback 으로 감싸 참조를 안정시켜야 한다
 * @param enabled false 면 요청을 보내지 않는다 (예: 강의 미선택 시 성적 조회 금지)
 * @returns 데이터와 상태 플래그, 수동 재조회 함수
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  enabled = true,
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // 수동 재조회 트리거. 값이 바뀌면 아래 effect 가 다시 돈다.
  const [reloadToken, setReloadToken] = useState(0);
  // 이미 한 번이라도 로드했는지. 최초 loading 과 재조회 refetching 을 구분하는 기준이다.
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      // 비활성 상태에서는 요청도, 로딩 표시도 하지 않는다.
      setIsLoading(false);
      return;
    }

    // 응답이 늦게 도착한 이전 요청이 최신 상태를 덮어쓰지 않도록 하는 취소 플래그.
    let isStale = false;

    if (hasLoadedRef.current) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }

    fetcher()
      .then((result) => {
        if (isStale) return;
        setData(result);
        setError(null);
        hasLoadedRef.current = true;
      })
      .catch((caught: unknown) => {
        if (isStale) return;
        // 래퍼가 던지는 것은 항상 ApiError 다. 그 외 예외도 안전하게 감싼다.
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "알 수 없는 오류가 발생했습니다."),
        );
      })
      .finally(() => {
        if (isStale) return;
        setIsLoading(false);
        setIsRefetching(false);
      });

    return () => {
      isStale = true;
    };
  }, [fetcher, enabled, reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { data, isLoading, isRefetching, error, refetch };
}
