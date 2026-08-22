'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Activity } from 'lucide-react'
import type { Tables } from '@/types/database'

type AutomationLog = Tables<'automation_logs'>

export default function AutomationsPage() {
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
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
  }

  const filteredLogs = logs.filter(log => {
    const matchType = filterType === 'all' || log.trigger_type === filterType
    const matchStatus = filterStatus === 'all' || log.status === filterStatus
    return matchType && matchStatus
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'success':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/15 text-green-400">Success</span>
      case 'failed':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400">Failed</span>
      case 'skipped':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/15 text-yellow-400">Skipped</span>
      case 'silent':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/15 text-gray-400">Silent</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/15 text-gray-400">{status}</span>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'scheduled':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-400">Scheduled</span>
      case 'event':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/15 text-purple-400">Event</span>
      case 'condition':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/15 text-orange-400">Condition</span>
      case 'manual':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/15 text-gray-400">Manual</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/15 text-gray-400">{type}</span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="text-indigo-400 w-6 h-6" />
          <h1 className="text-xl font-bold">Automation Logs</h1>
        </div>

        <div className="flex gap-3 mb-4">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="scheduled">Scheduled</option>
            <option value="event">Event</option>
            <option value="condition">Condition</option>
            <option value="manual">Manual</option>
          </select>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
            <option value="silent">Silent</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No logs found</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-900 text-gray-400 text-sm">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Trigger</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {getTypeBadge(log.trigger_type)}
                    </td>
                    <td className="px-4 py-3 text-white font-mono text-xs">
                      {log.trigger_name}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs max-w-md">
                      <div>{log.action_taken}</div>
                      {log.status === 'failed' && log.error_message && (
                        <div className="text-red-400 mt-0.5">{log.error_message}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-4 py-3">
                      {log.execution_ms !== null ? (
                        <span className="text-gray-500 text-xs">{log.execution_ms}ms</span>
                      ) : (
                        <span className="text-gray-700 text-xs">—</span>
                      )}
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
