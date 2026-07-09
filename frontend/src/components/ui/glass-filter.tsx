/**
 * Mounts the shared SVG "liquid glass" distortion filter used by `.menu`
 * (navbar) and `Card`'s `glass` variant. Rendered once, globally, the same
 * way `BackgroundPixelStars` is -- everything else just references it via
 * `backdrop-filter: url(#container-glass) ...`.
 *
 * Frequencies/scale are tuned much lower than a typical decorative glass
 * button (baseFrequency 0.008 vs. 0.05, scale 18 vs. 70): this filter runs
 * on `backdrop-filter`, distorting whatever's behind translucent UI chrome
 * (the starfield background, page content scrolling underneath the nav),
 * not the foreground text/icons sitting on top of it. A subtle ripple reads
 * as "glass"; a strong one would just look like a rendering glitch.
 */
export function GlassFilter() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0 overflow-hidden">
      <defs>
        <filter
          id="container-glass"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.008"
            numOctaves={2}
            seed={92}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation={2} result="blurred-noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurred-noise"
            scale={18}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
