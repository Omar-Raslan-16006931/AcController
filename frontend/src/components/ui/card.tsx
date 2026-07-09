import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * iOS "inset grouped" card: borderless white/#1C1C1E surface with a large
 * continuous radius. Definition comes from a soft ambient shadow in light
 * mode and a faint inner ring in dark mode - never a hard 1px border.
 *
 * `glass` swaps that opaque surface for the same liquid-glass treatment as
 * the navbar: translucent card tint + backdrop-filter referencing the
 * shared `#container-glass` SVG distortion filter (glass-filter.tsx), so
 * the starfield/page content behind the card ripples through instead of
 * being hidden by a flat fill. Opt-in per Card rather than the default,
 * since dense/text-heavy surfaces (tables, forms) read better opaque -
 * reserve it for hero/showcase surfaces.
 */
function Card({
  className,
  glass = false,
  ...props
}: React.ComponentProps<"div"> & { glass?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "text-card-foreground flex flex-col gap-3 rounded-[1.25rem] py-4",
        glass
          ? cn(
              "bg-card/55 dark:bg-card/40 border",
              "border-[color-mix(in_oklch,var(--foreground)_10%,transparent)]",
              "[backdrop-filter:url(#container-glass)_blur(20px)_saturate(170%)]",
              "[-webkit-backdrop-filter:blur(20px)_saturate(170%)]",
              "shadow-[inset_0_1px_0_0_color-mix(in_oklch,white_20%,transparent),0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]",
              "dark:shadow-[inset_0_1px_0_0_color-mix(in_oklch,white_8%,transparent)] dark:ring-1 dark:ring-white/[0.06]"
            )
          : cn(
              "bg-card",
              "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]",
              "dark:shadow-none dark:ring-1 dark:ring-white/[0.07]"
            ),
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-4 has-[data-slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-4", className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-4 [.border-t]:pt-4", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
