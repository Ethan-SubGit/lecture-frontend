"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { GradeScaleForm } from "@/components/features/grade-scales/GradeScaleForm";

/**
 * 학점환산기준 생성 (`/grade-scales/new`).
 *
 * @returns 생성 화면
 */
export default function NewGradeScalePage() {
  return (
    <PageContainer>
      <PageHeader
        title="학점환산기준 생성"
        description="등급 문자와 평점, 점수 구간을 입력해 새 기준을 등록합니다."
        backHref="/grade-scales"
      />
      <div className="mt-6">
        <GradeScaleForm />
      </div>
    </PageContainer>
  );
}
