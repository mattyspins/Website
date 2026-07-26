import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const OBS_PATHS = ['/bingo-widget', '/bonus-hunt-widget', '/tournament-widget', '/picker-widget', '/king-of-the-hill-widget', '/high-roller-widget', '/boss-raid-widget', '/bounty-hunter-widget'];

// /admin is deliberately NOT flagged here: the root layout renders once per full
// page load, so a header can't tell it that a *client-side* navigation moved
// into /admin. SiteChrome decides that from the pathname instead.
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  if (OBS_PATHS.some(p => request.nextUrl.pathname.startsWith(p))) {
    requestHeaders.set('x-obs-route', '1');
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/bingo-widget/:path*', '/bonus-hunt-widget/:path*', '/tournament-widget/:path*', '/picker-widget/:path*', '/king-of-the-hill-widget/:path*', '/high-roller-widget/:path*', '/boss-raid-widget/:path*', '/bounty-hunter-widget/:path*'],
};
