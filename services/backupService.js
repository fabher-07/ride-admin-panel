import { supabase } from '../lib/supabase'

/**
 * Servicio de Backup y Restauración para GO!T Admin
 * Maneja copias de seguridad automáticas y manuales de la base de datos
 */

/**
 * Crea un backup completo de la base de datos
 * @param {string} userId - ID del usuario que solicita el backup
 * @param {string} backupType - Tipo de backup: 'automatic' o 'manual'
 * @returns {Promise<object>} Resultado de la operación
 */
export const createBackup = async (userId, backupType = 'manual') => {
  const startTime = Date.now()
  
  try {
    // Tablas a respaldar
    const tables = [
      'users',
      'drivers',
      'passengers',
      'trips',
      'payments',
      'commission_transactions',
      'advertising_campaigns',
      'support_tickets',
      'support_messages',
      'audit_logs',
      'platform_config',
      'backups'
    ]

    const backupData = {}
    let totalRecords = 0

    // Exportar cada tabla
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
      
      if (error && error.code !== 'PGRST116') { // Ignorar si tabla no existe
        console.error(`Error al respaldar tabla ${table}:`, error)
        continue
      }
      
      backupData[table] = data || []
      totalRecords += (data || []).length
    }

    // Convertir a JSON
    const backupJson = JSON.stringify(backupData, null, 2)
    const backupSize = new Blob([backupJson]).size

    // Crear registro de backup
    const { data: backupRecord, error: backupError } = await supabase
      .from('backups')
      .insert({
        backup_type: backupType,
        file_size_bytes: backupSize,
        status: 'completed',
        tables_count: tables.length,
        records_count: totalRecords,
        duration_seconds: Math.floor((Date.now() - startTime) / 1000),
        created_by: userId,
        file_url: null // Se actualizará si se sube a storage
      })
      .select()
      .single()

    if (backupError) throw backupError

    // Registrar en audit log
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        user_email: userData?.email || 'system@goit.com',
        action: 'create_backup',
        category: 'backup',
        entity_type: 'backup',
        entity_id: backupRecord.id,
        details: JSON.stringify({
          backup_type: backupType,
          tables_count: tables.length,
          records_count: totalRecords,
          file_size_bytes: backupSize
        })
      })

    return {
      success: true,
      backup: backupRecord,
      data: backupData,
      json: backupJson
    }
  } catch (error) {
    console.error('Error al crear backup:', error)
    
    // Registrar backup fallido
    await supabase
      .from('backups')
      .insert({
        backup_type: backupType,
        status: 'failed',
        created_by: userId,
        duration_seconds: Math.floor((Date.now() - startTime) / 1000)
      })

    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Descarga un backup como archivo JSON
 * @param {object} backupData - Datos del backup
 * @param {string} filename - Nombre del archivo
 */
export const downloadBackup = (backupData, filename = null) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const defaultFilename = `goit-backup-${timestamp}.json`
  
  const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: 'application/json'
  })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || defaultFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Obtiene la lista de backups disponibles
 * @param {number} limit - Número máximo de backups a obtener
 * @returns {Promise<object>} Lista de backups
 */
export const getBackups = async (limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('backups')
      .select(`
        *,
        users:created_by (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, backups: data }
  } catch (error) {
    console.error('Error al obtener backups:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Elimina un backup
 * @param {string} backupId - ID del backup a eliminar
 * @param {string} userId - ID del usuario que elimina
 * @returns {Promise<object>} Resultado de la operación
 */
export const deleteBackup = async (backupId, userId) => {
  try {
    const { error } = await supabase
      .from('backups')
      .delete()
      .eq('id', backupId)

    if (error) throw error

    // Registrar en audit log
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        user_email: userData?.email || 'system@goit.com',
        action: 'delete_backup',
        category: 'backup',
        entity_type: 'backup',
        entity_id: backupId,
        details: JSON.stringify({
          backup_info: backup,
          timestamp: new Date().toISOString()
        })
      })

    return { success: true }
  } catch (error) {
    console.error('Error al eliminar backup:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Restaura la base de datos desde un backup
 * ADVERTENCIA: Esta operación es destructiva y reemplazará todos los datos actuales
 * @param {object} backupData - Datos del backup a restaurar
 * @param {string} userId - ID del usuario que restaura
 * @returns {Promise<object>} Resultado de la operación
 */
export const restoreFromBackup = async (backupData, userId) => {
  try {
    const restoredTables = []
    const errors = []

    // Restaurar cada tabla
    for (const [tableName, records] of Object.entries(backupData)) {
      if (!Array.isArray(records) || records.length === 0) continue

      try {
        // ADVERTENCIA: Esto eliminará todos los datos actuales
        // En producción, considera hacer un backup automático antes de restaurar
        
        // Insertar registros (usar upsert para evitar conflictos)
        const { error } = await supabase
          .from(tableName)
          .upsert(records, {
            onConflict: 'id',
            ignoreDuplicates: false
          })

        if (error) {
          errors.push({ table: tableName, error: error.message })
        } else {
          restoredTables.push(tableName)
        }
      } catch (err) {
        errors.push({ table: tableName, error: err.message })
      }
    }

    // Registrar en audit log
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        user_email: userData?.email || 'system@goit.com',
        action: 'restore_backup',
        category: 'backup',
        entity_type: 'backup',
        entity_id: 'restore_operation',
        details: JSON.stringify({
          restored_tables: restoredTables,
          errors: errors,
          timestamp: new Date().toISOString()
        })
      })

    return {
      success: errors.length === 0,
      restoredTables,
      errors
    }
  } catch (error) {
    console.error('Error al restaurar backup:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Exporta una tabla específica
 * @param {string} tableName - Nombre de la tabla
 * @returns {Promise<object>} Datos de la tabla
 */
export const exportTable = async (tableName) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error(`Error al exportar tabla ${tableName}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene estadísticas de la base de datos
 * @returns {Promise<object>} Estadísticas
 */
export const getDatabaseStats = async () => {
  try {
    const tables = [
      'users',
      'drivers',
      'passengers',
      'trips',
      'payments',
      'commission_transactions',
      'advertising_campaigns',
      'support_tickets',
      'platform_config',
      'backups'
    ]

    const stats = {}
    let totalRecords = 0

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (!error) {
        stats[table] = count || 0
        totalRecords += count || 0
      }
    }

    return {
      success: true,
      stats,
      totalRecords,
      tablesCount: Object.keys(stats).length
    }
  } catch (error) {
    console.error('Error al obtener estadísticas:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Programa backups automáticos diarios
 * Nota: En producción, esto debería ejecutarse en el servidor/backend
 * @param {string} userId - ID del usuario admin
 */
export const scheduleAutomaticBackups = async (userId) => {
  // Esta función debería ejecutarse en el servidor
  // Por ahora, retorna instrucciones para configurar un cron job
  
  return {
    success: true,
    message: 'Para backups automáticos, configura un cron job en el servidor',
    instructions: {
      cron: '0 2 * * *', // Diario a las 2 AM
      command: 'node scripts/automatic-backup.js',
      description: 'Ejecutar backup automático diario'
    }
  }
}
