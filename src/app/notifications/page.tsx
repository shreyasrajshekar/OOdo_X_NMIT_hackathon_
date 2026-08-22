'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { Bell, Check, Trash2 } from 'lucide-react'

type Notification = Tables<'notifications'>

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching notifications:', error)
    } else if (data) {
      setNotifications(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  const markRead = async (id: number, actionUrl: string | null = null) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    )
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (actionUrl) router.push(actionUrl)
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
  }

  const deleteNotification = async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="enter mb-8 border-b border-line pb-6">
          <div className="mb-2 flex items-center justify-between gap-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-plum">
              Inbox
            </p>
            <Link
              href="/employees"
              className="font-display text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              ← Back
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="flex items-center gap-2.5 font-display text-[32px] font-extrabold leading-[1.08] tracking-[-0.02em] text-ink">
              <Bell aria-hidden className="h-6 w-6 text-plum" />
              Notifications
              {unreadCount > 0 && (
                <span className="rounded-pill bg-primary px-2.5 py-1 font-mono text-[11px] font-medium tracking-[0.08em] text-paper">
                  {unreadCount}
                </span>
              )}
            </h1>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                <Check aria-hidden className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <ul className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={i}
                className="h-[86px] animate-pulse rounded-card bg-line/40"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </ul>
        ) : notifications.length === 0 ? (
          <div className="rounded-card border border-dashed border-line px-6 py-16 text-center">
            <p className="font-display text-[17px] font-bold text-ink">
              Nothing waiting on you
            </p>
            <p className="mx-auto mt-2 max-w-sm font-body text-[15px] leading-relaxed text-ink/60">
              Leave requests, approvals and payroll runs land here as the
              database raises them.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n, i) => (
              <li
                key={n.id}
                className={`enter relative rounded-card border transition-colors ${
                  !n.is_read
                    ? 'border-plum/30 bg-plum/[0.05] hover:border-plum/55'
                    : 'border-line hover:border-plum/30'
                }`}
                style={{ '--enter-delay': `${i * 40}ms` } as React.CSSProperties}
              >
                {/* Overlay button keeps the whole row clickable without
                    nesting the delete control inside another button. */}
                <button
                  type="button"
                  onClick={() => markRead(n.id, n.action_url)}
                  className="absolute inset-0 rounded-card"
                >
                  <span className="sr-only">
                    {n.is_read ? 'Open' : 'Mark read and open'}: {n.title}
                  </span>
                </button>

                <div className="pointer-events-none relative flex justify-between gap-4 p-4">
                  <div className="flex-1">
                    <p className="font-display text-sm font-bold text-ink">
                      {n.title}
                    </p>
                    <p className="mt-1 font-body text-[15px] leading-snug text-ink/70">
                      {n.message}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
                      {formatDate(n.created_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-3">
                    {!n.is_read && (
                      <span
                        aria-hidden
                        className="mt-1 h-2 w-2 rounded-pill bg-plum"
                      />
                    )}
                    <button
                      type="button"
                      aria-label={`Delete notification: ${n.title}`}
                      onClick={() => deleteNotification(n.id)}
                      className="pointer-events-auto relative mt-auto rounded-pill p-1.5 text-ink/35 transition-colors hover:bg-warn/10 hover:text-warn"
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
