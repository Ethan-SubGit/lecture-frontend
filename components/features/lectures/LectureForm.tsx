"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { useToast } from "@/components/feedback/ToastProvider";
import { ApiError } from "@/lib/api/client";
import { createLecture, updateLecture } from "@/lib/api/endpoints";
import { DEFAULT_TERM_CODE, NETWORK_ERROR_MESSAGE } from "@/lib/constants";
import { validateRequired, validateTermCode } from "@/lib/validation";
import type { Lecture } from "@/types/api";

/** 강의명+학기 조합 중복(409) 시 강의명 필드에 표시할 문구. */
const DUPLICATE_MESSAGE = "이미 등록된 강의명과 학기 조합입니다.";

/** 필드별 검증 메시지. */
interface LectureFieldErrors {
  name?: string;
  term?: string;
}

interface LectureFormProps {
  /** 수정 대상. 없으면 생성 모드다 */
  lecture?: Lecture;
}

/**
 * 강의 생성/수정 공용 폼.
 *
 * 두 화면의 필드와 검증이 동일하므로 하나로 구현하고 `lecture` 유무로 모드를 가른다.
 * 수정 시에는 **변경된 필드만** PATCH 본문에 담는다(수용 기준).
 *
 * @param lecture 수정 대상 강의. 생략하면 생성 모드
 * @returns 강의 폼
 */
export function LectureForm({ lecture }: LectureFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditMode = Boolean(lecture);

  const [name, setName] = useState(lecture?.name ?? "");
  const [term, setTerm] = useState(lecture?.term ?? "");
  const [fieldErrors, setFieldErrors] = useState<LectureFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const termRef = useRef<HTMLInputElement>(null);

  /**
   * 입력값을 검증한다.
   * @returns 필드별 에러 객체. 비어 있으면 통과
   */
  function validate(): LectureFieldErrors {
    const errors: LectureFieldErrors = {};

    const nameError = validateRequired(name, "강의명");
    if (nameError) errors.name = nameError;

    const termError = validateTermCode(term);
    if (termError) errors.term = termError;

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      // 첫 번째 에러 필드로 포커스를 옮긴다.
      if (errors.name) nameRef.current?.focus();
      else termRef.current?.focus();
      return;
    }

    const trimmedName = name.trim();
    const trimmedTerm = term.trim();

    setIsSubmitting(true);
    try {
      if (lecture) {
        // 변경된 필드만 담아 부분 수정한다.
        const patch: { name?: string; term?: string } = {};
        if (trimmedName !== lecture.name) patch.name = trimmedName;
        if (trimmedTerm !== lecture.term) patch.term = trimmedTerm;

        // 바뀐 것이 없으면 요청을 보내지 않고 목록으로 돌아간다.
        if (Object.keys(patch).length > 0) {
          await updateLecture(lecture.id, patch);
        }
        showToast({ tone: "success", title: "수강과목을 수정했습니다.", description: trimmedName });
      } else {
        const created = await createLecture({
          name: trimmedName,
          // 빈 문자열을 보내면 서버 기본값 로직을 방해하므로 아예 생략한다.
          ...(trimmedTerm ? { term: trimmedTerm } : {}),
        });
        showToast({
          tone: "success",
          title: "수강과목을 등록했습니다.",
          description: `강의코드 ${created.code}`,
        });
      }

      router.push("/lectures");
      // 목록이 캐시된 상태로 보이지 않도록 새로고침한다.
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        // 중복은 강의명 필드에 귀속되는 오류이므로 필드 하단 인라인으로 표시한다.
        setFieldErrors({ name: DUPLICATE_MESSAGE });
        nameRef.current?.focus();
      } else if (caught instanceof ApiError && caught.status === 400) {
        // 400 은 필드 특정이 어려우므로 폼 상단 배너에 서버 메시지를 그대로 보여준다.
        setFormError(caught.message);
      } else if (!(caught instanceof ApiError) || caught.status !== 401) {
        setFormError(NETWORK_ERROR_MESSAGE);
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="md:max-w-form">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {formError ? <AlertBanner tone="error" title={formError} /> : null}

        {/* 수정 화면에서는 서버가 발급한 강의코드를 읽기 전용 배지로 보여준다. */}
        {lecture ? (
          <div className="flex items-center gap-2">
            <span className="text-caption text-muted">강의코드</span>
            <Badge tone="neutral">{lecture.code}</Badge>
          </div>
        ) : null}

        {/* 제출 중에는 fieldset 으로 폼 전체를 잠근다. */}
        <fieldset disabled={isSubmitting} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <Field
              label="강의명"
              htmlFor="lecture-name"
              required
              error={fieldErrors.name}
              className="md:col-span-2"
            >
              <TextInput
                ref={nameRef}
                id="lecture-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                invalid={Boolean(fieldErrors.name)}
                required
              />
            </Field>

            <Field
              label="학기"
              htmlFor="lecture-term"
              error={fieldErrors.term}
              hint={`미입력 시 ${DEFAULT_TERM_CODE}이 적용됩니다. (YY10 1학기 / YY11 여름 / YY20 2학기 / YY21 겨울)`}
            >
              <TextInput
                ref={termRef}
                id="lecture-term"
                inputMode="numeric"
                placeholder={DEFAULT_TERM_CODE}
                maxLength={4}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                invalid={Boolean(fieldErrors.term)}
              />
            </Field>
          </div>

          {/* 모바일에서는 주 버튼이 위에 오도록 flex-col-reverse + DOM 순서(취소, 저장)를 쓴다. */}
          <div className="flex flex-col-reverse gap-2 border-t border-subtle pt-5 md:flex-row md:justify-end">
            <Button variant="secondary" href="/lectures" fullWidth className="md:w-auto">
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              fullWidth
              className="md:w-auto"
            >
              {isEditMode ? "수정" : "등록"}
            </Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}
