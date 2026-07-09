// Adapted from a pasted styled-components snippet ("wifi-loader") into a
// plain component + index.css rules, since this project doesn't use
// styled-components -- the concentric-arc animation and keyframes are kept
// as-is, just re-themed onto our OKLCH design tokens (primary/muted/
// muted-foreground) instead of the original hardcoded hex colors, and the
// old `#wifi-loader` id selector was changed to a `.wifi-loader` class so
// multiple instances can safely exist on a page at once.
interface WifiLoaderProps {
  text?: string
  className?: string
}

export function WifiLoader({ text = "Loading", className }: WifiLoaderProps) {
  return (
    <div className={`wifi-loader ${className ?? ""}`}>
      <svg className="circle-outer" viewBox="0 0 86 86">
        <circle className="back" cx={43} cy={43} r={40} />
        <circle className="front" cx={43} cy={43} r={40} />
      </svg>
      <svg className="circle-middle" viewBox="0 0 60 60">
        <circle className="back" cx={30} cy={30} r={27} />
        <circle className="front" cx={30} cy={30} r={27} />
      </svg>
      <svg className="circle-inner" viewBox="0 0 34 34">
        <circle className="back" cx={17} cy={17} r={14} />
        <circle className="front" cx={17} cy={17} r={14} />
      </svg>
      <div className="wifi-loader-text" data-text={text} />
    </div>
  )
}

export default WifiLoader
