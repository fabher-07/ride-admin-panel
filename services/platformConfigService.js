import { supabase } from '../lib/supabase'

/**
 * Servicio para gestionar la configuración global de la plataforma
 * Todos los cambios afectan a TODOS los usuarios inmediatamente
 */

// Claves de configuración disponibles
export const CONFIG_KEYS = {
  SEARCH_RADIUS: 'search_radius',
  MAX_WAIT_TIME: 'max_wait_time',
  AUTO_CANCEL_TIME: 'auto_cancel_time',
  MIN_FARE: 'min_fare',
  CANCELLATION_FEE_DRIVER: 'cancellation_fee_driver',
  CANCELLATION_FEE_PASSENGER: 'cancellation_fee_passenger',
  MAX_TRIP_DISTANCE: 'max_trip_distance',
  DRIVER_COMMISSION: 'driver_commission',
  PLATFORM_FEE: 'platform_fee',
  PEAK_HOUR_MULTIPLIER: 'peak_hour_multiplier',
  NIGHT_FARE_MULTIPLIER: 'night_fare_multiplier',
  AIRPORT_FARE_MULTIPLIER: 'airport_fare_multiplier',
  MAX_DRIVERS_PER_REQUEST: 'max_drivers_per_request',
  REQUEST_TIMEOUT: 'request_timeout',
  RATING_MINIMUM: 'rating_minimum',
  MAX_CONCURRENT_TRIPS: 'max_concurrent_trips',
}

/**
 * Obtiene toda la configuración de la plataforma
 * @returns {Promise<object>} Objeto con toda la configuración
 */
export const getPlatformConfig = async () => {
  try {
    const { data, error } = await supabase
      .from('platform_config')
      .select('*')
      .order('config_key')

    if (error) throw error

    // Convertir array a objeto para fácil acceso
    const config = {}
    data.forEach(item => {
      config[item.config_key] = item.config_value
    })

    return { success: true, config }
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene un valor específico de configuración
 * @param {string} key - Clave de configuración
 * @returns {Promise<object>} Valor de la configuración
 */
export const getConfigValue = async (key) => {
  try {
    const { data, error } = await supabase
      .from('platform_config')
      .select('config_value')
      .eq('config_key', key)
      .single()

    if (error) throw error

    return { success: true, value: data.config_value }
  } catch (error) {
    console.error(`Error al obtener configuración ${key}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Actualiza un valor de configuración
 * @param {string} key - Clave de configuración
 * @param {any} value - Nuevo valor
 * @param {string} userId - ID del usuario que hace el cambio
 * @returns {Promise<object>} Resultado de la operación
 */
export const updateConfigValue = async (key, value, userId) => {
  try {
    const { data, error } = await supabase
      .from('platform_config')
      .update({
        config_value: value,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('config_key', key)
      .select()

    if (error) throw error

    // Registrar en audit log
    await logConfigChange(userId, key, value)

    return { success: true, data }
  } catch (error) {
    console.error(`Error al actualizar configuración ${key}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Actualiza múltiples valores de configuración en una transacción
 * @param {object} configUpdates - Objeto con las claves y valores a actualizar
 * @param {string} userId - ID del usuario que hace los cambios
 * @returns {Promise<object>} Resultado de la operación
 */
export const updateMultipleConfigs = async (configUpdates, userId) => {
  try {
    const updates = []
    
    for (const [key, value] of Object.entries(configUpdates)) {
      const { error } = await supabase
        .from('platform_config')
        .update({
          config_value: value,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', key)

      if (error) throw error

      updates.push({ key, value })
    }

    // Registrar todos los cambios en audit log
    await logMultipleConfigChanges(userId, updates)

    return { success: true, updatedCount: updates.length }
  } catch (error) {
    console.error('Error al actualizar múltiples configuraciones:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Crea una nueva configuración
 * @param {string} key - Clave de configuración
 * @param {any} value - Valor inicial
 * @param {string} description - Descripción de la configuración
 * @param {string} userId - ID del usuario que crea la configuración
 * @returns {Promise<object>} Resultado de la operación
 */
export const createConfig = async (key, value, description, userId) => {
  try {
    const { data, error } = await supabase
      .from('platform_config')
      .insert({
        config_key: key,
        config_value: value,
        description,
        updated_by: userId
      })
      .select()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error al crear configuración:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Registra un cambio de configuración en el audit log
 * @param {string} userId - ID del usuario
 * @param {string} configKey - Clave de configuración
 * @param {any} newValue - Nuevo valor
 */
const logConfigChange = async (userId, configKey, newValue) => {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'update_platform_config',
        entity_type: 'platform_config',
        entity_id: configKey,
        details: {
          config_key: configKey,
          new_value: newValue,
          timestamp: new Date().toISOString()
        }
      })
  } catch (error) {
    console.error('Error al registrar cambio en audit log:', error)
  }
}

/**
 * Registra múltiples cambios de configuración en el audit log
 * @param {string} userId - ID del usuario
 * @param {array} updates - Array de objetos {key, value}
 */
const logMultipleConfigChanges = async (userId, updates) => {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'bulk_update_platform_config',
        entity_type: 'platform_config',
        entity_id: 'multiple',
        details: {
          updates,
          count: updates.length,
          timestamp: new Date().toISOString()
        }
      })
  } catch (error) {
    console.error('Error al registrar cambios en audit log:', error)
  }
}

/**
 * Obtiene el historial de cambios de configuración
 * @param {number} limit - Número máximo de registros a obtener
 * @returns {Promise<object>} Historial de cambios
 */
export const getConfigHistory = async (limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users:user_id (
          full_name,
          email
        )
      `)
      .in('action', ['update_platform_config', 'bulk_update_platform_config'])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, history: data }
  } catch (error) {
    console.error('Error al obtener historial de configuración:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Inicializa la configuración por defecto si no existe
 * @param {string} userId - ID del usuario administrador
 * @returns {Promise<object>} Resultado de la operación
 */
export const initializeDefaultConfig = async (userId) => {
  const defaultConfigs = [
    {
      config_key: CONFIG_KEYS.SEARCH_RADIUS,
      config_value: { value: 5, unit: 'km' },
      description: 'Radio de búsqueda de taxis disponibles'
    },
    {
      config_key: CONFIG_KEYS.MAX_WAIT_TIME,
      config_value: { value: 15, unit: 'minutes' },
      description: 'Tiempo máximo de espera antes de cancelación automática'
    },
    {
      config_key: CONFIG_KEYS.AUTO_CANCEL_TIME,
      config_value: { value: 15, unit: 'minutes' },
      description: 'Tiempo de auto-cancelación si no hay conductor'
    },
    {
      config_key: CONFIG_KEYS.MIN_FARE,
      config_value: { value: 50, currency: 'MXN' },
      description: 'Tarifa mínima por viaje'
    },
    {
      config_key: CONFIG_KEYS.CANCELLATION_FEE_DRIVER,
      config_value: { value: 20, currency: 'MXN' },
      description: 'Penalización por cancelación del conductor'
    },
    {
      config_key: CONFIG_KEYS.CANCELLATION_FEE_PASSENGER,
      config_value: { value: 30, currency: 'MXN' },
      description: 'Penalización por cancelación del pasajero'
    },
    {
      config_key: CONFIG_KEYS.MAX_TRIP_DISTANCE,
      config_value: { value: 100, unit: 'km' },
      description: 'Distancia máxima permitida por viaje'
    },
    {
      config_key: CONFIG_KEYS.DRIVER_COMMISSION,
      config_value: { value: 20, unit: 'percent' },
      description: 'Comisión de la plataforma sobre cada viaje'
    },
    {
      config_key: CONFIG_KEYS.PLATFORM_FEE,
      config_value: { value: 5, currency: 'MXN' },
      description: 'Tarifa fija de la plataforma por viaje'
    },
    {
      config_key: CONFIG_KEYS.PEAK_HOUR_MULTIPLIER,
      config_value: { value: 1.4 },
      description: 'Multiplicador de tarifa en hora pico'
    },
    {
      config_key: CONFIG_KEYS.NIGHT_FARE_MULTIPLIER,
      config_value: { value: 1.25 },
      description: 'Multiplicador de tarifa nocturna'
    },
    {
      config_key: CONFIG_KEYS.AIRPORT_FARE_MULTIPLIER,
      config_value: { value: 1.5 },
      description: 'Multiplicador para viajes al aeropuerto'
    },
    {
      config_key: CONFIG_KEYS.MAX_DRIVERS_PER_REQUEST,
      config_value: { value: 10 },
      description: 'Número máximo de conductores por solicitud'
    },
    {
      config_key: CONFIG_KEYS.REQUEST_TIMEOUT,
      config_value: { value: 60, unit: 'seconds' },
      description: 'Tiempo de espera para aceptar solicitud'
    },
    {
      config_key: CONFIG_KEYS.RATING_MINIMUM,
      config_value: { value: 3.0, max: 5.0 },
      description: 'Calificación mínima requerida para conductores'
    },
    {
      config_key: CONFIG_KEYS.MAX_CONCURRENT_TRIPS,
      config_value: { value: 1 },
      description: 'Viajes concurrentes máximos por conductor'
    }
  ]

  try {
    const results = []
    for (const config of defaultConfigs) {
      const { data, error } = await supabase
        .from('platform_config')
        .upsert({
          ...config,
          updated_by: userId
        }, {
          onConflict: 'config_key',
          ignoreDuplicates: true
        })

      if (error && error.code !== '23505') { // Ignorar error de duplicado
        throw error
      }
      results.push(config.config_key)
    }

    return { success: true, initialized: results }
  } catch (error) {
    console.error('Error al inicializar configuración:', error)
    return { success: false, error: error.message }
  }
}
