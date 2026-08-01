"use client";

import { useState, type FormEvent } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { NumberInput } from "@/components/ui/Input";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { ApiError } from "@/lib/api/client";
import { convertScoreToGrade } from "@/lib/api/endpoints";
import { MAX_SCORE, MIN_SCORE, NETWORK_ERROR_MESSAGE } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { GradeScale } from "@/types/api";

/** 해당 구간의 기준이 없을 때(404) 표시할 문구. */
const NO_MATCHING_SCALE_MESSAGE = "해당 점수에 해당하는 등급 기준이 없습니다.";

/**
 * 점수 → 등급 변환 도구 (`GET /grade-scales/convert`).
 *
 * 0~100 범위 밖의 값은 전송하지 않는다(수용 기준).
 * 변환 실패는 이 카드 안에서만 표시하고 목록 표는 정상 유지된다.
 *
 * @returns 변환 도구 카드
 */
export function ScoreConverter() {
  const [score, setScore] = useState("");
  const [result, setResult] = useState<GradeScale | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setResult(null);

    const parsed = Number(score);
    // 범위 밖이면 요청을 보내지 않고 즉시 안내한다.
    if (score.trim() === "" || Number.isNaN(parsed) || parsed < MIN_SCORE || parsed > MAX_SCORE) {
      setMessage(`${MIN_SCORE}~${MAX_SCORE} 사이의 점수를 입력해 주세요.`);
      return;
    }

    setIsConverting(true);
    try {
      setResult(await convertScoreToGrade(parsed));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setMessage(NO_MATCHING_SCALE_MESSAGE);
      } else if (!(caught instanceof ApiError) || caught.status !== 401) {
        setMessage(NETWORK_ERROR_MESSAGE);
      }
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <Card className="lg:max-w-detail">
      <CardHeader title="점수 → 등급 변환" />

      <form onSubmit={handleSubmit} className="md:flex md:items-end md:gap-4" noValidate>
        <Field label="점수" htmlFor="convert-score" className="md:flex-1">
          <NumberInput
            id="convert-score"
            min={MIN_SCORE}
            max={MAX_SCORE}
            value={score}
            onChange={(event) => setScore(event.target.value)}
            placeholder="0 ~ 100"
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          loading={isConverting}
          fullWidth
          className="mt-3 md:mt-0 md:w-auto"
        >
          변환
        </Button>
      </form>

      {/* 결과는 aria-live 로 알려 키보드/스크린리더 사용자가 변환 결과를 놓치지 않게 한다. */}
      <div aria-live="polite" className="mt-4">
        {result ? (
          <div className="flex items-center gap-3 rounded-lg border border-subtle bg-surface-sunken p-4">
            <GradeBadge grade={result.grade} gpa={result.gpa} />
            <p className="text-body text-secondary tabular-nums">
              {formatNumber(result.minScore, 0)} ~ {formatNumber(result.maxScore, 0)}점 구간
            </p>
          </div>
        ) : null}

        {message ? (
          <p role="alert" className="text-caption text-danger-strong">
            {message}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
