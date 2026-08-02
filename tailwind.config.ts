import type { Config } from "tailwindcss";

/* =============================================================================
   grade-admin — Tailwind 토큰 매핑
   -----------------------------------------------------------------------------
   · 색상 실제 값은 app/globals.css 에만 있다. 여기서는 "이름 → 변수" 매핑만 한다.
   · fontSize / borderRadius / zIndex 는 theme 루트에서 "교체"한다.
     → Tailwind 기본 스케일(text-xs, rounded-3xl 등)이 사라지므로 스케일 밖 값을
       쓰려는 시도가 빌드 단계에서 드러난다. 의도된 제약이다.
   · spacing 은 Tailwind 기본 4px 스케일을 유지하되, 실제 사용은 아래 허용 스텝만:
       0 · 0.5 · 1 · 1.5 · 2 · 3 · 4 · 5 · 6 · 8 · 10 · 12 · 16
   ============================================================================= */

const t = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class", // <html class="dark|light">. 미지정 시 globals.css 의 OS 설정 분기가 적용된다.
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    /* ---------------------------------------------------------------- 타이포 */
    fontSize: {
      // [size, { lineHeight, letterSpacing }]
      micro: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }], // 12px — md 이상에서만(배지 내부 보조)
      caption: ["0.875rem", { lineHeight: "1.25rem" }], // 14px — 라벨/메타. 본문 아님
      "body-sm": ["0.875rem", { lineHeight: "1.375rem" }], // 14px — md: 접두어와 함께만 사용(표 밀도)
      body: ["1rem", { lineHeight: "1.5rem" }], // 16px — 기본 본문·모든 입력요소
      section: ["1.125rem", { lineHeight: "1.625rem" }], // 18px — 카드/섹션 제목
      title: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
      display: ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.01em" }], // 24px — 페이지 제목(모바일)
      "display-lg": ["1.875rem", { lineHeight: "2.375rem", letterSpacing: "-0.015em" }], // 30px — lg:
      metric: ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.01em" }], // 28px — KPI 숫자(모바일)
      "metric-lg": ["2.25rem", { lineHeight: "2.625rem", letterSpacing: "-0.015em" }], // 36px — lg:
    },

    /* ---------------------------------------------------------------- radius */
    borderRadius: {
      none: "0",
      sm: "0.25rem", // 4  — 배지, 태그
      DEFAULT: "0.375rem", // 6  — 버튼, 입력
      md: "0.375rem",
      lg: "0.5rem", // 8  — 카드
      xl: "0.75rem", // 12 — 모달, 시트, 패널
      "2xl": "1rem", // 16 — 바텀시트 상단
      full: "9999px",
    },

    /* --------------------------------------------------------------- z-index */
    zIndex: {
      auto: "auto",
      base: "0",
      raised: "10", // sticky 표 헤더 / sticky 컬럼
      header: "30", // 앱 셸 = 상단바(TopBar) + 데스크탑 상시 사이드바(Sidebar)
      overlay: "40", // 백드롭(딤). 반드시 drawer/modal 보다 "아래"에 있어야 한다.
      drawer: "50", // 모바일/태블릿 내비 드로어 패널 (백드롭 위)
      modal: "60", // 모달 다이얼로그 (백드롭 위)
      toast: "70", // 토스트(항상 최상단)
    },

    extend: {
      /* ------------------------------------------------------------- colors */
      colors: {
        canvas: t("canvas"),
        surface: {
          DEFAULT: t("surface"),
          sunken: t("surface-sunken"),
          raised: t("surface-raised"),
          hover: t("surface-hover"),
          selected: t("surface-selected"),
        },
        overlay: t("overlay"),
        skeleton: t("skeleton"),
        focus: t("focus"),
        accent: {
          DEFAULT: t("accent"),
          hover: t("accent-hover"),
          active: t("accent-active"),
          subtle: t("accent-subtle"),
          strong: t("accent-strong"),
        },
        success: {
          DEFAULT: t("success"),
          hover: t("success-hover"),
          subtle: t("success-subtle"),
          strong: t("success-strong"),
        },
        warning: {
          DEFAULT: t("warning"),
          hover: t("warning-hover"),
          subtle: t("warning-subtle"),
          strong: t("warning-strong"),
        },
        danger: {
          DEFAULT: t("danger"),
          hover: t("danger-hover"),
          subtle: t("danger-subtle"),
          strong: t("danger-strong"),
        },
        "on-accent": t("on-accent"),
        "on-success": t("on-success"),
        "on-warning": t("on-warning"),
        "on-danger": t("on-danger"),
      },

      /* text-primary / text-secondary / text-muted / text-inverse
         (bg-primary 같은 오용을 막기 위해 textColor 에만 등록한다) */
      textColor: {
        primary: t("text-primary"),
        secondary: t("text-secondary"),
        muted: t("text-muted"),
        inverse: t("text-inverse"),
      },
      placeholderColor: {
        muted: t("text-muted"),
      },
      borderColor: {
        DEFAULT: t("border-subtle"),
        subtle: t("border-subtle"),
        strong: t("border-strong"),
      },
      divideColor: {
        subtle: t("border-subtle"),
        strong: t("border-strong"),
      },

      /* ------------------------------------------------------------- SVG 선색
         border-subtle / text-primary 는 borderColor / textColor 에만 등록되어 있어
         stroke-border-subtle · stroke-text-primary 같은 클래스가 **생성되지 않는다.**
         차트에서 이 두 색을 선으로 쓰려면 stroke 스케일에 별도 이름이 필요하다.
         값은 같은 CSS 변수를 가리키므로 다크모드는 토큰 교체로 자동 대응된다.
         (colors 에 등록된 success/accent/warning/danger/surface 계열은
          stroke-*, fill-* 가 자동 생성되므로 여기에 다시 적지 않는다.) */
      stroke: {
        "chart-grid": t("border-subtle"), // 가로 그리드선·기준선
        "chart-line": t("text-primary"), // 콤보 차트의 비율(%) 꺾은선 + 마커 테두리
      },

      /* ------------------------------------------------------------ 크기 토큰 */
      maxWidth: {
        content: "80rem", // 1280 — 일반 페이지 본문 컨테이너
        wide: "90rem", // 1440 — 대시보드/9열 표 페이지
        form: "42rem", // 672  — 단일 컬럼 폼
        detail: "56rem", // 896  — 상세 화면
        auth: "24rem", // 384  — 로그인 카드
        modal: "32rem", // 512
        prose: "65ch",
        /* (삭제됨) donut: "14rem"
           등급분포 도넛 차트가 막대+라인 콤보 차트(GradeComboChart)로 교체되면서
           "최대 지름" 개념이 사라졌다. 콤보 차트는 폭을 부모에 100% 맡기고
           높이만 height.chart / height.chart-lg 로 고정한다. */
      },
      minWidth: {
        touch: "2.75rem", // 44px 터치 타깃
        "table-sm": "40rem", // 3~4열 표(학과, 학점환산기준)
        "table-md": "52rem", // 5~6열 표(강의)
        "table-lg": "68rem", // 9~10열 표(성적조회)
        /* 교차표(학과 × 강의) 전용 — 열 개수가 **데이터에 따라 달라지는** 표에 쓴다.
           min-w-table-* 는 표 전체의 고정 최소폭이라 학과가 15개로 늘어나면
           열당 폭이 뭉개진다. 그래서 표 최소폭 대신 **셀 최소폭**을 주고
           표가 열 개수만큼 자연스럽게 넓어지게 한다(.scroll-x 가 흡수한다).
           112px 근거: "12명 / 78.3점 / ▲+2.1" 3줄이 px-3 패딩 안에서 줄바꿈 없이 들어가는 최소치. */
        "matrix-cell": "7rem", // 112 — 교차표 데이터 셀 1칸
        /* 교차표 행 머리(강의명 + 학기 2줄)의 최소폭. sticky 컬럼이라 너무 넓으면 화면을 잡아먹는다.
           176px 근거: 「데이터베이스개론」(9자) + text-body-sm 이 1줄에 들어가는 폭. */
        "matrix-head": "11rem", // 176 — 교차표 첫 컬럼(강의)
        /* 진행 단계에 따라 **라벨이 바뀌는 버튼**의 최소폭 (design.md 3.7 / 4.33).
           Button 의 loading 관례는 "라벨을 유지하므로 폭이 흔들리지 않는다"를 전제로 하는데,
           /scores 의 [엑셀 다운로드]만 라벨이
           `엑셀 다운로드` → `목록 불러오는 중…` → `엑셀 만드는 중…` 3단계로 바뀐다.
           폭을 고정하지 않으면 버튼이 커졌다 작아지며 툴바가 출렁이고,
           방금 누른 버튼이 커서/손가락 아래에서 움직인다.
           208px 근거: 최장 라벨(text-body 16px 한글 8자 ≈128 + 말줄임표·공백 ≈24)
                      + 스피너 16 + gap-2 8 + px-4 좌우 32 = 208.
           모바일은 fullWidth 라 적용되지 않는다 — sm: 이상에서만 붙인다. */
        "action-wide": "13rem", // 208 — 라벨이 바뀌는 액션 버튼(엑셀 다운로드)
      },
      minHeight: {
        touch: "2.75rem",
      },
      width: {
        drawer: "20rem", // 320 — <lg 내비 드로어 패널 폭(터치 여유를 위해 사이드바보다 넓다)
        toast: "22rem", // md 이상 토스트 폭
      },
      height: {
        header: "3.5rem", // 56 — 상단바(TopBar) 모바일/태블릿
        "header-md": "4rem", // 64 — 상단바(TopBar) md 이상
        control: "2.75rem", // 44 — 버튼/입력 기본(터치)
        "control-dense": "2.25rem", // 36 — md 이상 보조 컨트롤
        /* 등급분포 콤보 차트(GradeComboChart)의 플롯 영역 높이.
           폭은 부모에 100% 맡기고(고정 px 폭 금지) 높이만 토큰으로 고정한다.
           SVG viewBox 는 preserveAspectRatio="none" 없이 폭에 맞춰 늘어나므로
           높이를 정해 두지 않으면 좁은 화면에서 차트가 납작해진다.
           160px 근거: 가로 그리드선 4개(3구간) 사이 간격이 ≈53px 로,
           text-micro(12px) y축 눈금 라벨이 겹치지 않는 최소치. */
        chart: "10rem", // 160 — 모바일
        "chart-lg": "12rem", // 192 — md 이상(카드가 넓어지면 세로도 함께 키운다)
      },
      spacing: {
        touch: "2.75rem",
        /* 데스크탑(lg~) 상시 사이드바의 고정 폭.
           spacing 에 두면 w-sidebar / lg:pl-sidebar / lg:left-sidebar 가 한 번에 생겨
           "사이드바 폭"이라는 하나의 값을 여러 축에서 재사용할 수 있다.
           272px — 「수강과목별 성적조회」 같은 최장 라벨이 들여쓰기 포함 1줄에 들어가는 최소치. */
        sidebar: "17rem",
      },

      /* -------------------------------------------------------- 그림자/모션 */
      boxShadow: {
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
        overlay: "var(--shadow-overlay)",
        none: "none",
      },
      transitionDuration: {
        fast: "120ms",
        base: "180ms",
        slow: "240ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(0.5rem) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        /* 내비 드로어 전용. 데스크탑 사이드바가 좌측에 있으므로
           <lg 드로어도 "같은 방향(좌측)"에서 들어와야 공간 감각이 일치한다. */
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(0.75rem)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms cubic-bezier(0.2,0,0,1)",
        "scale-in": "scale-in 180ms cubic-bezier(0.2,0,0,1)",
        "slide-in-right": "slide-in-right 240ms cubic-bezier(0.2,0,0,1)",
        "slide-in-left": "slide-in-left 240ms cubic-bezier(0.2,0,0,1)",
        "slide-in-bottom": "slide-in-bottom 240ms cubic-bezier(0.2,0,0,1)",
        "toast-in": "toast-in 180ms cubic-bezier(0.2,0,0,1)",
      },

      /* -------------------------------------------------------------- 기타 */
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      gridTemplateColumns: {
        // 상세 화면 정의목록: 라벨 고정 + 값 가변 (md 이상)
        "detail-2": "minmax(7rem, 10rem) 1fr",
        /* 차트 축 레이아웃: [y축 눈금 라벨(내용폭)] [플롯 영역(가변)].
           minmax(0,1fr) 이어야 SVG 가 트랙을 밀어 카드가 가로로 넘치지 않는다.
           2행으로 쓰면 2행 1열은 빈 칸, 2행 2열이 x축 라벨이 되어
           라벨 열 폭이 플롯 폭과 정확히 일치한다(= 밴드 정렬이 맞는다). */
        "chart-axis": "auto minmax(0, 1fr)",
        /* 좌우 **양쪽에 y축 눈금이 있는** 차트 레이아웃:
           [좌 눈금(내용폭)] [플롯(가변)] [우 눈금(내용폭)].
           학기별 추이 차트(TermTrendChart)처럼 두 계열의 단위가 다르고
           **두 축 모두 눈금 값을 밝혀야 하는** 경우에만 쓴다.
           (등급분포 콤보 차트는 우축이 0~100 고정이라 눈금 없이 범례 문구로 대신한다.)
           2행으로 쓰면 2행 2열이 x축 라벨이 되어 밴드 정렬이 자동으로 맞는다. */
        "chart-axis-2y": "auto minmax(0, 1fr) auto",
      },
    },
  },
  plugins: [],
};

export default config;
