'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  is_read: boolean
  action_url: string | null
  created_at: string
}

function timeAgo(dateString: string) {
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
    // Optimistic update
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

    // Optimistic update
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
        className="p-2 rounded-lg hover:bg-gray-800 transition-colors relative"
      >
        <Bell className="w-5 h-5 text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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
          <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-700 flex justify-between items-center">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  No notifications
                </div>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification.id}
                    onClick={() => markAsRead(notification.id, notification.action_url)}
                    className={`p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors ${!notification.is_read ? 'bg-indigo-500/5' : ''}`}
                  >
                    <div className="flex items-start relative">
                      {!notification.is_read && (
                        <div className="absolute left-0 top-1.5 w-2 h-2 bg-indigo-500 rounded-full shrink-0" />
                      )}
                      <div className="ml-4 flex-1">
                        <div className="text-sm text-white font-medium">{notification.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notification.message}</div>
                        <div className="text-xs text-gray-600 mt-1">{timeAgo(notification.created_at)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-2 border-t border-gray-700">
              <a 
                href="/notifications" 
                className="block text-center text-xs text-indigo-400 hover:text-indigo-300 py-1"
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
