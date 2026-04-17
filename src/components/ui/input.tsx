import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-[1rem] border border-input bg-card/92 px-4 py-3 text-base text-foreground shadow-[inset_0_1px_0_rgb(255_255_255_/_0.82)] ring-offset-background transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-text-muted focus-visible:border-primary/65 focus-visible:bg-card-elevated focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

