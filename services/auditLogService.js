import { supabase } from '../lib/supabase'

/**
 * Servicio de Logs de Auditoría para GO!T Admin
 * Registra y consulta todas las acciones administrativas
 */

/**
 * Tipos de acciones auditables
 */
export const AUDIT_ACTIONS = {
  // Configuración
  UPDATE_CONFIG: 'update_platform_config',
  BULK_UPDATE_CONFIG: 'bulk_update_platform_config',
  
  // Usuarios
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  BLOCK_USER: 'block_user',
  UNBLOCK_USER: 'unblock_user',
  
  // Conductores
  APPROVE_DRIVER: 'approve_driver',
  REJECT_DRIVER: 'reject_driver',
  SUSPEND_DRIVER: 'suspend_driver',
  ACTIVATE_DRIVER: 'activate_driver',
  
  // Viajes
  CANCEL_TRIP: 'cancel_trip',
  REFUND_TRIP: 'refund_trip',
  
  // Pagos
  PROCESS_PAYMENT: 'process_payment',
  REFUND_PAYMENT: 'refund_payment',
  
  // Backups
  CREATE_BACKUP: 'create_backup',
  RESTORE_BACKUP: 'restore_backup',
  DELETE_BACKUP: 'delete_backup',
  
  // Sistema
  LOGIN: 'admin_login',
  LOGOUT: 'admin_logout',
  EXPORT_DATA: 'export_data'
}

/**
 * Registra una acción en el log de auditoría
 * @param {string} userId - ID del usuario que realiza la acción
 * @param {string} action - Tipo de acción (usar AUDIT_ACTIONS)
 * @param {string} entityType - Tipo de entidad afectada
 * @param {string} entityId - ID de la entidad afectada
 * @param {object} details - Detalles adicionales de la acción
 * @returns {Promise<object>} Resultado de la operación
 */
export const logAction = async (userId, action, entityType, entityId, details = {}) => {
  try {
    // Obtener email del usuario
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        user_email: userData?.email || 'unknown@goit.com',
        action,
        category: entityType || 'general',
        entity_type: entityType,
        entity_id: entityId,
        details: JSON.stringify({
          ...details,
          timestamp: new Date().toISOString(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        }),
        ip_address: null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, log: data }
  } catch (error) {
    console.error('Error al registrar acción en audit log:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene los logs de auditoría con filtros
 * @param {object} filters - Filtros de búsqueda
 * @param {number} limit - Número máximo de registros
 * @returns {Promise<object>} Logs de auditoría
 */
export const getAuditLogs = async (filters = {}, limit = 100) => {
  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        users:user_id (
          full_name,
          email,
          user_type
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Aplicar filtros
    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }
    
    if (filters.action) {
      query = query.eq('action', filters.action)
    }
    
    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }
    
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, logs: data }
  } catch (error) {
    console.error('Error al obtener logs de auditoría:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene estadísticas de auditoría
 * @param {string} dateFrom - Fecha inicial
 * @param {string} dateTo - Fecha final
 * @returns {Promise<object>} Estadísticas
 */
export const getAuditStats = async (dateFrom = null, dateTo = null) => {
  try {
    let query = supabase
      .from('audit_logs')
      .select('action, user_id, created_at')

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    // Calcular estadísticas
    const stats = {
      totalActions: data.length,
      actionsByType: {},
      actionsByUser: {},
      actionsByDay: {}
    }

    data.forEach(log => {
      // Por tipo de acción
      stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1
      
      // Por usuario
      stats.actionsByUser[log.user_id] = (stats.actionsByUser[log.user_id] || 0) + 1
      
      // Por día
      const day = log.created_at.split('T')[0]
      stats.actionsByDay[day] = (stats.actionsByDay[day] || 0) + 1
    })

    return { success: true, stats }
  } catch (error) {
    console.error('Error al obtener estadísticas de auditoría:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene el historial de acciones de un usuario específico
 * @param {string} userId - ID del usuario
 * @param {number} limit - Número máximo de registros
 * @returns {Promise<object>} Historial del usuario
 */
export const getUserHistory = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, history: data }
  } catch (error) {
    console.error('Error al obtener historial de usuario:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene acciones recientes (últimas 24 horas)
 * @param {number} limit - Número máximo de registros
 * @returns {Promise<object>} Acciones recientes
 */
export const getRecentActions = async (limit = 20) => {
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users:user_id (
          full_name,
          email
        )
      `)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, actions: data }
  } catch (error) {
    console.error('Error al obtener acciones recientes:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Exporta logs de auditoría a JSON
 * @param {object} filters - Filtros de búsqueda
 * @returns {Promise<object>} Datos para exportar
 */
export const exportAuditLogs = async (filters = {}) => {
  try {
    const result = await getAuditLogs(filters, 10000) // Sin límite para exportación
    
    if (!result.success) throw new Error(result.error)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `audit-logs-${timestamp}.json`
    
    const blob = new Blob([JSON.stringify(result.logs, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true, filename }
  } catch (error) {
    console.error('Error al exportar logs:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Exporta logs de auditoría a CSV
 * @param {object} filters - Filtros de búsqueda
 * @returns {Promise<object>} Datos para exportar
 */
export const exportAuditLogsCSV = async (filters = {}) => {
  try {
    const result = await getAuditLogs(filters, 10000)
    
    if (!result.success) throw new Error(result.error)

    // Convertir a CSV
    const headers = ['Fecha', 'Usuario', 'Email', 'Acción', 'Tipo', 'ID Entidad', 'Detalles']
    const rows = result.logs.map(log => [
      new Date(log.created_at).toLocaleString('es-MX'),
      log.users?.full_name || 'N/A',
      log.users?.email || 'N/A',
      log.action,
      log.entity_type,
      log.entity_id,
      JSON.stringify(log.details)
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `audit-logs-${timestamp}.csv`
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true, filename }
  } catch (error) {
    console.error('Error al exportar logs a CSV:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Limpia logs antiguos (mantener solo últimos N días)
 * @param {number} daysToKeep - Días a mantener
 * @param {string} userId - ID del usuario que ejecuta la limpieza
 * @returns {Promise<object>} Resultado de la operación
 */
export const cleanOldLogs = async (daysToKeep = 90, userId) => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const { data, error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select()

    if (error) throw error

    // Registrar la limpieza
    await logAction(userId, 'clean_audit_logs', 'audit_logs', 'cleanup', {
      days_kept: daysToKeep,
      deleted_count: data.length,
      cutoff_date: cutoffDate.toISOString()
    })

    return {
      success: true,
      deletedCount: data.length,
      cutoffDate: cutoffDate.toISOString()
    }
  } catch (error) {
    console.error('Error al limpiar logs antiguos:', error)
    return { success: false, error: error.message }
  }
}
