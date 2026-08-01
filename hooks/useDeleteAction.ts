"use client";

import { useCallback, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { NETWORK_ERROR_MESSAGE } from "@/lib/constants";
import { useToast } from "@/components/feedback/ToastProvider";

/**
 * "확인 모달 → 삭제 요청 → 토스트 → 목록 새로고침" 흐름을 담당하는 훅.
 *
 * 강의·학과·학점환산기준 세 목록 화면이 같은 흐름을 반복하므로 추출했다.
 */

/** 삭제 대상 식별 정보. 모달 문구에 이름을 쓰기 위해 라벨을 함께 들고 있는다. */
interface DeleteTarget {
  id: string;
  label: string;
}

interface UseDeleteActionOptions {
  /** 실제 삭제 API 호출 */
  deleteFn: (id: string) => Promise<void>;
  /** 삭제 성공 후 목록을 다시 불러오는 콜백 */
  onDeleted: () => void;
  /** 성공 토스트 제목 (예: "수강과목을 삭제했습니다.") */
  successMessage: string;
  /** 이미 삭제된 대상(404)일 때의 토스트 제목 */
  alreadyDeletedMessage: string;
}

interface UseDeleteActionResult {
  /** 현재 확인 모달에 걸린 대상. null 이면 모달이 닫힌 상태 */
  target: DeleteTarget | null;
  /** 삭제 확인 모달을 연다 */
  requestDelete: (target: DeleteTarget) => void;
  /** 모달을 닫는다 */
  cancelDelete: () => void;
  /** 삭제를 확정한다 */
  confirmDelete: () => Promise<void>;
  /** 삭제 요청 진행 중 여부 */
  isDeleting: boolean;
}

/**
 * 삭제 확인 흐름을 관리한다.
 *
 * @param options 삭제 함수와 성공/실패 문구
 * @returns 모달 제어 상태와 핸들러
 */
export function useDeleteAction({
  deleteFn,
  onDeleted,
  successMessage,
  alreadyDeletedMessage,
}: UseDeleteActionOptions): UseDeleteActionResult {
  const { showToast } = useToast();
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const requestDelete = useCallback((next: DeleteTarget) => setTarget(next), []);

  const cancelDelete = useCallback(() => setTarget(null), []);

  const confirmDelete = useCallback(async () => {
    if (!target) return;

    setIsDeleting(true);
    try {
      await deleteFn(target.id);
      showToast({ tone: "success", title: successMessage, description: target.label });
      onDeleted();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        // 다른 사용자가 먼저 지웠거나 이미 삭제된 대상이다.
        // 에러로 막지 말고 안내 후 목록을 새로고침해 화면을 서버 상태와 맞춘다.
        showToast({ tone: "error", title: alreadyDeletedMessage });
        onDeleted();
      } else if (caught instanceof ApiError && caught.status !== 401) {
        // 401 은 fetch 래퍼가 전역 리다이렉트로 처리하므로 화면에 그리지 않는다.
        showToast({ tone: "error", title: caught.message || NETWORK_ERROR_MESSAGE });
      }
    } finally {
      setIsDeleting(false);
      setTarget(null);
    }
  }, [target, deleteFn, onDeleted, showToast, successMessage, alreadyDeletedMessage]);

  return { target, requestDelete, cancelDelete, confirmDelete, isDeleting };
}
