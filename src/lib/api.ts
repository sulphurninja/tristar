import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { can, loadAccess, recordVisible, runWithSession, type AuthSession } from "@/lib/access";
import { requiredPermission } from "@/lib/route-policy";

export type RouteContext<P extends Record<string, string> = Record<string, never>> = {
  params: Promise<P>;
};

export type AuthedHandler<P extends Record<string, string> = Record<string, never>> = (args: {
  req: NextRequest;
  session: AuthSession;
  params: P;
}) => Promise<Response> | Response;

/**
 * Wraps a route handler with auth, authorisation and a db connection.
 * - 401 when there is no token, or the user was deleted / suspended.
 * - 403 when the route policy (lib/route-policy) needs a permission they lack.
 * The handler gets the live session (role and permissions read from the DB),
 * which is also available to deep helpers through `currentSession()`.
 */
export function withAuth<P extends Record<string, string> = Record<string, never>>(
  handler: AuthedHandler<P>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>) => {
    const token = await getCurrentSession();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      await connectDB();
      const session = await loadAccess(token);
      if (!session) {
        return NextResponse.json({ error: "Your account is no longer active." }, { status: 401 });
      }
      const need = requiredPermission(req.method, req.nextUrl.pathname);
      if (need && !(need === "owner" ? session.role === "owner" : can(session, need))) {
        return NextResponse.json(
          { error: "You don't have permission to do this. Ask your administrator for access.", code: "FORBIDDEN" },
          { status: 403 },
        );
      }
      if (!(await recordVisible(req.nextUrl.pathname, session))) {
        return NextResponse.json({ error: "Not found, or outside your access." }, { status: 404 });
      }
      const params = ctx?.params ? await ctx.params : ({} as P);
      return await runWithSession(session, () => handler({ req, session, params }));
    } catch (err) {
      console.error("[api]", err);
      const message = err instanceof Error ? err.message : "Internal error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
