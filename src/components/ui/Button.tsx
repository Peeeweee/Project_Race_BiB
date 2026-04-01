import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm": variant === "default",
            "bg-[var(--color-secondary)] text-[var(--color-text)] hover:bg-[var(--color-secondary-hover)] shadow-sm": variant === "secondary",
            "border-2 border-[var(--color-border)] bg-transparent hover:bg-[var(--color-background)] text-[var(--color-text)]": variant === "outline",
            "hover:bg-[var(--color-background)] text-[var(--color-text)]": variant === "ghost",
            "h-10 px-6 py-2": size === "default",
            "h-9 rounded-full px-4": size === "sm",
            "h-12 rounded-full px-8 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
