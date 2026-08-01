"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { FormSkeleton } from "@/components/feedback/Skeleton";
import { RecordNotFound } from "@/components/feedback/RecordNotFound";
import { LectureForm } from "@/components/features/lectures/LectureForm";
import { useAsyncData } from "@/hooks/useAsyncData";
import { ApiError } from "@/lib/api/client";
import { fetchLecture } from "@/lib/api/endpoints";
import { NETWORK_ERROR_MESSAGE } from "@/lib/constants";

/**
 * 수강과목 수정 (`/lectures/[id]/edit`).
 *
 * 먼저 `GET /lectures/{id}` 로 기존 값을 채운 뒤 폼을 렌더한다.
 * 조회 중에는 폼 스켈레톤을, 404 면 빈 상태를 보여준다.
 *
 * @returns 강의 수정 화면
 */
export default function EditLecturePage() {
  const params = useParams<{ id: string }>();
  const lectureId = params.id;

  const fetcher = useCallback(() => fetchLecture(lectureId), [lectureId]);
  const { data: lecture, isLoading, error, refetch } = useAsyncData(fetcher);

  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <PageContainer>
      <PageHeader title="수강과목 수정" backHref="/lectures" />

      <div className="mt-6">
        {isLoading ? <FormSkeleton fields={2} /> : null}

        {isNotFound ? (
          <RecordNotFound title="요청한 강의를 찾을 수 없습니다." backHref="/lectures" />
        ) : null}

        {error && !isNotFound ? (
          <AlertBanner
            tone="error"
            title={NETWORK_ERROR_MESSAGE}
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                다시 시도
              </Button>
            }
          />
        ) : null}

        {/* 조회가 끝난 뒤에야 폼을 마운트해 초기값이 확실히 채워지게 한다. */}
        {lecture ? <LectureForm lecture={lecture} /> : null}
      </div>
    </PageContainer>
  );
}
