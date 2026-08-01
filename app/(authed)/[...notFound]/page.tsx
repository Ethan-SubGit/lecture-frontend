import { notFound } from "next/navigation";

/**
 * 인증 라우트 그룹의 catch-all 라우트.
 *
 * 정의되지 않은 경로를 이 그룹 안으로 끌어와 `notFound()` 를 던짐으로써
 * 사이드바·상단바가 있는 앱 셸 위에서 `(authed)/not-found.tsx` 가 렌더되게 한다.
 * (Next.js 는 명시적 라우트를 catch-all 보다 우선 매칭하므로 기존 화면에는 영향이 없다.)
 *
 * 미인증 사용자가 이 경로에 들어오면 인증 레이아웃의 `/users/me` 가드가
 * 401 을 받아 로그인 화면으로 보낸다.
 *
 * @returns 렌더되지 않는다 (항상 404 로 분기)
 */
export default function AuthedCatchAllPage(): never {
  notFound();
}
