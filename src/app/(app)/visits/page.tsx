import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Site visits now live under Tasks → Site Visit. */
export default async function VisitsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams({ tab: "site-visit" });
  if (sp.new === "1") q.set("new", "1");
  redirect(`/tasks?${q}`);
}
