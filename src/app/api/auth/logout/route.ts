import { NextResponse, type NextRequest } from "next/server";
import { clearAuthCookies } from "@/lib/auth";

export async function POST() {
  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}

/** Used when the app shell finds the account suspended/removed: clear cookies, bounce to login. */
export async function GET(req: NextRequest) {
  await clearAuthCookies();
  const url = new URL("/login", req.url);
  url.searchParams.set("reason", "inactive");
  return NextResponse.redirect(url);
}
