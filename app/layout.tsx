import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "성적관리 | 대학 학사 백오피스",
  description: "학과·수강과목·학점환산기준 등록과 성적 일괄 업로드·조회를 위한 백오피스",
};

interface RootLayoutProps {
  children: ReactNode;
}

/**
 * 앱 루트 레이아웃.
 *
 * 전역 프로바이더(인증 컨텍스트, 토스트)만 얹고 화면 구조는 하위 레이아웃에 위임한다.
 * 폰트는 Pretendard CDN(동적 서브셋)으로 로드하며, 실패해도
 * tailwind.config.ts 의 font-sans 폴백 체인이 한글을 커버한다 (design.md 0.3).
 *
 * @param children 하위 라우트
 * @returns html 문서 루트
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
