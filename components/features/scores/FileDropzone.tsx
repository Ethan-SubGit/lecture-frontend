"use client";

import { useId, useState, type DragEvent } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { formatFileSize } from "@/lib/format";
import { ALLOWED_EXCEL_EXTENSIONS } from "@/lib/constants";

interface FileDropzoneProps {
  /** 현재 선택된 파일. 없으면 드롭존이 표시된다 */
  file: File | null;
  /** 파일 선택/제거 시 호출. 제거하면 null 이 전달된다 */
  onFileChange: (file: File | null) => void;
  /** 확장자 오류 등 검증 메시지 */
  error?: string;
  /** 업로드 중 잠금 */
  disabled?: boolean;
}

/**
 * 엑셀 파일 드롭존 (design.md 4.7 FileInput).
 *
 * 실제 <input type="file"> 은 sr-only 로 두고 <label> 로 감싸
 * 클릭·키보드 포커스가 모두 정상 동작하게 한다.
 * 파일이 선택되면 드롭존이 파일 칩으로 바뀐다.
 *
 * @param file 선택된 파일
 * @param onFileChange 파일 변경 핸들러
 * @param error 검증 메시지
 * @param disabled 비활성 여부
 * @returns 드롭존 또는 파일 칩
 */
export function FileDropzone({
  file,
  onFileChange,
  error,
  disabled = false,
}: FileDropzoneProps) {
  const inputId = useId();
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  /** 드래그된 파일을 받는다. 확장자 검증은 상위 폼이 일괄 처리한다. */
  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    if (disabled) return;

    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onFileChange(dropped);
  }

  if (file) {
    return (
      <div>
        <div className="flex items-center gap-3 rounded-lg border border-subtle bg-surface p-4">
          <span aria-hidden="true">📄</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body text-primary">{file.name}</p>
            <p className="text-caption text-muted">{formatFileSize(file.size)}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFileChange(null)}
            disabled={disabled}
          >
            제거
          </Button>
        </div>
        {error ? (
          <p role="alert" className="mt-1.5 flex items-start gap-1 text-caption text-danger-strong">
            <span aria-hidden="true">⚠</span>
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-strong bg-surface-sunken px-4 py-8 text-center transition-colors duration-fast",
          isDraggingOver && "border-accent bg-accent-subtle",
          error && "border-danger",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span aria-hidden="true" className="text-title">
          ⬆
        </span>
        <span className="text-body text-secondary">엑셀 파일을 끌어다 놓거나</span>

        {/* label 안의 button 은 클릭이 중첩되므로, 시각적 버튼 모양만 span 으로 만든다. */}
        <span className="inline-flex min-h-touch items-center justify-center rounded border border-strong bg-surface px-4 text-body font-medium text-primary">
          파일 선택
        </span>

        <span className="text-caption text-muted">
          {ALLOWED_EXCEL_EXTENSIONS.join(", ")} 만 업로드할 수 있습니다.
        </span>

        <input
          id={inputId}
          type="file"
          accept={ALLOWED_EXCEL_EXTENSIONS.join(",")}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
      </label>

      {error ? (
        <p role="alert" className="mt-1.5 flex items-start gap-1 text-caption text-danger-strong">
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
