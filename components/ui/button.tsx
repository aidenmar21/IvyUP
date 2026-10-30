import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
 "group/button relative inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 ease-soft outline-none select-none after:absolute after:-inset-1 after:content-[''] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
 "bg-ivy-700 text-paper shadow-[0_1px_0_rgb(18_50_31/0.4)] hover:bg-ivy-800 hover:-translate-y-px hover:shadow-lift active:translate-y-0",
        outline:
 "border-line bg-surface text-ink-900 hover:border-ink-400 hover:bg-paper-2 aria-expanded:bg-paper-2",
        secondary:
 "bg-paper-2 text-ink-900 hover:bg-line/60 aria-expanded:bg-line/60",
        ghost:
 "text-ink-600 hover:bg-paper-2 hover:text-ink-900 aria-expanded:bg-paper-2 aria-expanded:text-ink-900",
        destructive:
 "text-danger hover:bg-danger/10 focus-visible:ring-danger/20",
        link: "text-ivy-700 underline decoration-ivy-200 decoration-2 underline-offset-4 hover:decoration-ivy-700",
      },
      size: {
        default: "h-11 gap-2 px-5 text-base",
        xs: "h-8 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 gap-2 px-6 text-base",
        icon: "size-11",
 "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
 "icon-sm": "size-9",
 "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
