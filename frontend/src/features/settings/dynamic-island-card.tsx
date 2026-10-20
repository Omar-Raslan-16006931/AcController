import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import {
  configureIslandControls,
  demoLiveActivity,
  diagnoseLiveActivity,
  getIslandApiKey,
  setIslandApiKey,
} from "@/lib/native"

/** Settings > Dynamic Island: shows why it does / doesn't work, plus a demo. */
export function DynamicIslandCard() {
  const [status, setStatus] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [apiKey, setApiKey] = React.useState(getIslandApiKey)

  React.useEffect(() => {
    diagnoseLiveActivity().then(setStatus)
  }, [])

  const demo = async () => {
    setBusy(true)
    try {
      await demoLiveActivity()
      toast.success("Demo started", { description: "Swipe home: the island shows a 2-minute countdown." })
    } catch (err) {
      toast.error("Couldn't start the demo", { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
      setStatus(await diagnoseLiveActivity())
    }
  }

  const saveKey = async () => {
    const key = apiKey.trim()
    setIslandApiKey(key)
    setApiKey(key)
    try {
      await configureIslandControls()
      toast.success(key ? "Key saved" : "Key removed")
    } catch (err) {
      toast.error("Couldn't save the key", { description: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div className="glass space-y-2.5 rounded-[20px] px-3.5 py-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">Dynamic Island</p>
          <p className="text-muted-foreground text-[11.5px]">{status ?? "Checking…"}</p>
        </div>
        <button
          type="button"
          onClick={demo}
          disabled={busy}
          className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-3 text-[12px] font-semibold disabled:opacity-60"
        >
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          Demo
        </button>
      </div>

      <div className="space-y-1.5">
        <p className="text-muted-foreground text-[11.5px]">
          The island's power, temperature, mode and fan buttons use your login, which expires after about an hour with
          the app closed. Paste your Shortcuts API key (SHORTCUT_API_KEY) so they keep working.
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Shortcuts API key (optional)"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-8 text-[12px]"
          />
          <button
            type="button"
            onClick={saveKey}
            className="flex h-8 shrink-0 cursor-pointer items-center rounded-full bg-white/10 px-3 text-[12px] font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
