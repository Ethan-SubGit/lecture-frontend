"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { FormSkeleton } from "@/components/feedback/Skeleton";
import { RecordNotFound } from "@/components/feedback/RecordNotFound";
import { GradeScaleForm } from "@/components/features/grade-scales/GradeScaleForm";
import { useAsyncData } from "@/hooks/useAsyncData";
import { ApiError } from "@/lib/api/client";
import { fetchGradeScale } from "@/lib/api/endpoints";
import { NETWORK_ERROR_MESSAGE } from "@/lib/constants";

/**
 * 학점환산기준 수정 (`/grade-scales/[id]/edit`).
 *
 * @returns 수정 화면
 */
export default function EditGradeScalePage() {
  const params = useParams<{ id: string }>();
  const gradeScaleId = params.id;

  const fetcher = useCallback(() => fetchGradeScale(gradeScaleId), [gradeScaleId]);
  const { data: gradeScale, isLoading, error, refetch } = useAsyncData(fetcher);

  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <PageContainer>
      <PageHeader title="학점환산기준 수정" backHref="/grade-scales" />

      <div className="mt-6">
        {isLoading ? <FormSkeleton fields={4} /> : null}

        {isNotFound ? (
          <RecordNotFound
            title="요청한 학점환산기준을 찾을 수 없습니다."
            backHref="/grade-scales"
          />
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

        {gradeScale ? <GradeScaleForm gradeScale={gradeScale} /> : null}
      </div>
    </PageContainer>
  );
}
