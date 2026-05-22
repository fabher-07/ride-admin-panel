import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import {
  getPlatformConfig,
  updateMultipleConfigs,
  initializeDefaultConfig,
  CONFIG_KEYS
} from '@/services/platformConfigService'

export default function PlatformConfigurationScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState(null)

  // Default configuration
  const defaultConfig = {
    searchRadius: 5,
    maxWaitTime: 15,
    autoCancelTime: 15,
    minFare: 50,
    cancellationFeeDriver: 20,
    cancellationFeePassenger: 30,
    maxTripDistance: 100,
    driverCommission: 20,
    platformFee: 5,
    peakHourMultiplier: 1.4,
    nightFareMultiplier: 1.25,
    airportFareMultiplier: 1.5,
    maxDriversPerRequest: 10,
    requestTimeout: 60,
    ratingMinimum: 3.0,
    maxConcurrentTrips: 1,
  }

  // Current configuration
  const [config, setConfig] = useState(defaultConfig)

  useEffect(() => {
    setMounted(true)
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getPlatformConfig()
      
      if (result.success && result.config) {
        // Convertir valores de JSONB a formato simple
        const loadedConfig = {
          searchRadius: result.config[CONFIG_KEYS.SEARCH_RADIUS]?.value || 5,
          maxWaitTime: result.config[CONFIG_KEYS.MAX_WAIT_TIME]?.value || 15,
          autoCancelTime: result.config[CONFIG_KEYS.AUTO_CANCEL_TIME]?.value || 15,
          minFare: result.config[CONFIG_KEYS.MIN_FARE]?.value || 50,
          cancellationFeeDriver: result.config[CONFIG_KEYS.CANCELLATION_FEE_DRIVER]?.value || 20,
          cancellationFeePassenger: result.config[CONFIG_KEYS.CANCELLATION_FEE_PASSENGER]?.value || 30,
          maxTripDistance: result.config[CONFIG_KEYS.MAX_TRIP_DISTANCE]?.value || 100,
          driverCommission: result.config[CONFIG_KEYS.DRIVER_COMMISSION]?.value || 20,
          platformFee: result.config[CONFIG_KEYS.PLATFORM_FEE]?.value || 5,
          peakHourMultiplier: result.config[CONFIG_KEYS.PEAK_HOUR_MULTIPLIER]?.value || 1.4,
          nightFareMultiplier: result.config[CONFIG_KEYS.NIGHT_FARE_MULTIPLIER]?.value || 1.25,
          airportFareMultiplier: result.config[CONFIG_KEYS.AIRPORT_FARE_MULTIPLIER]?.value || 1.5,
          maxDriversPerRequest: result.config[CONFIG_KEYS.MAX_DRIVERS_PER_REQUEST]?.value || 10,
          requestTimeout: result.config[CONFIG_KEYS.REQUEST_TIMEOUT]?.value || 60,
          ratingMinimum: result.config[CONFIG_KEYS.RATING_MINIMUM]?.value || 3.0,
          maxConcurrentTrips: result.config[CONFIG_KEYS.MAX_CONCURRENT_TRIPS]?.value || 1,
        }
        setConfig(loadedConfig)
      } else {
        // Si no hay configuración, inicializar con valores por defecto
        if (user?.id) {
          await initializeDefaultConfig(user.id)
          await loadConfiguration() // Recargar después de inicializar
        }
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err)
      setError('Error al cargar la configuración. Usando valores por defecto.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = (key, value) => {
    setConfig({ ...config, [key]: parseFloat(value) })
    setHasChanges(true)
  }

  const handleSave = () => {
    setShowConfirmModal(true)
  }

  const handleConfirmSave = async () => {
    if (!user?.id) {
      alert('Error: Usuario no autenticado')
      return
    }

    setSaving(true)
    setError(null)
    
    try {
      // Preparar actualizaciones en formato JSONB
      const updates = {
        [CONFIG_KEYS.SEARCH_RADIUS]: { value: config.searchRadius, unit: 'km' },
        [CONFIG_KEYS.MAX_WAIT_TIME]: { value: config.maxWaitTime, unit: 'minutes' },
        [CONFIG_KEYS.AUTO_CANCEL_TIME]: { value: config.autoCancelTime, unit: 'minutes' },
        [CONFIG_KEYS.MIN_FARE]: { value: config.minFare, currency: 'MXN' },
        [CONFIG_KEYS.CANCELLATION_FEE_DRIVER]: { value: config.cancellationFeeDriver, currency: 'MXN' },
        [CONFIG_KEYS.CANCELLATION_FEE_PASSENGER]: { value: config.cancellationFeePassenger, currency: 'MXN' },
        [CONFIG_KEYS.MAX_TRIP_DISTANCE]: { value: config.maxTripDistance, unit: 'km' },
        [CONFIG_KEYS.DRIVER_COMMISSION]: { value: config.driverCommission, unit: 'percent' },
        [CONFIG_KEYS.PLATFORM_FEE]: { value: config.platformFee, currency: 'MXN' },
        [CONFIG_KEYS.PEAK_HOUR_MULTIPLIER]: { value: config.peakHourMultiplier },
        [CONFIG_KEYS.NIGHT_FARE_MULTIPLIER]: { value: config.nightFareMultiplier },
        [CONFIG_KEYS.AIRPORT_FARE_MULTIPLIER]: { value: config.airportFareMultiplier },
        [CONFIG_KEYS.MAX_DRIVERS_PER_REQUEST]: { value: config.maxDriversPerRequest },
        [CONFIG_KEYS.REQUEST_TIMEOUT]: { value: config.requestTimeout, unit: 'seconds' },
        [CONFIG_KEYS.RATING_MINIMUM]: { value: config.ratingMinimum, max: 5.0 },
        [CONFIG_KEYS.MAX_CONCURRENT_TRIPS]: { value: config.maxConcurrentTrips },
      }

      const result = await updateMultipleConfigs(updates, user.id)
      
      if (result.success) {
        alert('✅ Configuración guardada exitosamente. Los cambios se aplicarán inmediatamente a todos los usuarios.')
        setShowConfirmModal(false)
        setHasChanges(false)
        await loadConfiguration() // Recargar para confirmar
      } else {
        throw new Error(result.error || 'Error desconocido')
      }
    } catch (err) {
      console.error('Error al guardar configuración:', err)
      setError('Error al guardar la configuración: ' + err.message)
      alert('❌ Error al guardar la configuración. Por favor, intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setShowResetModal(true)
  }

  const handleConfirmReset = () => {
    setConfig(defaultConfig)
    setShowResetModal(false)
    setHasChanges(false)
    alert('Configuración restablecida a valores predeterminados')
  }

  return (
    <>
      <Head>
        <title>RIDE Admin - Configuración de la Plataforma</title>
        <meta name="description" content="Configuración global de la plataforma" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configuración de la Plataforma</h1>
              <p className="text-gray-600 mt-1">
                Ajustes globales que afectan a todos los usuarios
              </p>
            </div>
            <button
              onClick={() => router.push('/config-history')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              📜 Ver Historial
            </button>
          </div>
          {loading && (
            <div className="mt-4 text-blue-600 flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Cargando configuración...</span>
            </div>
          )}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Admin User Banner */}
        {user && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <h3 className="text-sm font-semibold text-blue-900">
                    Sesión activa: {user.email || user.full_name || 'Administrador'}
                  </h3>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Todos los cambios quedarán registrados a tu nombre en el historial de auditoría
                  </p>
                </div>
              </div>
              <div className="text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                ID: {user.id?.substring(0, 8)}...
              </div>
            </div>
          </div>
        )}

        {/* Warning Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-yellow-800">Advertencia</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Los cambios en esta configuración afectarán a <strong>todos los usuarios</strong>{' '}
                de la plataforma inmediatamente. Asegúrate de revisar cuidadosamente antes de
                guardar.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Sections */}
        <div className="space-y-6">
          {/* Search & Matching */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🔍</span>
              <span>Búsqueda y Emparejamiento</span>
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Radio de Búsqueda (km)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={config.searchRadius}
                  onChange={(e) => handleConfigChange('searchRadius', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Distancia máxima para buscar taxis disponibles desde la ubicación del pasajero
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Máximo de Conductores por Solicitud
                </label>
                <input
                  type="number"
                  value={config.maxDriversPerRequest}
                  onChange={(e) => handleConfigChange('maxDriversPerRequest', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Número máximo de conductores que recibirán la solicitud simultáneamente
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tiempo de Espera de Solicitud (segundos)
                </label>
                <input
                  type="number"
                  value={config.requestTimeout}
                  onChange={(e) => handleConfigChange('requestTimeout', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Tiempo que los conductores tienen para aceptar una solicitud
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Distancia Máxima de Viaje (km)
                </label>
                <input
                  type="number"
                  value={config.maxTripDistance}
                  onChange={(e) => handleConfigChange('maxTripDistance', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Distancia máxima permitida para un viaje
                </p>
              </div>
            </div>
          </div>

          {/* Wait Times & Cancellations */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>⏱️</span>
              <span>Tiempos de Espera y Cancelaciones</span>
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tiempo Máximo de Espera (minutos)
                </label>
                <input
                  type="number"
                  value={config.maxWaitTime}
                  onChange={(e) => handleConfigChange('maxWaitTime', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Tiempo máximo que un pasajero esperará antes de que el viaje se cancele
                  automáticamente
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tiempo de Auto-Cancelación (minutos)
                </label>
                <input
                  type="number"
                  value={config.autoCancelTime}
                  onChange={(e) => handleConfigChange('autoCancelTime', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Tiempo después del cual el sistema cancela automáticamente si no hay conductor
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Penalización por Cancelación - Conductor ($)
                </label>
                <input
                  type="number"
                  value={config.cancellationFeeDriver}
                  onChange={(e) => handleConfigChange('cancellationFeeDriver', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Cargo aplicado al conductor si cancela después de aceptar
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Penalización por Cancelación - Pasajero ($)
                </label>
                <input
                  type="number"
                  value={config.cancellationFeePassenger}
                  onChange={(e) => handleConfigChange('cancellationFeePassenger', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Cargo aplicado al pasajero si cancela después de que el conductor aceptó
                </p>
              </div>
            </div>
          </div>

          {/* Pricing & Fees */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>💰</span>
              <span>Tarifas y Comisiones</span>
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tarifa Mínima ($)
                </label>
                <input
                  type="number"
                  value={config.minFare}
                  onChange={(e) => handleConfigChange('minFare', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Precio mínimo garantizado por viaje
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Comisión del Conductor (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.driverCommission}
                  onChange={(e) => handleConfigChange('driverCommission', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Porcentaje que la plataforma retiene de cada viaje
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tarifa de Plataforma ($)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={config.platformFee}
                  onChange={(e) => handleConfigChange('platformFee', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Cargo fijo adicional por viaje
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Calificación Mínima Requerida
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={config.ratingMinimum}
                  onChange={(e) => handleConfigChange('ratingMinimum', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Calificación mínima que debe mantener un conductor (de 5.0)
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Pricing */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📈</span>
              <span>Tarifas Dinámicas</span>
            </h2>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Multiplicador Hora Pico
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.peakHourMultiplier}
                  onChange={(e) => handleConfigChange('peakHourMultiplier', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Multiplicador de tarifa en horas pico (ej: 1.4 = +40%)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Multiplicador Tarifa Nocturna
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.nightFareMultiplier}
                  onChange={(e) => handleConfigChange('nightFareMultiplier', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Multiplicador de tarifa nocturna (ej: 1.25 = +25%)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Multiplicador Aeropuerto
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.airportFareMultiplier}
                  onChange={(e) => handleConfigChange('airportFareMultiplier', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Multiplicador para viajes al aeropuerto (ej: 1.5 = +50%)
                </p>
              </div>
            </div>
          </div>

          {/* Driver Limits */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🚕</span>
              <span>Límites de Conductores</span>
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Viajes Concurrentes Máximos
                </label>
                <input
                  type="number"
                  value={config.maxConcurrentTrips}
                  onChange={(e) => handleConfigChange('maxConcurrentTrips', e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Número máximo de viajes que un conductor puede tener activos simultáneamente
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Resumen de Configuración</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-700">
                  <strong>Radio de búsqueda:</strong> {config.searchRadius} km
                </p>
                <p className="text-gray-700">
                  <strong>Tiempo máximo de espera:</strong> {config.maxWaitTime} minutos
                </p>
                <p className="text-gray-700">
                  <strong>Auto-cancelación:</strong> {config.autoCancelTime} minutos
                </p>
                <p className="text-gray-700">
                  <strong>Tarifa mínima:</strong> ${config.minFare}
                </p>
                <p className="text-gray-700">
                  <strong>Comisión conductor:</strong> {config.driverCommission}%
                </p>
              </div>
              <div>
                <p className="text-gray-700">
                  <strong>Penalización conductor:</strong> ${config.cancellationFeeDriver}
                </p>
                <p className="text-gray-700">
                  <strong>Penalización pasajero:</strong> ${config.cancellationFeePassenger}
                </p>
                <p className="text-gray-700">
                  <strong>Hora pico:</strong> +{((config.peakHourMultiplier - 1) * 100).toFixed(0)}%
                </p>
                <p className="text-gray-700">
                  <strong>Tarifa nocturna:</strong> +{((config.nightFareMultiplier - 1) * 100).toFixed(0)}%
                </p>
                <p className="text-gray-700">
                  <strong>Aeropuerto:</strong> +{((config.airportFareMultiplier - 1) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={handleReset}
            className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold text-lg"
          >
            🔄 Restablecer Valores Predeterminados
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving || loading}
            className={`px-8 py-3 rounded-lg transition-colors font-semibold text-lg flex items-center gap-2 ${
              hasChanges && !saving && !loading
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                💾 Guardar Configuración
              </>
            )}
          </button>
        </div>

        {/* Confirm Save Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900">⚠️ Confirmar Cambios</h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Admin Info */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        Usuario: {user?.email || user?.full_name || 'Administrador'}
                      </p>
                      <p className="text-xs text-blue-700">
                        Este cambio quedará registrado a tu nombre en el historial de auditoría
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-sm text-gray-700">
                    Estás a punto de aplicar cambios a la configuración global de la plataforma.
                    Estos cambios afectarán a <strong>todos los usuarios</strong> inmediatamente.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Cambios que se aplicarán:
                  </h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Radio de búsqueda: {config.searchRadius} km</li>
                    <li>• Tiempo máximo de espera: {config.maxWaitTime} minutos</li>
                    <li>• Auto-cancelación: {config.autoCancelTime} minutos</li>
                    <li>• Tarifa mínima: ${config.minFare}</li>
                    <li>• Comisión del conductor: {config.driverCommission}%</li>
                    <li>• Y {Object.keys(config).length - 5} parámetros más...</li>
                  </ul>
                </div>

                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-sm text-red-700 font-semibold">
                    ⚠️ Esta acción no se puede deshacer. Asegúrate de haber revisado todos los
                    valores.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={saving}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    '✅ Confirmar y Guardar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900">🔄 Restablecer Configuración</h2>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  ¿Estás seguro de que deseas restablecer todos los valores a su configuración
                  predeterminada?
                </p>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-700">
                    Todos los cambios no guardados se perderán.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  🔄 Restablecer
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
