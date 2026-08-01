import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";

/**
 * 루트 404 폴백.
 *
 * 정상적인 경우 정의되지 않은 경로는 `(authed)/[...notFound]` 가 받아
 * 앱 셸 안의 404 로 표시된다. 이 파일은 그 경로로도 잡히지 않는
 * 예외 상황(정적 자원 등)을 위한 최소 폴백이다.
 *
 * @returns 단독 404 화면
 */
export default function RootNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-16">
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
    </main>
  );
}
