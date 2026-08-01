"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DescriptionList } from "@/components/data/DescriptionList";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { DetailSkeleton } from "@/components/feedback/Skeleton";
import { RecordNotFound } from "@/components/feedback/RecordNotFound";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/ToastProvider";
import { useAsyncData } from "@/hooks/useAsyncData";
import { ApiError } from "@/lib/api/client";
import { deleteLecture, fetchLecture } from "@/lib/api/endpoints";
import { formatDateTime, formatTerm } from "@/lib/format";
import { NETWORK_ERROR_MESSAGE } from "@/lib/constants";

/**
 * 수강과목 상세 (`/lectures/[id]`).
 *
 * 404 시나리오를 담는 화면이자 성적조회에서 강의로 링크할 착지점이다.
 *
 * @returns 강의 상세 화면
 */
export default function LectureDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const lectureId = params.id;

  const fetcher = useCallback(() => fetchLecture(lectureId), [lectureId]);
  const { data: lecture, isLoading, error, refetch } = useAsyncData(fetcher);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /** 상세 화면에서의 삭제. 성공하면 목록으로 돌아간다. */
  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteLecture(lectureId);
      showToast({ tone: "success", title: "수강과목을 삭제했습니다." });
      router.push("/lectures");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        showToast({ tone: "error", title: "이미 삭제된 강의입니다." });
        router.push("/lectures");
      } else if (!(caught instanceof ApiError) || caught.status !== 401) {
        showToast({ tone: "error", title: NETWORK_ERROR_MESSAGE });
      }
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  }

  // 404 는 에러 배너가 아니라 빈 상태로 보여준다 (spec.md 6절).
  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <PageContainer>
      <PageHeader
        title="수강과목 상세"
        backHref="/lectures"
        actions={
          lecture ? (
            <>
              <Button variant="secondary" href={`/lectures/${lecture.id}/edit`} fullWidth className="sm:w-auto">
                수정
              </Button>
              <Button
                variant="danger"
                onClick={() => setIsConfirmOpen(true)}
                fullWidth
                className="sm:w-auto"
              >
                삭제
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="mt-6 md:max-w-detail">
        {isLoading ? <DetailSkeleton rows={5} /> : null}

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

        {lecture ? (
          <Card>
            <DescriptionList
              items={[
                { label: "강의코드", value: <Badge tone="neutral">{lecture.code}</Badge> },
                { label: "강의명", value: lecture.name },
                { label: "학기", value: formatTerm(lecture.term) },
                { label: "등록일시", value: formatDateTime(lecture.createdAt) },
                { label: "수정일시", value: formatDateTime(lecture.updatedAt) },
              ]}
            />
          </Card>
        ) : null}
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        title="수강과목을 삭제할까요?"
        description={`"${lecture?.name ?? ""}" 강의를 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`}
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </PageContainer>
  );
}
