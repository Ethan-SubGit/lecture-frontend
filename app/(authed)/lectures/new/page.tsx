"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { LectureForm } from "@/components/features/lectures/LectureForm";

/**
 * 수강과목 생성 (`/lectures/new`).
 *
 * 폼 자체는 수정 화면과 공유하는 LectureForm 이 담당한다.
 *
 * @returns 생성 화면
 */
export default function NewLecturePage() {
  return (
    <PageContainer>
      <PageHeader
        title="수강과목 생성"
        description="강의명을 입력해 새 수강과목을 등록합니다. 강의코드는 자동으로 발급됩니다."
        backHref="/lectures"
      />
      <div className="mt-6">
        <LectureForm />
      </div>
    </PageContainer>
  );
}
