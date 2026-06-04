import * as React from "react"
import { cn } from "@/lib/utils"

export type SpinnerSize = "sm" | "md" | "lg"

export function Spinner({ size = "md", className }: { size?: SpinnerSize; className?: string }) {
  const sizes: Record<SpinnerSize, string> = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-4",
    lg: "w-14 h-14 border-4",
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        role="status"
        aria-label="Loading"
        className={cn(
          sizes[size],
          "border-gray-200 dark:border-gray-700 border-t-primary rounded-full animate-spin"
        )}
      />
    </div>
  )
}

export default Spinner
