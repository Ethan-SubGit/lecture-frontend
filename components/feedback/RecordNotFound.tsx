import { Button } from "@/components/ui/Button";
import { EmptyState } from "./EmptyState";

interface RecordNotFoundProps {
  /** 안내 문구. spec.md 6절의 화면별 문구를 그대로 넘긴다 */
  title: string;
  /** 상위 목록 경로 */
  backHref: string;
  /** 버튼 라벨 */
  backLabel?: string;
}

/**
 * 단건 조회 404 전용 빈 상태 (spec.md 6절).
 *
 * 상세·수정 화면 6곳이 같은 형태를 쓰므로 컴포넌트로 묶었다.
 *
 * @param title 안내 문구
 * @param backHref 상위 목록 경로
 * @param backLabel 버튼 라벨
 * @returns 빈 상태 요소
 */
export function RecordNotFound({
  title,
  backHref,
  backLabel = "목록으로",
}: RecordNotFoundProps) {
  return (
    <EmptyState
      icon="🔍"
      title={title}
      action={
        <Button variant="primary" href={backHref} fullWidth className="sm:w-auto">
          {backLabel}
        </Button>
      }
    />
  );
}
