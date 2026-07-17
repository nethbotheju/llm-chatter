"use client";

import * as React from "react";
import { cn } from "../../utils/cn";

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.25 shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-[var(--primary)]" : "bg-[var(--surface-container-highest)]",
          className
        )}
        ref={ref as React.Ref<HTMLButtonElement>}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        <span
          className={cn(
            "pointer-events-none block h-4.5 w-4.5 rounded-full shadow-lg ring-0 transition-transform",
            checked ? "translate-x-4 bg-[var(--background)]" : "translate-x-0 bg-[var(--outline)]"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
