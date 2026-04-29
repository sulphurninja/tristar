import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  title: string;
  description: string;
  phase: string;
  features?: string[];
}

export function ComingSoon({ title, description, phase, features }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6 lg:p-10">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-10 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-white shadow-sm">
          <Sparkles className="size-5 text-primary" />
        </div>
        <Badge variant="softBlue" className="mt-4">
          Shipping in {phase}
        </Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>

        {features?.length ? (
          <ul className="mx-auto mt-6 grid max-w-xl grid-cols-1 gap-2 text-left sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 rounded-md border border-border bg-white p-3 text-sm">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" /> Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
