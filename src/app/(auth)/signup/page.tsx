"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Schema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof Schema>;

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(Schema), mode: "onSubmit" });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          workspaceName: "Tristar Realtors",
          workspaceType: "builder",
          region: "IN",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't create your account.");
        return;
      }
      toast.success(`Workspace created. Welcome aboard, ${values.name.split(" ")[0]}!`);
      router.push("/dashboard");
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
        First-time setup
      </p>
      <h1 className="font-display mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-900">
        Create the Tristar workspace
      </h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
        First account becomes the owner. Invite the rest of your team from Settings after signing
        in.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Aditya Sharma"
            leadingIcon={<User className="size-4" />}
            {...register("name")}
            aria-invalid={!!errors.name}
          />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>

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
          <Label htmlFor="password">Create a password</Label>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
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

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create my account
          <ArrowRight className="size-4" />
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have a Tristar account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
