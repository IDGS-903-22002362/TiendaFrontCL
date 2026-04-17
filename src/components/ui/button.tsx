import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1rem] border border-transparent text-sm font-semibold ring-offset-background transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-card)] hover:-translate-y-px hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-glow)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-card)] hover:-translate-y-px hover:bg-red-700",
        outline:
          "border-border bg-card/88 text-foreground shadow-[inset_0_1px_0_rgb(255_255_255_/_0.7)] hover:-translate-y-px hover:border-primary/35 hover:bg-card hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--shadow-card)] hover:-translate-y-px hover:bg-[var(--secondary-hover)]",
        ghost:
          "border-transparent bg-transparent text-text-secondary hover:bg-accent/75 hover:text-foreground",
        link: "rounded-none border-none px-0 text-primary shadow-none underline-offset-4 hover:text-[var(--primary-hover)] hover:underline",
      },
      size: {
        default: "h-12 px-5 py-2.5",
        sm: "h-10 px-4 text-[0.8125rem]",
        lg: "h-[3.25rem] px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

