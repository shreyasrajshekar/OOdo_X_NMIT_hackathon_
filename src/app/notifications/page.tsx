'use client'

import { useState, useEffect } from 'react'
import type { Tables } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { Bell, Check, Trash2 } from 'lucide-react'

type Notification = Tables<'notifications'>

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
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
  }

  const markRead = async (id: number, actionUrl: string | null = null) => {
    // Optimistic local update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    
    if (actionUrl) {
      window.location.href = actionUrl
    }
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))

    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
  }

  const deleteNotification = async (id: number) => {
    // Optimistic filter
    setNotifications(prev => prev.filter(n => n.id !== id))
    
    await supabase.from('notifications').delete().eq('id', id)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="text-indigo-400 w-6 h-6" />
            <h1 className="text-xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-gray-500 text-sm ml-2">({unreadCount} unread)</span>
            )}
          </div>
          
          {unreadCount > 0 && (
            <button 
              onClick={markAllRead}
              className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Check className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No notifications yet</div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div 
                key={n.id}
                onClick={() => markRead(n.id, n.action_url)}
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                  !n.is_read 
                    ? 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/50' 
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-white">{n.title}</div>
                    <div className="text-gray-400 text-sm mt-1">{n.message}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!n.is_read && (
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(n.id)
                      }}
                      className="w-4 h-4 text-gray-600 hover:text-red-400 transition-colors mt-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-gray-600 text-xs mt-2">
                  {formatDate(n.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
