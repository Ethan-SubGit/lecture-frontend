"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { NumberInput, TextInput } from "@/components/ui/Input";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { useToast } from "@/components/feedback/ToastProvider";
import { ApiError } from "@/lib/api/client";
import { createGradeScale, updateGradeScale } from "@/lib/api/endpoints";
import {
  MAX_GPA,
  MAX_SCORE,
  MIN_SCORE,
  NETWORK_ERROR_MESSAGE,
} from "@/lib/constants";
import { validateGpa, validateRequired, validateScoreRange } from "@/lib/validation";
import type { GradeScale } from "@/types/api";

/** 등급 문자 중복(409) 시 등급 필드에 표시할 문구. */
const DUPLICATE_GRADE_MESSAGE = "이미 등록된 등급입니다.";

/** minScore > maxScore 위반(400) 시 문구. 클라이언트에서도 선제 검증한다. */
const SCORE_RANGE_MESSAGE = "최소 점수는 최대 점수보다 클 수 없습니다.";

interface GradeScaleFieldErrors {
  grade?: string;
  gpa?: string;
  minScore?: string;
  maxScore?: string;
}

interface GradeScaleFormProps {
  /** 수정 대상. 없으면 생성 모드 */
  gradeScale?: GradeScale;
}

/**
 * 학점환산기준 생성/수정 공용 폼.
 *
 * 숫자 필드는 입력 중 상태를 그대로 보존하기 위해 문자열로 다루고,
 * 제출 시점에만 Number 로 변환한다(입력 도중 "0." 같은 중간 상태가 지워지지 않게).
 *
 * @param gradeScale 수정 대상. 생략하면 생성 모드
 * @returns 학점환산기준 폼
 */
export function GradeScaleForm({ gradeScale }: GradeScaleFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditMode = Boolean(gradeScale);

  const [grade, setGrade] = useState(gradeScale?.grade ?? "");
  const [gpa, setGpa] = useState(gradeScale ? String(gradeScale.gpa) : "");
  const [minScore, setMinScore] = useState(
    gradeScale ? String(gradeScale.minScore) : "",
  );
  const [maxScore, setMaxScore] = useState(
    gradeScale ? String(gradeScale.maxScore) : "",
  );

  const [fieldErrors, setFieldErrors] = useState<GradeScaleFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const gradeRef = useRef<HTMLInputElement>(null);
  const gpaRef = useRef<HTMLInputElement>(null);
  const minScoreRef = useRef<HTMLInputElement>(null);
  const maxScoreRef = useRef<HTMLInputElement>(null);

  /**
   * 네 필드를 검증한다. min > max 는 서버 400 을 기다리지 않고 선제 차단한다.
   * @returns 필드별 에러 객체
   */
  function validate(): GradeScaleFieldErrors {
    const errors: GradeScaleFieldErrors = {};

    const gradeError = validateRequired(grade, "등급");
    if (gradeError) errors.grade = gradeError;

    const gpaError = validateGpa(gpa);
    if (gpaError) errors.gpa = gpaError;

    const minError = validateScoreRange(minScore, "최소 점수");
    if (minError) errors.minScore = minError;

    const maxError = validateScoreRange(maxScore, "최대 점수");
    if (maxError) errors.maxScore = maxError;

    // 개별 범위 검증을 통과한 경우에만 대소 관계를 본다(NaN 비교 방지).
    if (!minError && !maxError && Number(minScore) > Number(maxScore)) {
      errors.minScore = SCORE_RANGE_MESSAGE;
    }

    return errors;
  }

  /** 첫 번째 에러 필드로 포커스를 옮긴다. */
  function focusFirstError(errors: GradeScaleFieldErrors) {
    if (errors.grade) gradeRef.current?.focus();
    else if (errors.gpa) gpaRef.current?.focus();
    else if (errors.minScore) minScoreRef.current?.focus();
    else maxScoreRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors);
      return;
    }

    const payload = {
      grade: grade.trim(),
      gpa: Number(gpa),
      minScore: Number(minScore),
      maxScore: Number(maxScore),
    };

    setIsSubmitting(true);
    try {
      if (gradeScale) {
        // 변경된 필드만 담아 부분 수정한다.
        const patch: Partial<typeof payload> = {};
        if (payload.grade !== gradeScale.grade) patch.grade = payload.grade;
        if (payload.gpa !== gradeScale.gpa) patch.gpa = payload.gpa;
        if (payload.minScore !== gradeScale.minScore) patch.minScore = payload.minScore;
        if (payload.maxScore !== gradeScale.maxScore) patch.maxScore = payload.maxScore;

        if (Object.keys(patch).length > 0) {
          await updateGradeScale(gradeScale.id, patch);
        }
        showToast({ tone: "success", title: "학점환산기준을 수정했습니다.", description: payload.grade });
      } else {
        await createGradeScale(payload);
        showToast({ tone: "success", title: "학점환산기준을 등록했습니다.", description: payload.grade });
      }

      router.push("/grade-scales");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setFieldErrors({ grade: DUPLICATE_GRADE_MESSAGE });
        gradeRef.current?.focus();
      } else if (caught instanceof ApiError && caught.status === 400) {
        // 서버가 400 을 주는 대표 사유가 min>max 다. 클라이언트와 동일 문구로 통일한다.
        setFieldErrors({ minScore: SCORE_RANGE_MESSAGE });
        minScoreRef.current?.focus();
      } else if (!(caught instanceof ApiError) || caught.status !== 401) {
        setFormError(NETWORK_ERROR_MESSAGE);
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {formError ? <AlertBanner tone="error" title={formError} /> : null}

        <fieldset disabled={isSubmitting} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4">
            <Field label="등급" htmlFor="grade-scale-grade" required error={fieldErrors.grade} hint="예: A+">
              <TextInput
                ref={gradeRef}
                id="grade-scale-grade"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                invalid={Boolean(fieldErrors.grade)}
                required
              />
            </Field>

            <Field
              label="평점"
              htmlFor="grade-scale-gpa"
              required
              error={fieldErrors.gpa}
              hint={`${MAX_GPA} 만점`}
            >
              <NumberInput
                ref={gpaRef}
                id="grade-scale-gpa"
                min={0}
                max={MAX_GPA}
                step={0.1}
                value={gpa}
                onChange={(event) => setGpa(event.target.value)}
                invalid={Boolean(fieldErrors.gpa)}
                required
              />
            </Field>

            <Field label="최소 점수" htmlFor="grade-scale-min" required error={fieldErrors.minScore}>
              <NumberInput
                ref={minScoreRef}
                id="grade-scale-min"
                min={MIN_SCORE}
                max={MAX_SCORE}
                value={minScore}
                onChange={(event) => setMinScore(event.target.value)}
                invalid={Boolean(fieldErrors.minScore)}
                required
              />
            </Field>

            <Field label="최대 점수" htmlFor="grade-scale-max" required error={fieldErrors.maxScore}>
              <NumberInput
                ref={maxScoreRef}
                id="grade-scale-max"
                min={MIN_SCORE}
                max={MAX_SCORE}
                value={maxScore}
                onChange={(event) => setMaxScore(event.target.value)}
                invalid={Boolean(fieldErrors.maxScore)}
                required
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-subtle pt-5 md:flex-row md:justify-end">
            <Button variant="secondary" href="/grade-scales" fullWidth className="md:w-auto">
              취소
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting} fullWidth className="md:w-auto">
              {isEditMode ? "수정" : "등록"}
            </Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}
