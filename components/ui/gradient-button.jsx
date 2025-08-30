"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const gradientButtonVariants = cva(
  [
    "gradient-button",
    "inline-flex items-center justify-center",
    "rounded-[11px] min-w-[132px] px-9 py-4",
    "text-base leading-[19px] font-[500] text-white",
    "font-sans font-bold",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "transition-all duration-200 hover:scale-105 hover:shadow-lg",
    "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800",
    "hover:from-blue-700 hover:via-purple-700 hover:to-blue-900",
    "shadow-lg shadow-blue-500/25",
  ],
  {
    variants: {
      variant: {
        default: "",
        variant: [
          "gradient-button-variant",
          "bg-gradient-to-r from-green-600 via-teal-600 to-green-800",
          "hover:from-green-700 hover:via-teal-700 hover:to-green-900",
          "shadow-green-500/25",
        ],
        admin: [
          "bg-gradient-to-r from-red-600 via-pink-600 to-red-800",
          "hover:from-red-700 hover:via-pink-700 hover:to-red-900",
          "shadow-red-500/25",
        ],
        guest: [
          "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800",
          "hover:from-purple-700 hover:via-indigo-700 hover:to-purple-900",
          "shadow-purple-500/25",
        ],
        resident: [
          "bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-800",
          "hover:from-emerald-700 hover:via-cyan-700 hover:to-emerald-900",
          "shadow-emerald-500/25",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const GradientButton = React.forwardRef(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(gradientButtonVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
GradientButton.displayName = "GradientButton"

export { GradientButton, gradientButtonVariants }
