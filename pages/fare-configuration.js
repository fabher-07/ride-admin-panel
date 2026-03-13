import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function FareConfigurationScreen() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedTab, setSelectedTab] = useState('analysis')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingChanges, setPendingChanges] = useState(null)

  // Fare configuration
  const [fares, setFares] = useState({
    baseFare: 45,
    includedKm: 2,
    perKmExtra: 15,
    perMinuteWait: 5,
    minimumFare: 50,
  })

  // Zone multipliers
  const [zones, setZones] = useState([
    { id: 1, name: 'Aeropuerto', multiplier: 1.5, color: '#EF4444', active: true },
    { id: 2, name: 'Zonas Turísticas', multiplier: 1.2, color: '#F59E0B', active: true },
    { id: 3, name: 'Tarifa Nocturna', multiplier: 1.25, color: '#8B5CF6', active: true },
  ])

  // Dynamic pricing
  const [dynamicPricing, setDynamicPricing] = useState({
    enabled: true,
    rainMultiplier: 1.3,
    peakHoursMultiplier: 1.4,
    highDemandMultiplier: 1.5,
    maxMultiplier: 1.5,
    requireConfirmation: true,
  })

  // Simulator
  const [simulatorDistance, setSimulatorDistance] = useState(5)
  const [simulatorWaitTime, setSimulatorWaitTime] = useState(3)
  const [simulatorZone, setSimulatorZone] = useState('normal')
  const [simulatorDynamic, setSimulatorDynamic] = useState('none')

  // Market analysis data
  const marketData = {
    currentAverage: 65,
    competitorAverage: 70,
    recommendedBase: 45,
    recommendedPerKm: 15,
    projectedTrips: 1250,
    projectedIncrease: 18,
  }

  // Results tracking (15-day plan)
  const [resultsData] = useState([
    { day: 'Día 1', viajes: 980, satisfaccion: 4.2, ingresos: 63700 },
    { day: 'Día 3', viajes: 1050, satisfaccion: 4.3, ingresos: 68250 },
    { day: 'Día 5', viajes: 1120, satisfaccion: 4.4, ingresos: 72800 },
    { day: 'Día 7', viajes: 1180, satisfaccion: 4.5, ingresos: 76700 },
    { day: 'Día 10', viajes: 1220, satisfaccion: 4.6, ingresos: 79300 },
    { day: 'Día 15', viajes: 1250, satisfaccion: 4.7, ingresos: 81250 },
  ])

  useEffect(() => {
    setMounted(true)
  }, [])

  const calculateFare = (distance, waitTime, zone, dynamic) => {
    let fare = fares.baseFare

    // Add extra km cost
    if (distance > fares.includedKm) {
      fare += (distance - fares.includedKm) * fares.perKmExtra
    }

    // Add wait time cost
    fare += waitTime * fares.perMinuteWait

    // Apply zone multiplier
    if (zone !== 'normal') {
      const zoneData = zones.find((z) => z.name.toLowerCase().includes(zone.toLowerCase()))
      if (zoneData && zoneData.active) {
        fare *= zoneData.multiplier
      }
    }

    // Apply dynamic pricing
    if (dynamic !== 'none' && dynamicPricing.enabled) {
      if (dynamic === 'rain') fare *= dynamicPricing.rainMultiplier
      if (dynamic === 'peak') fare *= dynamicPricing.peakHoursMultiplier
      if (dynamic === 'demand') fare *= dynamicPricing.highDemandMultiplier
    }

    // Apply minimum fare
    fare = Math.max(fare, fares.minimumFare)

    return Math.round(fare)
  }

  const handleSaveFares = () => {
    setPendingChanges({ type: 'fares', data: fares })
    setShowConfirmModal(true)
  }

  const handleConfirmChanges = () => {
    alert('Tarifas actualizadas exitosamente. Los cambios se aplicarán gradualmente en 15 días.')
    setShowConfirmModal(false)
    setPendingChanges(null)
  }

  const currentFare = calculateFare(
    simulatorDistance,
    simulatorWaitTime,
    simulatorZone,
    simulatorDynamic
  )

  return (
    <>
      <Head>
        <title>GO!T Admin - Configuración de Tarifas</title>
        <meta name="description" content="Configuración inteligente de tarifas" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Configuración de Tarifas</h1>
          <p className="text-gray-600 mt-1">Sistema Inteligente de Precios</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setSelectedTab('analysis')}
              className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                selectedTab === 'analysis'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📊 Análisis de Mercado
            </button>
            <button
              onClick={() => setSelectedTab('configuration')}
              className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                selectedTab === 'configuration'
                  ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ⚙️ Configuración
            </button>
            <button
              onClick={() => setSelectedTab('zones')}
              className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                selectedTab === 'zones'
                  ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🗺️ Zonas
            </button>
            <button
              onClick={() => setSelectedTab('simulator')}
              className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                selectedTab === 'simulator'
                  ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🧮 Simulador
            </button>
            <button
              onClick={() => setSelectedTab('dynamic')}
              className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                selectedTab === 'dynamic'
                  ? 'bg-yellow-50 text-yellow-600 border-b-2 border-yellow-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ⚡ Tarifas Dinámicas
            </button>
            <button
              onClick={() => setSelectedTab('results')}
              className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                selectedTab === 'results'
                  ? 'bg-pink-50 text-pink-600 border-b-2 border-pink-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📈 Resultados
            </button>
          </div>
        </div>

        {/* Market Analysis Tab */}
        {selectedTab === 'analysis' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 shadow-sm border-2 border-blue-300">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                🤖 Recomendación Automática del Sistema
              </h2>

              <div className="grid grid-cols-2 gap-6 mb-4">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    💡 Tarifa Recomendada
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tarifa Base</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${marketData.recommendedBase}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Por km extra (del km 2+)</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${marketData.recommendedPerKm}
                      </span>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 mt-4">
                      <p className="text-xs text-green-800">
                        <strong>2 km incluidos</strong> en la tarifa base
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    📊 Justificación con Datos
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Más barato que competencia</p>
                      <p className="text-lg font-bold text-blue-600">
                        ${marketData.competitorAverage - marketData.recommendedBase} menos
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Proyección de viajes</p>
                      <p className="text-lg font-bold text-purple-600">
                        +{marketData.projectedIncrease}% más viajes
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Viajes esperados/día</p>
                      <p className="text-lg font-bold text-green-600">
                        {marketData.projectedTrips} viajes
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Estrategia:</strong> Tarifas más competitivas = Mayor volumen de viajes
                  = Más ingresos totales para conductores. El análisis muestra que reducir la
                  tarifa base a <strong className="text-green-600">${marketData.recommendedBase}</strong>{' '}
                  con <strong className="text-green-600">${marketData.recommendedPerKm}/km extra</strong>{' '}
                  (a partir del km 2) aumentará el volumen en{' '}
                  <strong className="text-blue-600">{marketData.projectedIncrease}%</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Tarifa Actual Promedio</p>
                <p className="text-3xl font-bold text-gray-900">${marketData.currentAverage}</p>
                <p className="text-xs text-gray-500 mt-2">Por viaje promedio</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Competencia Promedio</p>
                <p className="text-3xl font-bold text-orange-600">
                  ${marketData.competitorAverage}
                </p>
                <p className="text-xs text-gray-500 mt-2">Promedio del mercado</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Ventaja Competitiva</p>
                <p className="text-3xl font-bold text-green-600">
                  ${marketData.competitorAverage - marketData.recommendedBase}
                </p>
                <p className="text-xs text-green-600 mt-2">Más barato que competencia</p>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Tab */}
        {selectedTab === 'configuration' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">⚙️ Configuración Flexible</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Tarifa Base (incluye 2 km)
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-900">$</span>
                    <input
                      type="number"
                      value={fares.baseFare}
                      onChange={(e) => setFares({ ...fares, baseFare: parseFloat(e.target.value) })}
                      className="flex-1 px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Precio inicial que incluye los primeros 2 km
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Por km extra (del km 2 en adelante)
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-900">$</span>
                    <input
                      type="number"
                      value={fares.perKmExtra}
                      onChange={(e) =>
                        setFares({ ...fares, perKmExtra: parseFloat(e.target.value) })
                      }
                      className="flex-1 px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Costo por cada km adicional después de los 2 km incluidos
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Por minuto de espera
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-900">$</span>
                    <input
                      type="number"
                      value={fares.perMinuteWait}
                      onChange={(e) =>
                        setFares({ ...fares, perMinuteWait: parseFloat(e.target.value) })
                      }
                      className="flex-1 px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Cargo por cada minuto que el conductor espera
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Tarifa Mínima
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-900">$</span>
                    <input
                      type="number"
                      value={fares.minimumFare}
                      onChange={(e) =>
                        setFares({ ...fares, minimumFare: parseFloat(e.target.value) })
                      }
                      className="flex-1 px-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Precio mínimo garantizado por viaje
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  📋 Resumen de Configuración
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Viaje de 5 km (3 km extra):</p>
                    <p className="font-bold text-gray-900">
                      ${fares.baseFare} + (3 × ${fares.perKmExtra}) = $
                      {fares.baseFare + 3 * fares.perKmExtra}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Viaje de 10 km (8 km extra):</p>
                    <p className="font-bold text-gray-900">
                      ${fares.baseFare} + (8 × ${fares.perKmExtra}) = $
                      {fares.baseFare + 8 * fares.perKmExtra}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveFares}
                  className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-lg"
                >
                  💾 Guardar Tarifas
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Zones Tab */}
        {selectedTab === 'zones' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">🗺️ Editor de Zonas</h2>

              <div className="space-y-4">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: zone.color }}
                        ></div>
                        <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={zone.active}
                          onChange={(e) =>
                            setZones(
                              zones.map((z) =>
                                z.id === zone.id ? { ...z, active: e.target.checked } : z
                              )
                            )
                          }
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Activa</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Multiplicador de Tarifa
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            value={zone.multiplier}
                            onChange={(e) =>
                              setZones(
                                zones.map((z) =>
                                  z.id === zone.id
                                    ? { ...z, multiplier: parseFloat(e.target.value) }
                                    : z
                                )
                              )
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <span className="text-sm font-semibold text-gray-900">×</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Incremento</p>
                        <p className="text-2xl font-bold text-gray-900">
                          +{((zone.multiplier - 1) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Ejemplo: Viaje de $100</p>
                      <p className="text-lg font-bold text-gray-900">
                        ${Math.round(100 * zone.multiplier)} con este multiplicador
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  💡 Configuración Automática
                </h3>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• <strong>Aeropuerto:</strong> +50% automático (multiplicador 1.5)</li>
                  <li>• <strong>Zonas Turísticas:</strong> +20% (multiplicador 1.2)</li>
                  <li>• <strong>Tarifa Nocturna:</strong> +25% de 10pm a 6am (multiplicador 1.25)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Simulator Tab */}
        {selectedTab === 'simulator' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">🧮 Simulador de Tarifas</h2>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Distancia del Viaje (km)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={simulatorDistance}
                      onChange={(e) => setSimulatorDistance(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-center text-2xl font-bold text-blue-600 mt-2">
                      {simulatorDistance} km
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Tiempo de Espera (minutos)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={simulatorWaitTime}
                      onChange={(e) => setSimulatorWaitTime(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-center text-2xl font-bold text-purple-600 mt-2">
                      {simulatorWaitTime} min
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Zona</label>
                    <select
                      value={simulatorZone}
                      onChange={(e) => setSimulatorZone(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="normal">Normal</option>
                      <option value="aeropuerto">Aeropuerto (+50%)</option>
                      <option value="turística">Zona Turística (+20%)</option>
                      <option value="nocturna">Tarifa Nocturna (+25%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Tarifa Dinámica
                    </label>
                    <select
                      value={simulatorDynamic}
                      onChange={(e) => setSimulatorDynamic(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="none">Sin tarifa dinámica</option>
                      <option value="rain">Lluvia (+30%)</option>
                      <option value="peak">Hora Pico (+40%)</option>
                      <option value="demand">Alta Demanda (+50%)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-300">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    💰 Tarifa Calculada
                  </h3>

                  <div className="bg-white rounded-lg p-6 mb-4">
                    <p className="text-sm text-gray-600 mb-2">Total a Pagar</p>
                    <p className="text-5xl font-bold text-green-600">${currentFare}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tarifa base ({fares.includedKm} km):</span>
                      <span className="font-semibold">${fares.baseFare}</span>
                    </div>
                    {simulatorDistance > fares.includedKm && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Km extra ({simulatorDistance - fares.includedKm} km × $
                          {fares.perKmExtra}):
                        </span>
                        <span className="font-semibold">
                          ${(simulatorDistance - fares.includedKm) * fares.perKmExtra}
                        </span>
                      </div>
                    )}
                    {simulatorWaitTime > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Espera ({simulatorWaitTime} min × ${fares.perMinuteWait}):
                        </span>
                        <span className="font-semibold">
                          ${simulatorWaitTime * fares.perMinuteWait}
                        </span>
                      </div>
                    )}
                    {simulatorZone !== 'normal' && (
                      <div className="flex justify-between text-orange-600">
                        <span className="font-semibold">Zona especial:</span>
                        <span className="font-semibold">
                          {simulatorZone === 'aeropuerto' && '+50%'}
                          {simulatorZone === 'turística' && '+20%'}
                          {simulatorZone === 'nocturna' && '+25%'}
                        </span>
                      </div>
                    )}
                    {simulatorDynamic !== 'none' && (
                      <div className="flex justify-between text-blue-600">
                        <span className="font-semibold">Tarifa dinámica:</span>
                        <span className="font-semibold">
                          {simulatorDynamic === 'rain' && '+30%'}
                          {simulatorDynamic === 'peak' && '+40%'}
                          {simulatorDynamic === 'demand' && '+50%'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-700">
                      <strong>Ingreso del conductor:</strong> ${Math.round(currentFare * 0.8)}{' '}
                      (80%)
                    </p>
                    <p className="text-xs text-gray-700">
                      <strong>Comisión GO!T:</strong> ${Math.round(currentFare * 0.2)} (20%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Pricing Tab */}
        {selectedTab === 'dynamic' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">⚡ Tarifas Dinámicas</h2>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={dynamicPricing.enabled}
                    onChange={(e) =>
                      setDynamicPricing({ ...dynamicPricing, enabled: e.target.checked })
                    }
                    className="w-6 h-6 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-lg font-semibold text-gray-900">Sistema Activo</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">🌧️ Lluvia</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      step="0.1"
                      value={dynamicPricing.rainMultiplier}
                      onChange={(e) =>
                        setDynamicPricing({
                          ...dynamicPricing,
                          rainMultiplier: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="text-sm font-semibold">×</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    +{((dynamicPricing.rainMultiplier - 1) * 100).toFixed(0)}% cuando llueve
                  </p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">🕐 Hora Pico</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      step="0.1"
                      value={dynamicPricing.peakHoursMultiplier}
                      onChange={(e) =>
                        setDynamicPricing({
                          ...dynamicPricing,
                          peakHoursMultiplier: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="text-sm font-semibold">×</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    +{((dynamicPricing.peakHoursMultiplier - 1) * 100).toFixed(0)}% en horas pico
                  </p>
                </div>

                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">📈 Alta Demanda</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      step="0.1"
                      value={dynamicPricing.highDemandMultiplier}
                      onChange={(e) =>
                        setDynamicPricing({
                          ...dynamicPricing,
                          highDemandMultiplier: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="text-sm font-semibold">×</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    +{((dynamicPricing.highDemandMultiplier - 1) * 100).toFixed(0)}% con alta
                    demanda
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">⚠️ Límites</h3>
                <div className="flex items-center gap-4">
                  <label className="flex-1">
                    <span className="block text-xs text-gray-600 mb-2">
                      Multiplicador Máximo
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={dynamicPricing.maxMultiplier}
                      onChange={(e) =>
                        setDynamicPricing({
                          ...dynamicPricing,
                          maxMultiplier: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </label>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-2">Incremento Máximo</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      +{((dynamicPricing.maxMultiplier - 1) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-purple-50 rounded-lg p-4 border border-purple-200">
                <input
                  type="checkbox"
                  checked={dynamicPricing.requireConfirmation}
                  onChange={(e) =>
                    setDynamicPricing({
                      ...dynamicPricing,
                      requireConfirmation: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Requerir Confirmación del Pasajero
                  </p>
                  <p className="text-xs text-gray-600">
                    El pasajero debe aceptar la tarifa dinámica antes de solicitar el viaje
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {selectedTab === 'results' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6 shadow-sm border-2 border-pink-300">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📅 Plan Gradual de 15 Días
              </h2>
              <p className="text-sm text-gray-700 mb-4">
                Los cambios de tarifa se implementan gradualmente para monitorear el impacto en
                tiempo real y hacer ajustes basados en datos reales.
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Días 1-5</p>
                  <p className="text-sm font-semibold text-gray-900">Fase de Prueba</p>
                  <p className="text-xs text-gray-600 mt-2">20% de conductores</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Días 6-10</p>
                  <p className="text-sm font-semibold text-gray-900">Expansión</p>
                  <p className="text-xs text-gray-600 mt-2">60% de conductores</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Días 11-15</p>
                  <p className="text-sm font-semibold text-gray-900">Implementación Total</p>
                  <p className="text-xs text-gray-600 mt-2">100% de conductores</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">📈 Panel de Resultados</h2>

              {mounted && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Volumen de Viajes
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={resultsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="viajes"
                          stroke="#3B82F6"
                          strokeWidth={3}
                          name="Viajes"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Satisfacción del Cliente
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={resultsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis domain={[4.0, 5.0]} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="satisfaccion"
                          stroke="#10B981"
                          strokeWidth={3}
                          name="Rating"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Ingresos Totales
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={resultsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${value}`} />
                        <Bar dataKey="ingresos" fill="#8B5CF6" name="Ingresos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">✅ Objetivo Cumplido</p>
                  <p className="text-lg font-bold text-green-600">+18% Viajes</p>
                  <p className="text-xs text-gray-600 mt-1">Meta: +15%</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">✅ Satisfacción Alta</p>
                  <p className="text-lg font-bold text-green-600">4.7 ⭐</p>
                  <p className="text-xs text-gray-600 mt-1">Meta: 4.5+</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">✅ Ingresos Creciendo</p>
                  <p className="text-lg font-bold text-green-600">+27.5%</p>
                  <p className="text-xs text-gray-600 mt-1">Meta: +20%</p>
                </div>
              </div>

              <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  🤖 Recomendación Automática
                </h3>
                <p className="text-sm text-gray-700">
                  Los resultados son <strong className="text-green-600">positivos</strong>. Se
                  recomienda mantener las tarifas actuales y continuar el monitoreo. El volumen de
                  viajes aumentó un 18% y la satisfacción del cliente se mantiene alta (4.7⭐).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900">⚠️ Confirmar Cambios</h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-sm text-gray-700">
                    Estás a punto de actualizar las tarifas del sistema. Los cambios se
                    implementarán gradualmente en un período de <strong>15 días</strong>.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Nuevas Tarifas:
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-gray-600">Tarifa Base:</span>
                      <span className="font-bold">${fares.baseFare}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Por km extra (del km 2+):</span>
                      <span className="font-bold">${fares.perKmExtra}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Por minuto espera:</span>
                      <span className="font-bold">${fares.perMinuteWait}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Tarifa mínima:</span>
                      <span className="font-bold">${fares.minimumFare}</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    📅 Plan de Implementación:
                  </h3>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>• Días 1-5: Prueba con 20% de conductores</li>
                    <li>• Días 6-10: Expansión al 60% de conductores</li>
                    <li>• Días 11-15: Implementación total (100%)</li>
                    <li>• Monitoreo automático de resultados en tiempo real</li>
                  </ul>
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
                  onClick={handleConfirmChanges}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  ✅ Confirmar y Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
