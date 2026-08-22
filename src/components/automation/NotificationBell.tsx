'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Tables } from '@/types/database'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Notification = Tables<'notifications'>

function timeAgo(dateString: string | null) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return "just now"
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago"
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago"
  return Math.floor(seconds / 86400) + "d ago"
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) {
      console.error('Error fetching notifications:', error)
      return
    }

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = async (id: number, action_url: string | null) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (action_url) {
      window.location.href = action_url
    }
  }

  const markAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-line/60 transition-colors relative focus:outline-none"
        aria-label="Toggle notifications menu"
      >
        <Bell className="w-5 h-5 text-ink/75 hover:text-primary transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-paper text-[9px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-3 w-80 bg-paper border border-line rounded-card shadow-2xl z-50 overflow-hidden premium-card">
            <div className="p-3 border-b border-line flex justify-between items-center bg-paper/50">
              <span className="text-sm font-semibold text-ink">Notifications</span>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-xs font-semibold text-primary hover:text-plum transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-sm text-ink/40 text-center">
                  No notifications yet.
                </div>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification.id}
                    onClick={() => markAsRead(notification.id, notification.action_url)}
                    className={`p-3 border-b border-line/60 cursor-pointer hover:bg-line/40 transition-colors relative ${!notification.is_read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start">
                      {!notification.is_read && (
                        <div className="absolute left-3 top-4.5 w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                      )}
                      <div className="pl-3 flex-1">
                        <div className="text-xs text-ink font-bold">{notification.title}</div>
                        <div className="text-xs text-ink/70 mt-0.5 line-clamp-2">{notification.message}</div>
                        <div className="text-[10px] text-ink/40 mt-1 font-mono">{timeAgo(notification.created_at)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-2.5 border-t border-line/80 bg-paper/30 text-center">
              <a 
                href="/notifications" 
                onClick={() => setIsOpen(false)}
                className="block text-xs font-bold text-primary hover:text-plum transition-colors"
              >
                View all notifications
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

