"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, ArrowRight, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary">
          <MailCheck className="size-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, you&apos;ll get a reset link in the next minute or two. Check spam if you don&apos;t see it.
        </p>
        <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a secure link to set a new password.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@yourcompany.com"
            leadingIcon={<Mail className="size-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Send reset link
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
    </div>
  );
}
