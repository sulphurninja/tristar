"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof Schema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(Schema), mode: "onSubmit" });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = data?.code as string | undefined;
        if (code === "NO_ACCOUNT") {
          toast.error(data.error, {
            action: { label: "Sign up", onClick: () => router.push("/signup") },
          });
        } else {
          toast.error(data.error || "Couldn't sign you in.");
        }
        return;
      }
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}`);
      router.push(next);
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@tristarrealtors.in"
          leadingIcon={<Mail className="size-4" />}
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter your password"
          leadingIcon={<Lock className="size-4" />}
          trailingIcon={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="pointer-events-auto text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
          {...register("password")}
          aria-invalid={!!errors.password}
        />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full" loading={isSubmitting}>
        Sign in to CRM
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
        Tristar CRM
      </p>
      <h1 className="font-display mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-900">
        Welcome back
      </h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
        Sign in to manage leads, site visits, channel partners and bookings.
      </p>

      <Suspense fallback={<div className="mt-8 h-[280px] animate-pulse rounded-xl bg-slate-100" />}>
        <LoginForm />
      </Suspense>

      <p className="mt-8 text-center text-[13.5px] text-slate-500">
        First-time setup?{" "}
        <Link href="/signup" className="font-semibold text-emerald-700 hover:underline">
          Create the Tristar workspace
        </Link>
      </p>
    </div>
  );
}
