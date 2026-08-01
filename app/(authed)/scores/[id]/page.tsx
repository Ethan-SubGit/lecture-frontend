"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { DescriptionList } from "@/components/data/DescriptionList";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { DetailSkeleton } from "@/components/feedback/Skeleton";
import { RecordNotFound } from "@/components/feedback/RecordNotFound";
import { useAsyncData } from "@/hooks/useAsyncData";
import { ApiError } from "@/lib/api/client";
import { fetchStudentScore } from "@/lib/api/endpoints";
import { formatNumber, formatTerm } from "@/lib/format";
import { NETWORK_ERROR_MESSAGE } from "@/lib/constants";
import type { StudentScore } from "@/types/api";

/**
 * 성적 상세 (`/scores/[id]`).
 *
 * 학생·강의·학과 요약, 항목별 점수, 합계·등급 강조 블록 세 덩어리로 구성한다.
 * 합계와 등급은 서버 계산값이므로 클라이언트에서 다시 계산하지 않는다.
 *
 * @returns 성적 상세 화면
 */
export default function ScoreDetailPage() {
  const params = useParams<{ id: string }>();
  const scoreId = params.id;

  const fetcher = useCallback(() => fetchStudentScore(scoreId), [scoreId]);
  const { data: score, isLoading, error, refetch } = useAsyncData(fetcher);

  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <PageContainer>
      <PageHeader title="성적 상세" backHref="/scores" />

      <div className="mt-6 md:max-w-detail">
        {isLoading ? <DetailSkeleton rows={6} /> : null}

        {isNotFound ? (
          <RecordNotFound title="성적 정보를 찾을 수 없습니다." backHref="/scores" />
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

        {score ? <ScoreDetailContent score={score} /> : null}
      </div>
    </PageContainer>
  );
}

interface ScoreDetailContentProps {
  score: StudentScore;
}

/**
 * 성적 상세 본문. 데이터가 확정된 뒤에만 렌더되는 프레젠테이션 컴포넌트다.
 *
 * @param score 성적 단건
 * @returns 요약 · 점수 · 합계 블록
 */
function ScoreDetailContent({ score }: ScoreDetailContentProps) {
  /** 항목별 점수 4개. 반복 마크업을 배열로 돌린다. */
  const itemScores = [
    { label: "중간고사", value: score.midtermExamScore },
    { label: "중간과제", value: score.midtermAssignmentScore },
    { label: "기말고사", value: score.finalExamScore },
    { label: "기말과제", value: score.finalAssignmentScore },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="학생 · 강의 정보" />
        <DescriptionList
          items={[
            { label: "학번", value: score.studentNumber },
            { label: "이름", value: score.studentName },
            { label: "학과", value: score.department?.name },
            {
              label: "강의",
              value: score.lecture ? (
                <Link
                  href={`/lectures/${score.lecture.id}`}
                  className="rounded text-accent underline underline-offset-2 focus-ring"
                >
                  {score.lecture.name}
                </Link>
              ) : null,
            },
            { label: "학기", value: formatTerm(score.lecture?.term) },
          ]}
        />
      </Card>

      <Card>
        <CardHeader title="항목별 점수" />
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {itemScores.map((item) => (
            <div key={item.label}>
              <dt className="text-caption text-muted">{item.label}</dt>
              <dd className="mt-1 text-section font-semibold text-primary tabular-nums">
                {formatNumber(item.value, 0)}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* 합계·등급은 서버 계산값이며 이 화면의 결론이므로 별도 강조 블록으로 둔다. */}
      <Card>
        <CardHeader title="합계 및 등급" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-caption text-muted">합계점수</p>
            <p className="mt-1 text-metric font-bold text-primary tabular-nums lg:text-metric-lg">
              {formatNumber(score.totalScore, 1)}
              <span className="ml-1 text-body font-medium text-muted">점</span>
            </p>
          </div>
          <GradeBadge grade={score.grade} />
        </div>
      </Card>
    </div>
  );
}
