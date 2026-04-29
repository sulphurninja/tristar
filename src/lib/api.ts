import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession, type JwtPayload } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";

export type RouteContext<P extends Record<string, string> = Record<string, never>> = {
  params: Promise<P>;
};

export type AuthedHandler<P extends Record<string, string> = Record<string, never>> = (args: {
  req: NextRequest;
  session: JwtPayload;
  params: P;
}) => Promise<Response> | Response;

/**
 * Wraps a route handler with auth + db connection.
 * Returns 401 if no session, otherwise calls handler with session.
 */
export function withAuth<P extends Record<string, string> = Record<string, never>>(
  handler: AuthedHandler<P>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>) => {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      await connectDB();
      const params = ctx?.params ? await ctx.params : ({} as P);
      return await handler({ req, session, params });
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
