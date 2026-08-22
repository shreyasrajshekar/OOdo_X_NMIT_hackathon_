'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Activity } from 'lucide-react'
import type { Tables } from '@/types/database'

type AutomationLog = Tables<'automation_logs'>

/** Chip styles stay inside the plum hue; only failure leaves it for clay. */
const TYPE_CHIP: Record<string, string> = {
  scheduled: 'bg-plum/12 text-primary ring-plum/20',
  event: 'bg-primary/12 text-primary ring-primary/20',
  condition: 'bg-warn/10 text-warn ring-warn/20',
  manual: 'bg-line text-ink/60 ring-ink/10',
}

const STATUS_CHIP: Record<string, string> = {
  success: 'bg-success/12 text-success ring-success/25',
  failed: 'bg-warn/12 text-warn ring-warn/25',
  skipped: 'bg-line text-ink/55 ring-ink/10',
  silent: 'bg-transparent text-ink/45 ring-ink/15',
}

function Chip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] ring-1 ring-inset ${tone}`}
    >
      {children}
    </span>
  )
}

export default function AutomationsPage() {
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error fetching automation logs:', error)
    } else if (data) {
      setLogs(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  const filteredLogs = logs.filter((log) => {
    const matchType = filterType === 'all' || log.trigger_type === filterType
    const matchStatus = filterStatus === 'all' || log.status === filterStatus
    return matchType && matchStatus
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const selectClass =
    'rounded-pill border border-line bg-paper px-4 py-2 font-display text-sm text-ink ' +
    'transition-colors hover:border-plum/40 focus:border-plum'

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="enter mb-8 border-b border-line pb-6">
          <div className="mb-2 flex items-center justify-between gap-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-plum">
              Admin · Audit
            </p>
            <Link
              href="/employees"
              className="font-display text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              ← Back to Dayflow
            </Link>
          </div>
          <div>
            <h1 className="flex items-center gap-2.5 font-display text-[32px] font-extrabold leading-[1.08] tracking-[-0.02em] text-ink">
              <Activity aria-hidden className="h-6 w-6 text-plum" />
              Automation log
            </h1>
            <p className="mt-2 max-w-prose font-body text-[15px] leading-relaxed text-ink/65">
              Every rule the database ran on its own — what fired, what it
              changed, and what it deliberately skipped.
            </p>
          </div>
        </header>

        <div
          className="enter mb-5 flex flex-wrap items-center gap-3"
          style={{ '--enter-delay': '60ms' } as React.CSSProperties}
        >
          <select
            aria-label="Filter by trigger type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={selectClass}
          >
            <option value="all">All types</option>
            <option value="scheduled">Scheduled</option>
            <option value="event">Event</option>
            <option value="condition">Condition</option>
            <option value="manual">Manual</option>
          </select>

          <select
            aria-label="Filter by status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={selectClass}
          >
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
            <option value="silent">Silent</option>
          </select>

          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45">
            {loading
              ? 'Loading'
              : `${filteredLogs.length} of ${logs.length} entries`}
          </span>
        </div>

        {loading ? (
          <div className="space-y-px overflow-hidden rounded-card border border-line">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse bg-line/40"
                style={{ animationDelay: `${i * 70}ms` }}
              />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-card border border-dashed border-line px-6 py-16 text-center">
            <p className="font-display text-[17px] font-bold text-ink">
              Nothing has fired yet
            </p>
            <p className="mx-auto mt-2 max-w-sm font-body text-[15px] leading-relaxed text-ink/60">
              {logs.length === 0
                ? 'The triggers are installed but no rule has run. Seed the demo data or check someone in to give them something to react to.'
                : 'No entry matches these filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  {['Time', 'Type', 'Trigger', 'Action', 'Status', 'Took'].map(
                    (h) => (
                      <th
                        key={h}
                        scope="col"
                        className="whitespace-nowrap px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink/55"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-line/60 transition-colors last:border-0 hover:bg-plum/[0.04]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-ink/55">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={TYPE_CHIP[log.trigger_type] ?? TYPE_CHIP.manual}>
                        {log.trigger_type}
                      </Chip>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-ink">
                      {log.trigger_name}
                    </td>
                    <td className="max-w-md px-4 py-3 font-body text-[14px] leading-snug text-ink/80">
                      {log.action_taken}
                      {log.status === 'failed' && log.error_message ? (
                        <span className="mt-1 block font-mono text-[11px] text-warn">
                          {log.error_message}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={STATUS_CHIP[log.status ?? ''] ?? STATUS_CHIP.skipped}>
                        {log.status ?? 'unknown'}
                      </Chip>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-[11px] text-ink/50">
                      {log.execution_ms !== null ? `${log.execution_ms} ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
