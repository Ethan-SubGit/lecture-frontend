# 대학 성적관리 백오피스 (grade-admin)

대학 학사 담당자가 학과·수강과목(강의)·학점환산기준을 등록하고, 강의 단위로 성적 엑셀을 일괄 업로드해 수강생 성적을 조회·집계하는 웹 프론트엔드다. 기존 백엔드(NestJS, Swagger로만 공개)를 소비하는 화면이 없어 신규로 구축했다.

## 기술 스택

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- Tailwind CSS — 시맨틱 디자인 토큰 기반 스타일 시스템 (`app/globals.css` + `tailwind.config.ts`)
- 별도 UI/차트 라이브러리 없음 — 아이콘·차트(도넛/막대/라인/히스토그램)까지 전부 인라인 SVG로 자체 구현

## 주요 기능

- **인증** — 쿠키 기반 JWT 로그인, 미들웨어 + 레이아웃 2중 가드, 401 시 자동 로그아웃
- **대시보드** — 요약 지표 5종 + 등급분포(막대+도넛/콤보 차트) + 학과별·강의별·학기별 요약, 그리고 확장 분석 8종(위험군 학생, 평가항목별 분석, 학과별 학업성취도, 학과×강의 교차표, 강의별 난이도, 점수 구간 히스토그램, 학생 랭킹, 학기별 추이)
- **수강과목(강의) 관리** — 목록/생성/상세/수정/삭제
- **성적 관리** — 엑셀 일괄 업로드(성공/실패 행 리포트), 수강과목별 성적조회(검색·정렬·페이지네이션), 성적 상세
- **기준정보 관리** — 학과, 학점환산기준(점수→등급 변환 도구 포함)
- 좌측 사이드바 + 상단바 레이아웃, 모바일 드로어, 반응형(모바일 퍼스트), 라이트/다크 모드

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # 필요 시 API 주소 조정
npm run dev                        # http://localhost:3000
```

### 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드 결과 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run typecheck` | TypeScript 타입 검사 (`tsc --noEmit`) |

백엔드 API 주소·프록시 설정은 `.env.local.example`의 안내를 따른다.

## 디렉터리 구조

```
app/                  라우트, 레이아웃, 페이지 (App Router)
components/ui/        원자 컴포넌트 (Button, Card, Badge …)
components/data/      표·차트·페이지네이션 등 데이터 표시 컴포넌트
components/features/  도메인 컴포넌트 (대시보드 섹션, 강의/성적/학과 폼 등)
components/layout/    사이드바·상단바·모바일 드로어 등 앱 셸
components/feedback/  토스트·배너·빈 상태·스켈레톤
hooks/                커스텀 훅
lib/                  API 클라이언트, 유틸리티
types/                도메인 타입 (단일 정의처)
REQ/                  스펙·디자인 문서 (아래 참고)
```

## 문서 & 개발 워크플로

이 프로젝트는 스펙 → 디자인 → 구현을 문서로 이어가는 서브에이전트 파이프라인으로 개발된다. 자세한 규칙은 [CLAUDE.md](CLAUDE.md)와 [REQ/README.md](REQ/README.md)를 참고한다.

- `REQ/grade-admin/spec.md` — 기능 스펙(범위, 시나리오, 데이터 모델, 수용 기준)
- `REQ/grade-admin/design.md` — 화면 레이아웃·토큰·컴포넌트 시각 명세
- `REQ/openapi.json` — 백엔드 OpenAPI 스펙(스냅샷)
- `.claude/agents/` — `spec-architect` / `ui-ux-designer` / `frontend-dev` / `git-ops` 서브에이전트 정의
