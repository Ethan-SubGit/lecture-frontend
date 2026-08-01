"use client";

import { useCallback, useState, type FormEvent } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Input";
import { AlertBanner } from "@/components/feedback/AlertBanner";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { FileDropzone } from "@/components/features/scores/FileDropzone";
import { ExcelColumnGuide } from "@/components/features/scores/ExcelColumnGuide";
import { UploadResultPanel } from "@/components/features/scores/UploadResultPanel";
import { useAsyncData } from "@/hooks/useAsyncData";
import { ApiError } from "@/lib/api/client";
import { fetchLectures, uploadStudentScores } from "@/lib/api/endpoints";
import { NETWORK_ERROR_MESSAGE } from "@/lib/constants";
import { validateExcelExtension } from "@/lib/validation";
import type { UploadExcelResponseDto } from "@/types/api";

/** 400(파일/강의 누락) 시 서버 메시지가 없을 때 쓰는 기본 문구. */
const BAD_REQUEST_MESSAGE = "엑셀 파일을 첨부하고 강의를 선택해 주세요.";

/** 500(전량 롤백) 시 표시할 원인 설명. */
const ROLLBACK_DESCRIPTION =
  "해당 강의에 이미 등록된 성적이 있거나, 존재하지 않는 강의이거나, 파일 내 학번이 중복되었습니다.";

/**
 * 성적입력 — 엑셀 일괄 업로드 (`/scores/upload`).
 *
 * 강의는 사전 등록이 필수이므로 자유 입력이 아니라 `GET /lectures` 드롭다운에서 고르게 하고,
 * 선택된 강의의 name 과 term 을 각각 전송한다 (spec.md 5.2).
 *
 * @returns 업로드 화면
 */
export default function ScoreUploadPage() {
  const fetcher = useCallback(() => fetchLectures(), []);
  const { data: lectures, isLoading: isLoadingLectures, error: lecturesError, refetch } =
    useAsyncData(fetcher);

  const [selectedLectureId, setSelectedLectureId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadExcelResponseDto | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectedLecture = lectures?.find((lecture) => lecture.id === selectedLectureId);
  const hasNoLectures = Boolean(lectures) && lectures?.length === 0;

  /** 파일 선택 시 즉시 확장자를 검증해 잘못된 파일로 제출까지 가지 않게 한다. */
  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setFileError(nextFile ? validateExcelExtension(nextFile.name) : undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setServerError(null);

    if (!selectedLecture || !file) {
      setFormError(BAD_REQUEST_MESSAGE);
      return;
    }

    // 확장자 오류가 있으면 요청 자체를 보내지 않는다 (수용 기준).
    const extensionError = validateExcelExtension(file.name);
    if (extensionError) {
      setFileError(extensionError);
      return;
    }

    setIsUploading(true);
    // 이전 결과를 지워 새 업로드 결과와 섞이지 않게 한다.
    setResult(null);

    try {
      const response = await uploadStudentScores(
        file,
        selectedLecture.name,
        selectedLecture.term,
      );
      setResult(response);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        // 400 은 폼 상단 배너로 (결과 영역이 아니라).
        setFormError(caught.message || BAD_REQUEST_MESSAGE);
      } else if (caught instanceof ApiError && caught.status >= 500) {
        // 500 은 전량 롤백이다. 결과 영역에서 부분 실패와 정반대 문구로 구분해 보여준다.
        setServerError(ROLLBACK_DESCRIPTION);
      } else if (caught instanceof ApiError && caught.isNetworkError) {
        setFormError(NETWORK_ERROR_MESSAGE);
      } else if (!(caught instanceof ApiError) || caught.status !== 401) {
        setFormError(NETWORK_ERROR_MESSAGE);
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="성적입력"
        description="수강과목을 선택하고 성적 엑셀 파일을 업로드합니다."
      />

      <div className="mt-6 space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
        <div className="lg:col-span-2">
          {lecturesError ? (
            <AlertBanner
              tone="error"
              title={NETWORK_ERROR_MESSAGE}
              className="mb-4"
              action={
                <Button variant="secondary" size="sm" onClick={refetch}>
                  다시 시도
                </Button>
              }
            />
          ) : null}

          {hasNoLectures ? (
            <EmptyState
              title="먼저 수강과목을 등록해 주세요."
              description="성적을 등록하려면 대상 강의가 미리 등록되어 있어야 합니다."
              action={
                <Button variant="primary" href="/lectures/new" fullWidth className="sm:w-auto">
                  수강과목 생성
                </Button>
              }
            />
          ) : (
            <Card>
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {formError ? <AlertBanner tone="error" title={formError} /> : null}

                {/* 업로드 중에는 파일·강의 변경이 잠겨 중복 제출이 불가능하다. */}
                <fieldset disabled={isUploading} className="space-y-5">
                  <Field label="수강과목" htmlFor="upload-lecture" required>
                    <Select
                      id="upload-lecture"
                      className="md:max-w-form"
                      value={selectedLectureId}
                      onChange={(event) => setSelectedLectureId(event.target.value)}
                      // 강의 목록을 불러오는 동안에는 선택할 수 없다.
                      disabled={isLoadingLectures || isUploading}
                      required
                    >
                      {isLoadingLectures ? (
                        <option value="">강의 목록을 불러오는 중…</option>
                      ) : (
                        <>
                          <option value="">수강과목을 선택하세요</option>
                          {(lectures ?? []).map((lecture) => (
                            // 강의명 + 학기를 함께 표시한다(수용 기준).
                            <option key={lecture.id} value={lecture.id}>
                              {lecture.name} ({lecture.term})
                            </option>
                          ))}
                        </>
                      )}
                    </Select>
                  </Field>

                  <div className={isUploading ? "is-refetching" : undefined}>
                    <p className="mb-1.5 text-caption font-medium text-secondary">
                      성적 엑셀 파일
                      <span className="text-danger" aria-hidden="true">
                        {" *"}
                      </span>
                      <span className="sr-only"> (필수)</span>
                    </p>
                    <FileDropzone
                      file={file}
                      onFileChange={handleFileChange}
                      error={fileError}
                      disabled={isUploading}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    loading={isUploading}
                    fullWidth
                    className="md:w-auto"
                  >
                    {isUploading ? "업로드 중…" : "업로드"}
                  </Button>
                </fieldset>
              </form>
            </Card>
          )}
        </div>

        {/* 컬럼 안내: 모바일·태블릿은 폼 아래 접기 가능(기본 펼침), lg 이상은 우측 고정 카드. */}
        <div className="lg:col-span-1">
          <details open className="lg:hidden">
            <summary className="min-h-touch cursor-pointer rounded py-3 text-body font-medium text-secondary focus-ring">
              엑셀 컬럼 순서 안내
            </summary>
            <div className="mt-2">
              <ExcelColumnGuide />
            </div>
          </details>

          <div className="hidden lg:sticky lg:top-24 lg:block">
            <ExcelColumnGuide />
          </div>
        </div>

        {/* 결과 영역은 폼 카드 아래 전체폭. 실패 사유 텍스트가 길어 좌우로 쪼개지 않는다. */}
        <div className="lg:col-span-3">
          {isUploading ? (
            <div aria-busy="true" className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <UploadResultPanel
              result={result}
              serverError={serverError}
              lectureName={selectedLecture?.name ?? ""}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
