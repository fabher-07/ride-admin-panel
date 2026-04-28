import { supabase } from '../lib/supabase'

/**
 * Obtener todas las alertas activas con estadísticas
 */
export const getActiveAlerts = async () => {
  try {
    const { data, error } = await supabase
      .from('system_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calcular estadísticas
    const stats = {
      total: data?.length || 0,
      critical: data?.filter(a => a.priority === 'critical').length || 0,
      high: data?.filter(a => a.priority === 'high').length || 0,
      medium: data?.filter(a => a.priority === 'medium').length || 0,
      low: data?.filter(a => a.priority === 'low').length || 0,
    }

    return { alerts: data, stats, error: null }
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return { alerts: [], stats: null, error }
  }
}

/**
 * Marcar una alerta como resuelta
 */
export const resolveAlert = async (alertId, userId) => {
  try {
    const { data, error } = await supabase
      .from('system_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error

    return { alert: data, error: null }
  } catch (error) {
    console.error('Error resolving alert:', error)
    return { alert: null, error }
  }
}

/**
 * Descartar una alerta (marcar como dismissed)
 */
export const dismissAlert = async (alertId, userId) => {
  try {
    const { data, error } = await supabase
      .from('system_alerts')
      .update({
        status: 'dismissed',
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error

    return { alert: data, error: null }
  } catch (error) {
    console.error('Error dismissing alert:', error)
    return { alert: null, error }
  }
}

/**
 * Generar todas las alertas (ejecutar verificaciones)
 */
export const generateAlerts = async () => {
  try {
    const { data, error } = await supabase.rpc('generate_all_alerts')

    if (error) throw error

    return { success: true, error: null }
  } catch (error) {
    console.error('Error generating alerts:', error)
    return { success: false, error }
  }
}

/**
 * Obtener detalles de una entidad relacionada
 */
export const getRelatedEntityDetails = async (entityType, entityId) => {
  try {
    let query = null

    switch (entityType) {
      case 'trip':
        query = supabase
          .from('trips')
          .select(`
            *,
            driver:drivers(id, name, phone, economico),
            passenger:passengers(id, user:users(full_name, phone))
          `)
          .eq('id', entityId)
          .single()
        break

      case 'driver':
        query = supabase
          .from('drivers')
          .select(`
            *,
            user:users(full_name, email, phone)
          `)
          .eq('id', entityId)
          .single()
        break

      case 'payment':
        query = supabase
          .from('payments')
          .select(`
            *,
            trip:trips(
              id,
              driver:drivers(name, phone),
              passenger:passengers(user:users(full_name, phone))
            )
          `)
          .eq('id', entityId)
          .single()
        break

      case 'support_ticket':
        query = supabase
          .from('support_tickets')
          .select(`
            *,
            user:users(full_name, email, phone, user_type)
          `)
          .eq('id', entityId)
          .single()
        break

      default:
        return { details: null, error: new Error('Unknown entity type') }
    }

    const { data, error } = await query

    if (error) throw error

    return { details: data, error: null }
  } catch (error) {
    console.error('Error fetching entity details:', error)
    return { details: null, error }
  }
}

/**
 * Obtener historial de alertas resueltas
 */
export const getResolvedAlerts = async (limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('system_alerts')
      .select('*')
      .in('status', ['resolved', 'dismissed'])
      .order('resolved_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { alerts: data, error: null }
  } catch (error) {
    console.error('Error fetching resolved alerts:', error)
    return { alerts: [], error }
  }
}

/**
 * Obtener estadísticas de alertas por tipo
 */
export const getAlertStatsByType = async () => {
  try {
    const { data, error } = await supabase
      .from('system_alerts')
      .select('type, priority, status')

    if (error) throw error

    const stats = {
      byType: {},
      byPriority: {},
      byStatus: {}
    }

    data.forEach(alert => {
      // Por tipo
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1
      
      // Por prioridad
      stats.byPriority[alert.priority] = (stats.byPriority[alert.priority] || 0) + 1
      
      // Por estado
      stats.byStatus[alert.status] = (stats.byStatus[alert.status] || 0) + 1
    })

    return { stats, error: null }
  } catch (error) {
    console.error('Error fetching alert stats:', error)
    return { stats: null, error }
  }
}
