import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Card — trimmed to the one variant the brand actually uses: "gradient".
 * (The original community component shipped seven variants — dots, plus,
 * neubrutalism, inner, lifted, corners, default — none of which fit the
 * brand's light/emerald system, so the rest were removed rather than carried
 * as dead weight.)
 *
 * The gradient frame: faint emerald→green hairlines trace the card's edges
 * and fade at the corners — an architectural, "blueprint" feel that reads as
 * premium without resorting to heavy borders or shadows. Padding/background/
 * radius stay fully in the consumer's hands (via className/style) so this
 * frame can drop onto any existing card shape.
 */

const cardVariants = cva("relative w-full overflow-hidden", {
  variants: {
    variant: {
      gradient: [],
    },
  },
  defaultVariants: {
    variant: "gradient",
  },
})

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  title?: string
  description?: string
}

const GRADIENT_H =
  "bg-gradient-to-l from-transparent via-[var(--elyst-emerald)]/55 to-transparent"
const GRADIENT_V =
  "bg-gradient-to-t from-transparent via-[var(--elyst-emerald)]/55 to-transparent"

const GradientLines = () => (
  <>
    <div className={cn("pointer-events-none absolute left-6 right-6 top-0 z-30 h-px", GRADIENT_H)} />
    <div className={cn("pointer-events-none absolute bottom-0 left-6 right-6 z-30 h-px", GRADIENT_H)} />
    <div className={cn("pointer-events-none absolute inset-y-6 left-0 z-30 w-px", GRADIENT_V)} />
    <div className={cn("pointer-events-none absolute inset-y-6 right-0 z-30 w-px", GRADIENT_V)} />
  </>
)

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, className }))}
        {...props}
      >
        <GradientLines />
        {title && <h3 className="mb-1 text-lg font-bold text-fg">{title}</h3>}
        {description && <p className="text-fg-2">{description}</p>}
        {children}
      </div>
    )
  },
)
Card.displayName = "Card"

export { Card, cardVariants }
