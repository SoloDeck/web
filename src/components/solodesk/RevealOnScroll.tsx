import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  /** Delay in milliseconds before the animation starts (for stagger effect) */
  delay?: number;
}

export function RevealOnScroll({ children, className, delay = 0 }: RevealOnScrollProps) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={cn("reveal-on-scroll", isVisible && "is-visible", className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
