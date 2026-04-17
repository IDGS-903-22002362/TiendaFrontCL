import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition-[color,background-color,border-color] focus:outline-hidden focus:ring-2 focus:ring-ring/20 focus:ring-offset-0",
  {
    variants: {
      variant: {
        default:
          "border-primary/18 bg-primary/12 text-primary hover:bg-primary/16",
        secondary:
          "border-secondary/30 bg-secondary/16 text-secondary-foreground hover:bg-secondary/22",
        destructive:
          "border-destructive/25 bg-destructive/12 text-destructive hover:bg-destructive/18",
        outline: "border-border bg-card/88 text-text-secondary backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

