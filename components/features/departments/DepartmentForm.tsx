"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/Input";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { useToast } from "@/components/feedback/ToastProvider";
import { ApiError } from "@/lib/api/client";
import { createDepartment, updateDepartment } from "@/lib/api/endpoints";
import { NETWORK_ERROR_MESSAGE } from "@/lib/constants";
import { validateRequired } from "@/lib/validation";
import type { Department } from "@/types/api";

/** 학과 코드 중복(409) 시 코드 필드에 표시할 문구. */
const DUPLICATE_CODE_MESSAGE = "이미 사용 중인 학과 코드입니다.";

interface DepartmentFieldErrors {
  code?: string;
  name?: string;
}

interface DepartmentFormProps {
  /** 수정 대상. 없으면 생성 모드 */
  department?: Department;
}

/**
 * 학과 생성/수정 공용 폼.
 *
 * @param department 수정 대상 학과. 생략하면 생성 모드
 * @returns 학과 폼
 */
export function DepartmentForm({ department }: DepartmentFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditMode = Boolean(department);

  const [code, setCode] = useState(department?.code ?? "");
  const [name, setName] = useState(department?.name ?? "");
  const [fieldErrors, setFieldErrors] = useState<DepartmentFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  /** 두 필드 모두 필수다. */
  function validate(): DepartmentFieldErrors {
    const errors: DepartmentFieldErrors = {};

    const codeError = validateRequired(code, "학과 코드");
    if (codeError) errors.code = codeError;

    const nameError = validateRequired(name, "학과명");
    if (nameError) errors.name = nameError;

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (errors.code) codeRef.current?.focus();
      else nameRef.current?.focus();
      return;
    }

    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    setIsSubmitting(true);
    try {
      if (department) {
        // 변경된 필드만 담아 부분 수정한다.
        const patch: { code?: string; name?: string } = {};
        if (trimmedCode !== department.code) patch.code = trimmedCode;
        if (trimmedName !== department.name) patch.name = trimmedName;

        if (Object.keys(patch).length > 0) {
          await updateDepartment(department.id, patch);
        }
        showToast({ tone: "success", title: "학과를 수정했습니다.", description: trimmedName });
      } else {
        await createDepartment({ code: trimmedCode, name: trimmedName });
        showToast({ tone: "success", title: "학과를 등록했습니다.", description: trimmedName });
      }

      router.push("/departments");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        // 중복은 코드 필드에 귀속되는 오류다.
        setFieldErrors({ code: DUPLICATE_CODE_MESSAGE });
        codeRef.current?.focus();
      } else if (caught instanceof ApiError && caught.status === 400) {
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

        <fieldset disabled={isSubmitting} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <Field
              label="학과 코드"
              htmlFor="department-code"
              required
              error={fieldErrors.code}
              hint="예: CSE"
            >
              <TextInput
                ref={codeRef}
                id="department-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                invalid={Boolean(fieldErrors.code)}
                required
              />
            </Field>

            <Field label="학과명" htmlFor="department-name" required error={fieldErrors.name}>
              <TextInput
                ref={nameRef}
                id="department-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                invalid={Boolean(fieldErrors.name)}
                required
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-subtle pt-5 md:flex-row md:justify-end">
            <Button variant="secondary" href="/departments" fullWidth className="md:w-auto">
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
