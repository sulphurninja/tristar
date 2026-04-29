"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpgradeNotice({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/60 to-emerald-50/40 p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Lock className="size-5" strokeWidth={2} />
        </div>
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-800">
          <Sparkles className="size-3" /> Available in Tristar+
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-slate-600">
          {description}
        </p>
        <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left text-[12.5px] text-slate-700">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="mt-1.5 size-1 rounded-full bg-amber-500" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild className="bg-amber-600 hover:bg-amber-700">
            <Link href="mailto:support@tristarrealtors.in?subject=Tristar%2B%20Upgrade">
              Talk to ops
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
