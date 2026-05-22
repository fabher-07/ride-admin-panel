import { useState, useEffect } from 'react'
import Head from 'next/head'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'

export default function TripsListScreen() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [trips, setTrips] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    enCamino: 0,
    recogiendo: 0,
    pausado: 0,
    totalFare: 0,
  })

  // Fetch active trips from Supabase
  const fetchActiveTrips = async () => {
    try {
      setLoading(true)
      
      const { data: tripsData, error } = await supabase
        .from('trips')
        .select(`
          *,
          passenger_user:users!passenger_id(full_name, phone),
          driver_user:users!driver_id(full_name, phone)
        `)
        .in('status', ['requested', 'accepted', 'in_progress'])
        .order('created_at', { ascending: false })

      if (error) throw error

      const transformedTrips = tripsData.map(trip => {
        const startTime = new Date(trip.created_at)
        const now = new Date()
        const elapsed = Math.floor((now - startTime) / 60000)
        
        return {
          id: trip.id,
          driver: {
            name: trip.driver_user?.full_name || 'Sin asignar',
            rating: 5.0,
            photo: '🚕',
            economico: 'N/A',
          },
          passenger: {
            name: trip.passenger_user?.full_name || 'Pasajero',
            phone: trip.passenger_user?.phone || 'N/A',
          },
          route: {
            origin: trip.pickup_address || 'Origen',
            destination: trip.destination_address || trip.dropoff_address || 'Destino',
            distance: trip.distance_km ? `${trip.distance_km} km` : 'N/A',
          },
          time: {
            elapsed: elapsed,
            estimated: trip.duration_minutes || 20,
            started: startTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          },
          status: trip.status === 'requested' ? 'recogiendo' : 
                  trip.status === 'accepted' ? 'recogiendo' : 'en_camino',
          fare: trip.final_price || trip.total_fare || 0,
          paymentMethod: trip.payment_method || 'cash',
        }
      })

      setTrips(transformedTrips)

      // Calculate stats
      const newStats = {
        total: transformedTrips.length,
        enCamino: transformedTrips.filter(t => t.status === 'en_camino').length,
        recogiendo: transformedTrips.filter(t => t.status === 'recogiendo').length,
        pausado: transformedTrips.filter(t => t.status === 'pausado').length,
        totalFare: transformedTrips.reduce((sum, t) => sum + t.fare, 0),
      }
      setStats(newStats)
    } catch (error) {
      console.error('Error fetching active trips:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchActiveTrips()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('active_trips_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trips'
      }, () => {
        fetchActiveTrips()
      })
      .subscribe()

    // Update elapsed time every minute
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1)
      setTrips((prev) =>
        prev.map((trip) => ({
          ...trip,
          time: {
            ...trip.time,
            elapsed: trip.time.elapsed + 1,
          },
        }))
      )
    }, 60000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const getStatusInfo = (status) => {
    switch (status) {
      case 'recogiendo':
        return {
          label: 'Recogiendo pasajero',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '🚕',
        }
      case 'en_camino':
        return {
          label: 'En camino al destino',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '🚗',
        }
      case 'pausado':
        return {
          label: 'Pausado',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: '⏸️',
        }
      default:
        return {
          label: 'Desconocido',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
        }
    }
  }

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch =
      trip.driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.passenger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.id.includes(searchTerm)

    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <>
      <Head>
        <title>RIDE Admin - Viajes Activos</title>
        <meta name="description" content="Lista de viajes activos en tiempo real" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Viajes Activos</h1>
              {mounted && (
                <p className="text-gray-600 mt-1">
                  Última actualización: {new Date().toLocaleTimeString('es-MX')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">Tiempo real</span>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-gray-500">
            <p className="text-sm text-gray-600">Total Viajes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">En Camino</p>
            <p className="text-2xl font-bold text-gray-900">{stats.enCamino}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Recogiendo</p>
            <p className="text-2xl font-bold text-gray-900">{stats.recogiendo}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Pausados</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pausado}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-primary">
            <p className="text-sm text-gray-600">Ingresos Totales</p>
            <p className="text-2xl font-bold text-gray-900">${stats.totalFare}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por conductor, pasajero o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-primary text-black'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('recogiendo')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'recogiendo'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Recogiendo
              </button>
              <button
                onClick={() => setStatusFilter('en_camino')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'en_camino'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                En Camino
              </button>
              <button
                onClick={() => setStatusFilter('pausado')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'pausado'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pausados
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary mb-4"></div>
            <p className="text-gray-600">Cargando viajes activos...</p>
          </div>
        )}

        {/* Trips List */}
        {!loading && (
        <div className="space-y-4">
          {filteredTrips.map((trip) => {
            const statusInfo = getStatusInfo(trip.status)
            const progress = (trip.time.elapsed / trip.time.estimated) * 100

            return (
              <div
                key={trip.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Trip Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{statusInfo.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Viaje #{trip.id}</h3>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.color} mt-1`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">${trip.fare}</p>
                    <p className="text-sm text-gray-600">{trip.paymentMethod}</p>
                  </div>
                </div>

                {/* Trip Details Grid */}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  {/* Driver Info */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-3xl">{trip.driver.photo}</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Conductor</p>
                      <p className="font-semibold text-gray-900">{trip.driver.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-sm font-medium">{trip.driver.rating}</span>
                        <span className="text-xs text-gray-500">• #{trip.driver.economico}</span>
                      </div>
                    </div>
                  </div>

                  {/* Passenger Info */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-3xl">👤</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Pasajero</p>
                      <p className="font-semibold text-gray-900">{trip.passenger.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{trip.passenger.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Route Info */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">Ruta</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-semibold text-gray-900">{trip.route.origin}</span>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex-1 h-0.5 bg-gray-300"></div>
                      <span className="px-3 text-sm text-gray-600">{trip.route.distance}</span>
                      <div className="flex-1 h-0.5 bg-gray-300"></div>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold text-gray-900">{trip.route.destination}</span>
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Progress */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Tiempo</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {trip.time.elapsed} min / {trip.time.estimated} min estimado
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Inicio: {trip.time.started}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm">
                    Ver en Mapa
                  </button>
                  <button className="flex-1 bg-blue-100 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm">
                    Contactar Conductor
                  </button>
                  <button className="flex-1 bg-orange-100 text-orange-700 py-2 px-4 rounded-lg hover:bg-orange-200 transition-colors font-medium text-sm">
                    Detalles Completos
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        )}

        {!loading && filteredTrips.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">🚕</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay viajes</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all'
                ? 'No se encontraron viajes con los filtros aplicados'
                : 'No hay viajes activos en este momento'}
            </p>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
