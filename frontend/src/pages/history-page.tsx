import * as React from "react"
import { format } from "date-fns"
import { Search, Trash2, ChevronLeft, ChevronRight, History as HistoryIcon, CheckCircle2, XCircle } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useHistory, useDeleteHistoryEntry, useClearHistory } from "@/features/history/use-history"
import { modeConfig, fanConfig, commandSourceLabels } from "@/lib/ac-labels"

const PAGE_SIZE = 20

export function HistoryPage() {
  const [searchInput, setSearchInput] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [result, setResult] = React.useState<"all" | "success" | "failure">("all")
  const [page, setPage] = React.useState(0)
  const [clearOpen, setClearOpen] = React.useState(false)

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput)
      setPage(0)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const { data, isLoading, isFetching } = useHistory({ search, result, page, pageSize: PAGE_SIZE })
  const deleteEntry = useDeleteHistoryEntry()
  const clearHistory = useClearHistory()

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader
        title="History"
        description="Every command sent to the AC, with its result. Auto-trimmed to the last 7 days."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={total === 0}
            onClick={() => setClearOpen(true)}
          >
            <Trash2 className="size-4" />
            Clear all
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search mode, fan, source…"
            className="h-9 pl-8 text-xs"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select value={result} onValueChange={(v) => { setResult(v as typeof result); setPage(0) }}>
          <SelectTrigger className="h-9 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      )}

      {!isLoading && total === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
              <HistoryIcon className="size-6" />
            </div>
            <p className="text-muted-foreground text-sm">No commands recorded yet.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && total > 0 && (
        <Card className={isFetching ? "opacity-70 transition-opacity" : ""}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 px-2.5 text-[11px]">Date &amp; time</TableHead>
                <TableHead className="h-8 px-2.5 text-[11px]">Power</TableHead>
                <TableHead className="h-8 px-2.5 text-[11px]">Temp</TableHead>
                <TableHead className="h-8 px-2.5 text-[11px]">Mode</TableHead>
                <TableHead className="h-8 px-2.5 text-[11px]">Fan</TableHead>
                <TableHead className="h-8 px-2.5 text-[11px]">Source</TableHead>
                <TableHead className="h-8 px-2.5 text-[11px]">Result</TableHead>
                <TableHead className="h-8 px-2.5 text-right text-[11px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground p-2.5 text-xs">
                    {format(new Date(entry.created_at), "MMM d, h:mm:ss a")}
                  </TableCell>
                  <TableCell className="p-2.5">
                    <Badge variant={entry.power ? "success" : "secondary"} className="text-[11px]">
                      {entry.power ? "On" : "Off"}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-2.5 text-xs">{entry.temperature != null ? `${entry.temperature}°` : "—"}</TableCell>
                  <TableCell className="p-2.5 text-xs">{entry.mode ? modeConfig[entry.mode].label : "—"}</TableCell>
                  <TableCell className="p-2.5 text-xs">{entry.fan ? fanConfig[entry.fan].label : "—"}</TableCell>
                  <TableCell className="text-muted-foreground p-2.5 text-xs">{commandSourceLabels[entry.source]}</TableCell>
                  <TableCell className="p-2.5">
                    {entry.result === "success" ? (
                      <span className="text-success flex items-center gap-1 text-xs">
                        <CheckCircle2 className="size-3" /> Success
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1 text-xs" title={entry.error ?? undefined}>
                        <XCircle className="size-3" /> Failed
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="p-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => deleteEntry.mutate(entry.id)}
                      aria-label="Delete entry"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t p-2.5">
            <p className="text-muted-foreground text-[11px]">
              {total} command{total === 1 ? "" : "s"} · page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear all history?"
        description="This permanently deletes every recorded command. This can't be undone."
        confirmLabel="Clear all"
        loading={clearHistory.isPending}
        onConfirm={() => clearHistory.mutate(undefined, { onSuccess: () => setClearOpen(false) })}
      />
    </div>
  )
}
