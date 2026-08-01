"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { FormSkeleton } from "@/components/feedback/Skeleton";
import { RecordNotFound } from "@/components/feedback/RecordNotFound";
import { DepartmentForm } from "@/components/features/departments/DepartmentForm";
import { useAsyncData } from "@/hooks/useAsyncData";
import { ApiError } from "@/lib/api/client";
import { fetchDepartment } from "@/lib/api/endpoints";
import { NETWORK_ERROR_MESSAGE } from "@/lib/constants";

/**
 * 학과 수정 (`/departments/[id]/edit`).
 *
 * 기존 값을 조회해 폼에 채운 뒤 변경분만 PATCH 한다.
 *
 * @returns 학과 수정 화면
 */
export default function EditDepartmentPage() {
  const params = useParams<{ id: string }>();
  const departmentId = params.id;

  const fetcher = useCallback(() => fetchDepartment(departmentId), [departmentId]);
  const { data: department, isLoading, error, refetch } = useAsyncData(fetcher);

  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <PageContainer>
      <PageHeader title="학과 수정" backHref="/departments" />

      <div className="mt-6">
        {isLoading ? <FormSkeleton fields={2} /> : null}

        {isNotFound ? (
          <RecordNotFound title="요청한 학과를 찾을 수 없습니다." backHref="/departments" />
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

        {department ? <DepartmentForm department={department} /> : null}
      </div>
    </PageContainer>
  );
}
