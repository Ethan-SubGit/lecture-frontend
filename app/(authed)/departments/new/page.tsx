"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { DepartmentForm } from "@/components/features/departments/DepartmentForm";

/**
 * 학과 생성 (`/departments/new`).
 *
 * @returns 생성 화면
 */
export default function NewDepartmentPage() {
  return (
    <PageContainer>
      <PageHeader
        title="학과 생성"
        description="학과 코드와 학과명을 입력해 새 학과를 등록합니다."
        backHref="/departments"
      />
      <div className="mt-6">
        <DepartmentForm />
      </div>
    </PageContainer>
  );
}
