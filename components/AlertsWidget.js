import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AlertsWidget() {
  const [priorityAlerts, setPriorityAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      setLoading(true)

      // Pending driver approvals
      const { count: pendingCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Blocked drivers
      const { count: blockedCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'blocked')

      // Active trips (may need attention)
      const { count: activeTripsCount } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .in('status', ['requested', 'accepted', 'in_progress'])

      // Cancelled trips today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: cancelledCount } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('created_at', today.toISOString())

      const alerts = [
        pendingCount > 0 && {
          id: 1,
          type: 'approval',
          title: 'Documentos pendientes de aprobar',
          count: pendingCount || 0,
          priority: 'high',
          icon: '📄',
        },
        blockedCount > 0 && {
          id: 2,
          type: 'blocked',
          title: 'Conductores bloqueados',
          count: blockedCount || 0,
          priority: 'medium',
          icon: '🚫',
        },
        activeTripsCount > 0 && {
          id: 3,
          type: 'trips',
          title: 'Viajes activos ahora',
          count: activeTripsCount || 0,
          priority: 'low',
          icon: '�',
        },
        cancelledCount > 0 && {
          id: 4,
          type: 'cancelled',
          title: 'Viajes cancelados hoy',
          count: cancelledCount || 0,
          priority: cancelledCount > 5 ? 'high' : 'medium',
          icon: '⚠️',
        },
      ].filter(Boolean)

      setPriorityAlerts(alerts)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-700'
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas Prioritarias</h3>
      
      {loading ? (
        <div className="h-[150px] flex items-center justify-center text-gray-400">Cargando...</div>
      ) : priorityAlerts.length === 0 ? (
        <p className="text-gray-400 text-center py-8">✅ Sin alertas pendientes</p>
      ) : (
        <div className="space-y-3">
          {priorityAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border-2 rounded-lg p-4 ${getPriorityColor(alert.priority)} cursor-pointer hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{alert.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs opacity-75 mt-0.5">
                      {alert.priority === 'high' ? 'Prioridad Alta' : alert.priority === 'medium' ? 'Prioridad Media' : 'Info'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{alert.count}</span>
                  <span className="text-sm">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
