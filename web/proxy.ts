import { NextResponse, type NextRequest } from "next/server";

const PRIVATE_IN_TOOLS_PHASE = [
  "/jobs",
  "/notices",
  "/api/jobs",
  "/api/notifications",
];

export function proxy(request: NextRequest) {
  const phase = process.env.NEXT_PUBLIC_SITE_PHASE ?? process.env.SITE_PHASE ?? "tools";
  if (phase !== "tools") return NextResponse.next();

  const { pathname } = request.nextUrl;
  const isPrivatePath = PRIVATE_IN_TOOLS_PHASE.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isPrivatePath) return NextResponse.next();

  return new NextResponse("Not found", {
    status: 404,
    headers: {
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const config = {
  matcher: ["/jobs/:path*", "/notices/:path*", "/api/jobs/:path*", "/api/notifications/:path*"],
};
