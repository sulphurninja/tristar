"use client";

import { useState } from "react";
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

export default function LoginPage() {
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
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Sign in to the Tristar Realtors CRM to manage leads, projects and channel partners.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourcompany.com"
            leadingIcon={<Mail className="size-4" />}
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
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
          {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Sign in
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        First-time setup?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Create the Tristar workspace
        </Link>
      </p>
    </div>
  );
}
