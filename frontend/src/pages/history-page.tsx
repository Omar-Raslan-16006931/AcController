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
import { modeConfig, fanConfig } from "@/lib/ac-labels"

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
        description="Every command sent to the AC, with its result."
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

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search mode, fan, source…"
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select value={result} onValueChange={(v) => { setResult(v as typeof result); setPage(0) }}>
          <SelectTrigger className="w-40">
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
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
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
                <TableHead>Date &amp; time</TableHead>
                <TableHead>Power</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Fan</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(entry.created_at), "MMM d, yyyy · h:mm:ss a")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.power ? "success" : "secondary"}>
                      {entry.power ? "On" : "Off"}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.temperature != null ? `${entry.temperature}°` : "—"}</TableCell>
                  <TableCell>{entry.mode ? modeConfig[entry.mode].label : "—"}</TableCell>
                  <TableCell>{entry.fan ? fanConfig[entry.fan].label : "—"}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{entry.source}</TableCell>
                  <TableCell>
                    {entry.result === "success" ? (
                      <span className="text-success flex items-center gap-1.5 text-sm">
                        <CheckCircle2 className="size-3.5" /> Success
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1.5 text-sm" title={entry.error ?? undefined}>
                        <XCircle className="size-3.5" /> Failed
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEntry.mutate(entry.id)}
                      aria-label="Delete entry"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t p-3">
            <p className="text-muted-foreground text-xs">
              {total} command{total === 1 ? "" : "s"} · page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className="size-4" />
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
