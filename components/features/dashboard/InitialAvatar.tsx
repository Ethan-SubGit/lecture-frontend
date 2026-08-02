import { cn } from "@/lib/cn";

/** 톤별 칩 색. 위험군 명단에서만 danger 를 쓴다. */
const TONE_CLASSES = {
  neutral: "bg-surface-sunken text-secondary",
  danger: "bg-danger-subtle text-danger-strong",
} as const;

/** 이니셜 칩 톤. */
export type InitialAvatarTone = keyof typeof TONE_CLASSES;

interface InitialAvatarProps {
  /**
   * **마스킹된** 학생 이름. 첫 글자만 사용한다.
   * 호출부가 `maskStudentName` 을 거친 값을 넘긴다 — 원본 실명을 여기로 되돌리지 말 것.
   */
  name: string;
  tone?: InitialAvatarTone;
}

/**
 * 이니셜 아바타 칩 (design.md 4.21.4) — 랭킹·위험군 표 전용.
 *
 * 이 도메인에는 사진이 없으므로 이름 첫 글자 원형 칩으로 대체한다.
 * **식별자가 아니다** — 행의 식별자는 항상 텍스트로 보이는 학번이며(동명이인 존재),
 * 칩은 긴 명단에서 행을 눈으로 찾는 앵커 역할만 한다.
 *
 * ⚠️ **넘어오는 `name` 은 마스킹된 이름이다**(spec.md 5.6 (라)).
 * 마스킹은 index 1 을 가리므로 첫 글자는 원본과 같고 칩의 표시 결과는 마스킹 전과 동일하다.
 * 예외는 1글자 이름 하나로, 이때 칩이 `*` 가 되며 이는 의도된 결과다.
 * 칩을 전부 `*` 로 채우면 모든 행이 같은 원이 되어 앵커라는 존재 이유가 사라지므로
 * **이 컴포넌트에서 다시 마스킹하지 않는다.**
 *
 * 바로 옆에 이름 전체가 텍스트로 있으므로 `aria-hidden` 이 필수다
 * (없으면 "홍 홍*동"으로 낭독된다).
 *
 * @param name 마스킹된 학생 이름
 * @param tone 칩 색 톤
 * @returns 이니셜 칩. 이름이 비어 있으면 빈 원을 그리지 않고 null
 */
export function InitialAvatar({ name, tone = "neutral" }: InitialAvatarProps) {
  const initial = name.trim().charAt(0);
  if (!initial) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-caption font-semibold",
        TONE_CLASSES[tone],
      )}
    >
      {initial}
    </span>
  );
}
