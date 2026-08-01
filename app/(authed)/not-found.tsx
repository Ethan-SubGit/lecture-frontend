import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";

/**
 * 인증 라우트 그룹 내부 404 (spec.md 4.1 마지막 행).
 *
 * 이 파일이 (authed) 그룹 안에 있으므로 사이드바·상단바가 있는 앱 셸 위에 렌더된다.
 *
 * @returns 404 화면
 */
export default function AuthedNotFound() {
  return (
    <PageContainer>
      <div className="grid place-items-center py-16 lg:py-24">
        <EmptyState
          icon="🧭"
          title="페이지를 찾을 수 없습니다."
          description="주소가 변경되었거나 삭제된 페이지일 수 있습니다."
          action={
            <Button variant="primary" href="/dashboard" fullWidth className="md:w-auto">
              대시보드로
            </Button>
          }
        />
      </div>
    </PageContainer>
  );
}
