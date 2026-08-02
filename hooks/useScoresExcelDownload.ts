"use client";

import { useCallback, useRef, useState } from "react";
import { useToast } from "@/components/feedback/ToastProvider";
import { ApiError } from "@/lib/api/client";
import { fetchStudentScores } from "@/lib/api/endpoints";
import { EXCEL_EXPORT_CONFIRM_THRESHOLD } from "@/lib/constants";
import { downloadStudentScoresExcel } from "@/lib/excel/studentScoresExcel";
import { formatCount } from "@/lib/format";
import type { FindStudentScoresQuery } from "@/types/api";

/**
 * `/scores` 전체 엑셀 다운로드 액션 훅 (spec.md 3.10 / 5.8 / 6.2).
 *
 * `useAsyncData`(조회)가 아니라 `useDeleteAction`(사용자 트리거 1회성 액션 + 로딩 + 토스트)의
 * 형태를 따른다. 다운로드는 **조회 상태를 전혀 바꾸지 않는 부수 동작**이므로
 * 화면의 표·페이지·검색 조건을 이 훅이 건드리는 일은 없다(spec.md 가정 45).
 */

/** 다운로드 진행 단계. 버튼 라벨·보조 문구가 이 값 하나에서 파생된다. */
export type ExcelDownloadStage = "idle" | "fetching" | "generating";

/** 다운로드 1건의 실행 조건. 클릭 시점에 확정되어 끝까지 유지된다. */
export interface ExcelDownloadRequest {
  /** 페이지네이션을 제외한 현재 검색·정렬 조건 그대로 (spec.md 5.8 (가)) */
  query: FindStudentScoresQuery;
  /** 파일명에 쓸 강의명 */
  lectureName: string;
  /** 화면이 이미 알고 있는 전체 건수. 이 값이 그대로 요청 pageSize 가 된다 */
  total: number;
}

interface UseScoresExcelDownloadResult {
  /** 현재 진행 단계 */
  stage: ExcelDownloadStage;
  /** 확인 모달에 걸린 요청. null 이면 모달이 닫힌 상태 */
  pendingConfirm: ExcelDownloadRequest | null;
  /** 다운로드를 요청한다. 임계값을 넘으면 즉시 시작하지 않고 확인 모달을 띄운다 */
  requestDownload: (request: ExcelDownloadRequest) => void;
  /** 확인 모달의 [다운로드] */
  confirmDownload: () => void;
  /** 확인 모달의 [취소] */
  cancelDownload: () => void;
}

/**
 * 브라우저가 **한 프레임을 실제로 그릴 때까지** 기다린다.
 *
 * 파일 생성은 메인 스레드를 오래 잡는 작업이라, 라벨을 `엑셀 만드는 중…` 으로 바꾼 직후
 * 곧바로 생성을 시작하면 그 렌더가 화면에 반영되기 전에 스레드가 막혀
 * 사용자는 **`목록 불러오는 중…` 인 채로 화면이 굳는 것**을 보게 된다(design.md 4.33.2).
 * rAF 를 두 번 겹치는 이유: 첫 rAF 는 "다음 그리기 직전", 두 번째는 "그리기가 끝난 뒤"다.
 *
 * @returns 다음 프레임이 그려진 뒤 resolve 되는 Promise
 */
function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * 성적 목록 엑셀 다운로드 흐름을 관리한다.
 *
 * @returns 진행 단계, 확인 모달 상태, 핸들러
 */
export function useScoresExcelDownload(): UseScoresExcelDownloadResult {
  const { showToast } = useToast();
  const [stage, setStage] = useState<ExcelDownloadStage>("idle");
  const [pendingConfirm, setPendingConfirm] = useState<ExcelDownloadRequest | null>(null);

  // 진행 중 재진입을 막는 동기 가드. 버튼의 loading(disabled)이 1차 방어지만,
  // 상태 반영은 비동기라 연타 시 한 프레임 사이로 두 번 들어올 수 있다.
  const isRunningRef = useRef(false);

  const runDownload = useCallback(
    async (request: ExcelDownloadRequest) => {
      // 방어적 처리 — 버튼이 비활성이라 도달하지 않지만, 0건이면 요청 자체를 보내지 않는다.
      if (request.total <= 0 || isRunningRef.current) return;
      isRunningRef.current = true;

      try {
        // ── 1단계: 전체 목록 재조회. 페이지 루프가 아니라 pageSize=total 로 1회만 보낸다.
        //    (페이지를 넘기는 사이 다른 담당자가 업로드하면 경계에서 행이 중복·누락된다)
        setStage("fetching");

        let response;
        try {
          response = await fetchStudentScores({
            ...request.query,
            page: 1,
            pageSize: request.total,
          });
        } catch (caught) {
          // 401 은 fetch 래퍼의 전역 처리가 로그인 화면으로 보낸다. 여기서 토스트를 띄우지 않는다.
          if (caught instanceof ApiError && caught.status === 401) return;
          showToast({
            tone: "error",
            title: "목록을 불러오지 못해 다운로드하지 못했습니다.",
          });
          return;
        }

        // ── 2단계: 파일 생성. 라벨을 먼저 그리고 한 프레임 양보한 뒤 시작한다.
        setStage("generating");
        await waitForNextPaint();

        try {
          await downloadStudentScoresExcel(response.data, request.lectureName);
        } catch {
          showToast({
            tone: "error",
            title: "엑셀 파일을 만들지 못했습니다. 검색 조건을 좁혀 다시 시도해 주세요.",
          });
          return;
        }

        // 요청을 보내는 사이 데이터가 늘어나 응답 total 이 요청 pageSize 를 넘었다면
        // 파일은 정상 저장하되 잘림을 반드시 알린다. 조용히 잘린 파일을 주지 않는다.
        const includedCount = response.data.length;
        if (response.total > request.total) {
          showToast({
            tone: "error",
            title: `다운로드 중 데이터가 변경되어 ${formatCount(
              response.total,
            )}건 중 ${formatCount(includedCount)}건만 포함되었습니다.`,
          });
          return;
        }

        showToast({
          tone: "success",
          title: `${formatCount(includedCount)}건을 다운로드했습니다.`,
        });
      } finally {
        isRunningRef.current = false;
        setStage("idle");
      }
    },
    [showToast],
  );

  const requestDownload = useCallback(
    (request: ExcelDownloadRequest) => {
      if (request.total <= 0 || isRunningRef.current) return;

      // 임계값을 넘으면 즉시 시작하지 않는다 — 파일 생성 동안 브라우저가 수십 초 멈출 수 있다.
      // 건수 상한을 두어 거부하지는 않는다("전체를 받고 싶다"는 요구를 거스르기 때문).
      if (request.total > EXCEL_EXPORT_CONFIRM_THRESHOLD) {
        setPendingConfirm(request);
        return;
      }

      void runDownload(request);
    },
    [runDownload],
  );

  const confirmDownload = useCallback(() => {
    if (!pendingConfirm) return;
    // 확인 즉시 모달을 닫는다. 진행 표시는 툴바 버튼 한 곳에만 둔다
    // (모달과 버튼 두 곳에 있으면 어디를 봐야 할지 모른다 — design.md 4.33.5).
    setPendingConfirm(null);
    void runDownload(pendingConfirm);
  }, [pendingConfirm, runDownload]);

  const cancelDownload = useCallback(() => setPendingConfirm(null), []);

  return { stage, pendingConfirm, requestDownload, confirmDownload, cancelDownload };
}
