// components/ui/progress.tsx
"use client";

import * as React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The current progress value (between 0 and max). */
  value: number;
  /** The maximum progress value. Defaults to 100. */
  max?: number;
  /** Optional additional CSS classes. */
  className?: string;
}

/**
 * A simple progress bar component styled with Tailwind CSS.
 */
export function Progress({
  value,
  max = 100,
  className = "",
  ...props
}: ProgressProps) {
  // Ensure that the progress value stays within bounds.
  const safeValue = Math.min(Math.max(value, 0), max);
  const percentage = (safeValue / max) * 100;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-full h-2 bg-gray-200 ${className}`}
      {...props}
    >
      <div
        className="absolute h-full bg-blue-500 transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
