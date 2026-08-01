import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * 인라인 SVG 아이콘 모음 (design.md 4.2.0 / 8절).
 *
 * 외부 아이콘 라이브러리를 도입하지 않는다(의존성 추가 없음).
 * 규칙:
 * - 24×24 viewBox, `stroke="currentColor"`, `fill="none"`, `stroke-width=1.5`
 * - 색을 SVG 안에 넣지 않는다. 색은 항상 부모의 text-* 토큰에서 currentColor 로 상속된다.
 * - 크기는 사용처에서 `h-5 w-5` 같은 유틸로만 준다(기본값 h-5 w-5).
 * - 전부 장식이므로 aria-hidden 이며, 의미는 항상 옆의 텍스트가 전달한다.
 */

interface IconProps {
  /** 크기·색 유틸 클래스. 기본 h-5 w-5 를 덮어쓸 수 있다 */
  className?: string;
}

interface IconBaseProps extends IconProps {
  children: ReactNode;
}

/**
 * 모든 아이콘이 공유하는 SVG 껍데기.
 * 속성이 한 곳에만 있어야 아이콘마다 stroke 규칙이 어긋나는 일이 없다.
 *
 * @param className 크기·색 유틸 클래스
 * @param children path 등 도형 요소
 * @returns svg 요소
 */
function IconBase({ className, children }: IconBaseProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-5 w-5 shrink-0", className)}
    >
      {children}
    </svg>
  );
}

/** 계기판 — 대시보드 메뉴. */
export function GaugeIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="M12 17l4.5-4.5" />
      <path d="M4 20h16" />
    </IconBase>
  );
}

/** 책 — 수강과목 관리 메뉴 / 수강과목 KPI. */
export function BookIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19v13H7.5A2.5 2.5 0 0 0 5 19.5z" />
      <path d="M5 19.5A2.5 2.5 0 0 1 7.5 17H19v3H7.5A2.5 2.5 0 0 1 5 19.5z" />
    </IconBase>
  );
}

/** 클립보드 — 성적관리 메뉴. */
export function ClipboardIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M9 4.5h6v2.5H9z" />
      <path d="M15 5.5h2A1.5 1.5 0 0 1 18.5 7v12A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V7A1.5 1.5 0 0 1 7 5.5h2" />
      <path d="M9 11.5h6M9 15.5h4" />
    </IconBase>
  );
}

/** 슬라이더 — 기준정보 관리 메뉴. */
export function SlidersIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M4 8h8M16.5 8H20M4 16h3.5M12 16h8" />
      <circle cx="14.25" cy="8" r="2.25" />
      <circle cx="9.75" cy="16" r="2.25" />
    </IconBase>
  );
}

/** 아래 화살표 — 아코디언 그룹 펼침/접힘 표시. */
export function ChevronDownIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="m6 9.5 6 6 6-6" />
    </IconBase>
  );
}

/** 햄버거 — 상단바의 드로어 열기 버튼. */
export function MenuIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}

/** 닫기(X) — 드로어 닫기 버튼. */
export function CloseIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </IconBase>
  );
}

/** 건물 — 학과 KPI(기준정보성 지표). */
export function BuildingIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M4.5 20.5V5.5A1 1 0 0 1 5.5 4.5h8a1 1 0 0 1 1 1v15" />
      <path d="M14.5 10.5h4a1 1 0 0 1 1 1v9" />
      <path d="M3 20.5h18" />
      <path d="M7.5 8.5h3M7.5 12.5h3M7.5 16.5h3" />
    </IconBase>
  );
}

/** 체크된 문서 — 성적 건수 KPI(운영 규모 지표). */
export function DocumentCheckIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z" />
      <path d="M13.5 3.5v5h5" />
      <path d="m9 14 2 2 4-4" />
    </IconBase>
  );
}

/** 과녁 — 평균 합계점수 KPI(품질 지표). */
export function TargetIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.75" />
    </IconBase>
  );
}

/** 별 — 평균 평점 KPI(품질 지표). */
export function StarIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="m12 4.5 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
    </IconBase>
  );
}

/** 막대 그래프 — 등급 분포 빈 상태 / 점수 구간 분포 섹션. */
export function ChartIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M4.5 4v16h15" />
      <path d="M8.5 16.5V12M12.5 16.5V8M16.5 16.5v-3" />
    </IconBase>
  );
}

/* ── 확장 분석 8종 전용 아이콘 6개 (design.md 4.31) ─────────────────────────
   기존 규칙 그대로 currentColor 인라인 SVG 다. 색을 SVG 안에 넣지 않는다. */

/** 3×3 격자 — 학과 × 강의 교차표 섹션. */
export function GridIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M4.5 4.5h15v15h-15z" />
      <path d="M9.5 4.5v15M14.5 4.5v15M4.5 9.5h15M4.5 14.5h15" />
    </IconBase>
  );
}

/** 우상향 꺾은선 + 화살촉 — 학기별 추이 섹션. */
export function TrendingUpIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="m4 16 5-5 3.5 3.5L20 8" />
      <path d="M15.5 8H20v4.5" />
    </IconBase>
  );
}

/** 트로피 — 학생 종합 성적 랭킹 섹션. */
export function TrophyIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M7.5 4.5h9v4a4.5 4.5 0 0 1-9 0z" />
      <path d="M7.5 6H5a2 2 0 0 0 2.5 2M16.5 6H19a2 2 0 0 1-2.5 2" />
      <path d="M12 13v3.5M9 19.5h6M10 16.5h4v3h-4z" />
    </IconBase>
  );
}

/** 삼각형 + 느낌표 — 학사경고 위험군 섹션. */
export function AlertTriangleIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M12 4.5 3.5 19h17z" />
      <path d="M12 10v4M12 16.5h.01" />
    </IconBase>
  );
}

/** 방패 + 체크 — 위험군 0명(좋은 소식) 빈 상태 전용. */
export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M12 3.5 5 6v6c0 4 3 7 7 8.5 4-1.5 7-4.5 7-8.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </IconBase>
  );
}

/** 깔때기 + 사선 — "필터가 걸려 있지 않다"는 섹션 기준선 문구 앞 아이콘. */
export function FilterOffIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M4.5 5h15l-6 7v6l-3-2v-4" />
      <path d="m4 20 16-16" />
    </IconBase>
  );
}
