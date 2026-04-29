"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leadingIcon, trailingIcon, ...props }, ref) => {
    if (leadingIcon || trailingIcon) {
      return (
        <div className={cn("relative flex items-center", className)}>
          {leadingIcon ? (
            <span className="pointer-events-none absolute left-3 text-muted-foreground">{leadingIcon}</span>
          ) : null}
          <input
            type={type}
            ref={ref}
            className={cn(
              "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
              leadingIcon ? "pl-10" : "",
              trailingIcon ? "pr-10" : "",
            )}
            {...props}
          />
          {trailingIcon ? (
            <span className="pointer-events-none absolute right-3 text-muted-foreground">{trailingIcon}</span>
          ) : null}
        </div>
      );
    }
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
