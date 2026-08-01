# REQ — 요구사항 · 설계 문서

에이전트 3인(`spec-architect` → `ui-ux-designer` → `frontend-dev`)이 주고받는 문서를 보관한다.
각 에이전트는 **별도 컨텍스트에서 콜드 스타트**하므로 이 폴더의 파일이 유일한 전달 매체다.

## 구조

```
REQ/
├── README.md                  이 파일 (문서 규약)
├── req_history/               사용자 요청 이력
│   ├── 2026-07.md             월별 원문 로그 (훅이 자동 append)
│   └── 2026-07-29-login.md    기능별 정제 이력 (spec-architect 작성)
└── <기능-slug>/
    ├── spec.md                무엇을 만드는가  (spec-architect)
    └── design.md              어떻게 보이는가  (ui-ux-designer)
```

slug는 영문 kebab-case, 짧게: `login`, `lecture-list`, `student-dashboard`.

## 파이프라인

| 단계 | 에이전트 | 입력 | 출력 |
|---|---|---|---|
| 1 | `spec-architect` | 사용자 요청 | `<slug>/spec.md`, `req_history/<날짜>-<slug>.md` |
| 2 | `ui-ux-designer` | `spec.md` | `<slug>/design.md`, 토큰 정의 |
| 3 | `frontend-dev` | `spec.md` + `design.md` | 실제 코드 |

에이전트는 다음 단계를 스스로 호출하지 않는다. 산출물을 남기고 종료하며, 호출은 메인 세션이 한다.

### 사용 예

```
1) "강의 목록 페이지 만들어줘"     → spec-architect 실행
2) REQ/lecture-list/spec.md 검토·수정
3) ui-ux-designer 실행 (spec.md 경로 전달)
4) REQ/lecture-list/design.md 검토·수정
5) frontend-dev 실행 (두 문서 경로 전달)
```

버튼 색 하나 바꾸는 정도의 작은 변경은 1~4단계를 건너뛰고 `frontend-dev`만 직접 호출해도 된다.

## req_history 규약

- `req_history/YYYY-MM.md` — `UserPromptSubmit` 훅이 사용자 프롬프트 **원문**을 타임스탬프와 함께 자동 append 한다. 사람이 편집하지 않는다. ("무엇을 말했는가"의 기록)
- `req_history/YYYY-MM-DD-<slug>.md` — `spec-architect`가 기능 단위로 남기는 정제 이력. ("그래서 무엇으로 합의됐는가"의 기록)

훅 설정은 [.claude/settings.json](../.claude/settings.json)에 있다.

---

## spec.md 템플릿

```markdown
# <기능명> 스펙

## 1. 배경
왜 이걸 만드는가, 어떤 문제를 푸는가.

## 2. 범위
### In scope
### Out of scope

## 3. 사용자 시나리오
Given / When / Then. 주 흐름 + 예외 흐름.

## 4. 화면 및 라우트
| 라우트 | 화면명 | 역할 | 접근 권한 |

## 5. 데이터 모델
TypeScript 인터페이스 초안. 옵셔널 여부와 의미 명시.

## 6. 상태 정의
화면별 로딩 / 빈 상태 / 에러(네트워크·권한·검증) / 성공.

## 7. 수용 기준
- [ ] 검증 가능한 문장으로.

## 8. 재사용할 기존 자산
파일 경로와 함께.

## 9. 가정 및 미결 사항
```

## design.md 템플릿

```markdown
# <기능명> 디자인 명세

## 1. 화면 구조
ASCII 와이어프레임 또는 영역 서술.

## 2. 브레이크포인트별 레이아웃
| 영역 | 모바일 (<640) | 태블릿 (≥768) | 데스크탑 (≥1024) |

## 3. 사용 토큰
새로 추가한 토큰은 ★ 표시 + 정의값/다크모드값.

## 4. 컴포넌트 명세
목적 / props / variant·size / 상태별 스타일(default·hover·focus-visible·active·disabled·loading·error) / 반응형 동작 / 적용 클래스.

## 5. 인터랙션
전환·애니메이션, prefers-reduced-motion 대응.

## 6. 접근성
대비 4.5:1, focus-visible, 키보드 순서, aria, 색 외 단서.
```

## 스타일 규칙 (전 에이전트 공통)

- 스타일 값의 단일 진실 공급원은 `app/globals.css` + `tailwind.config.ts`
- 컴포넌트는 **시맨틱 토큰만** 사용 (`bg-surface`, `text-muted`) — `bg-[#3b82f6]`, `blue-500` 직접 사용 금지
- 모바일 퍼스트, Tailwind 기본 브레이크포인트 (`sm 640 / md 768 / lg 1024 / xl 1280`)
- 다크모드는 토큰 값 교체로만 대응
