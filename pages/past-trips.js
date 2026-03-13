import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'

export default function PastTripsScreen() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [allTrips, setAllTrips] = useState([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [passengerFilter, setPassengerFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')

  // Fetch past trips from Supabase
  const fetchPastTrips = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('trips')
        .select(`
          *,
          passenger_user:users!passenger_id(full_name, phone),
          driver_user:users!driver_id(full_name, phone)
        `, { count: 'exact' })
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      // Apply filters
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString())
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('created_at', endDate.toISOString())
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data: tripsData, error, count } = await query

      if (error) throw error

      setTotalCount(count || 0)

      const transformedTrips = tripsData.map(trip => {
        const tripDate = new Date(trip.created_at)
        return {
          id: trip.id,
          date: tripDate.toISOString().split('T')[0],
          time: tripDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          driver: trip.driver_user?.full_name || 'Sin asignar',
          driverEconomico: 'N/A',
          passenger: trip.passenger_user?.full_name || 'Pasajero',
          origin: trip.pickup_address || 'Origen',
          destination: trip.destination_address || trip.dropoff_address || 'Destino',
          zone: '-',
          distance: trip.distance_km ? `${trip.distance_km} km` : trip.actual_distance ? `${trip.actual_distance} km` : 'N/A',
          duration: trip.duration_minutes ? `${trip.duration_minutes} min` : trip.actual_duration ? `${trip.actual_duration} min` : 'N/A',
          amount: trip.final_price || trip.total_fare || 0,
          paymentMethod: trip.payment_method || 'cash',
          paymentStatus: trip.payment_status || 'pending',
          rating: trip.driver_rating || '-',
        }
      })

      setAllTrips(transformedTrips)
    } catch (error) {
      console.error('Error fetching past trips:', error)
      alert('Error al cargar viajes: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchPastTrips()
  }, [currentPage, dateFrom, dateTo])

  // Filter trips based on all criteria
  const filteredTrips = allTrips.filter((trip) => {
    // Search term (driver, passenger, or economico)
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesSearch =
        trip.driver.toLowerCase().includes(search) ||
        trip.passenger.toLowerCase().includes(search) ||
        trip.driverEconomico.includes(search)
      if (!matchesSearch) return false
    }

    // Date range
    if (dateFrom && trip.date < dateFrom) return false
    if (dateTo && trip.date > dateTo) return false

    // Zone
    if (zoneFilter !== 'all' && trip.zone !== zoneFilter) return false

    // Amount range
    if (amountMin && trip.amount < parseFloat(amountMin)) return false
    if (amountMax && trip.amount > parseFloat(amountMax)) return false

    // Driver
    if (driverFilter && !trip.driver.toLowerCase().includes(driverFilter.toLowerCase()))
      return false

    // Passenger
    if (
      passengerFilter &&
      !trip.passenger.toLowerCase().includes(passengerFilter.toLowerCase())
    )
      return false

    // Payment status
    if (paymentStatusFilter !== 'all' && trip.paymentStatus !== paymentStatusFilter)
      return false

    return true
  })

  // Calculate statistics
  const stats = {
    totalTrips: filteredTrips.length,
    totalRevenue: filteredTrips.reduce((sum, trip) => sum + trip.amount, 0),
    averageAmount: filteredTrips.length > 0
      ? filteredTrips.reduce((sum, trip) => sum + trip.amount, 0) / filteredTrips.length
      : 0,
    paidTrips: filteredTrips.filter((t) => t.paymentStatus === 'paid').length,
    pendingTrips: filteredTrips.filter((t) => t.paymentStatus === 'pending').length,
    failedTrips: filteredTrips.filter((t) => t.paymentStatus === 'failed').length,
    averageRating: filteredTrips.length > 0
      ? filteredTrips.reduce((sum, trip) => sum + trip.rating, 0) / filteredTrips.length
      : 0,
  }

  const getPaymentStatusConfig = (status) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Pagado',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅',
        }
      case 'pending':
        return {
          label: 'Pendiente',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⏳',
        }
      case 'failed':
        return {
          label: 'Fallido',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '❌',
        }
      default:
        return {
          label: 'Desconocido',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
        }
    }
  }

  const handleExportCSV = () => {
    // Create CSV content
    const headers = [
      'ID',
      'Fecha',
      'Hora',
      'Conductor',
      'Económico',
      'Pasajero',
      'Origen',
      'Destino',
      'Zona',
      'Distancia',
      'Duración',
      'Monto',
      'Método Pago',
      'Estado Pago',
      'Calificación',
    ]

    const rows = filteredTrips.map((trip) => [
      trip.id,
      trip.date,
      trip.time,
      trip.driver,
      trip.driverEconomico,
      trip.passenger,
      trip.origin,
      trip.destination,
      trip.zone,
      trip.distance,
      trip.duration,
      trip.amount,
      trip.paymentMethod,
      trip.paymentStatus,
      trip.rating,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `viajes_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    alert(`Exportando ${filteredTrips.length} viajes a CSV...`)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setDateFrom('')
    setDateTo('')
    setZoneFilter('all')
    setAmountMin('')
    setAmountMax('')
    setDriverFilter('')
    setPassengerFilter('')
    setPaymentStatusFilter('all')
    setCurrentPage(1)
    fetchPastTrips()
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  return (
    <>
      <Head>
        <title>GO!T Admin - Viajes Pasados</title>
        <meta name="description" content="Historial de viajes y operaciones" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Viajes Pasados</h1>
              <p className="text-gray-600 mt-1">Operaciones y Finanzas</p>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={filteredTrips.length === 0}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center gap-2 disabled:bg-gray-400"
            >
              <span>📊</span>
              <span>Exportar a CSV ({filteredTrips.length})</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Búsqueda y Filtros</h2>
            <button
              onClick={handleClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {/* Search */}
            <div className="col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Búsqueda General
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por conductor, pasajero o económico..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Zone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zona</label>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas las zonas</option>
                <option value="Norte">Norte</option>
                <option value="Sur">Sur</option>
                <option value="Este">Este</option>
                <option value="Oeste">Oeste</option>
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado de Pago
              </label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
                <option value="failed">Fallido</option>
              </select>
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Mínimo
              </label>
              <input
                type="number"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="$0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Máximo
              </label>
              <input
                type="number"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="$999"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Driver Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conductor Específico
              </label>
              <input
                type="text"
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                placeholder="Nombre del conductor..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Passenger Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pasajero Específico
              </label>
              <input
                type="text"
                value={passengerFilter}
                onChange={(e) => setPassengerFilter(e.target.value)}
                placeholder="Nombre del pasajero..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Viajes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTrips}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Ingresos Totales</p>
            <p className="text-2xl font-bold text-green-600">
              ${stats.totalRevenue.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Monto Promedio</p>
            <p className="text-2xl font-bold text-purple-600">
              ${stats.averageAmount.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Calificación Promedio</p>
            <p className="text-2xl font-bold text-yellow-600">
              ⭐ {stats.averageRating.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Payment Status Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Pagados</p>
            <p className="text-2xl font-bold text-green-600">{stats.paidTrips}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingTrips}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Fallidos</p>
            <p className="text-2xl font-bold text-red-600">{stats.failedTrips}</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary mb-4"></div>
            <p className="text-gray-600">Cargando viajes pasados...</p>
          </div>
        )}

        {/* Trips Table */}
        {!loading && (
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 border-b-2 border-gray-300">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Fecha/Hora
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Conductor
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Pasajero
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Ruta
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Zona
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Distancia
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Monto
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Pago
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y-2 divide-gray-300">
              {filteredTrips.map((trip) => {
                const statusConfig = getPaymentStatusConfig(trip.paymentStatus)

                return (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 border-r border-gray-300">
                      <div className="text-sm font-medium text-gray-900">{trip.date}</div>
                      <div className="text-xs text-gray-500">{trip.time}</div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-300">
                      <div className="text-sm font-medium text-gray-900">{trip.driver}</div>
                      <div className="text-xs text-gray-500">#{trip.driverEconomico}</div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-300">
                      <div className="text-sm text-gray-900">{trip.passenger}</div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-300">
                      <div className="text-xs text-gray-900">{trip.origin}</div>
                      <div className="text-xs text-gray-500">→ {trip.destination}</div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-300">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {trip.zone}
                      </span>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-300">
                      <div className="text-sm text-gray-900">{trip.distance}</div>
                      <div className="text-xs text-gray-500">{trip.duration}</div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-300">
                      <div className="text-sm font-bold text-gray-900">
                        ${trip.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">{trip.paymentMethod}</div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-300">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}
                      >
                        <span>{statusConfig.icon}</span>
                        <span>{statusConfig.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-sm font-medium text-gray-900">
                          {trip.rating}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        {!loading && totalCount > itemsPerPage && (
          <div className="bg-white rounded-lg p-4 mt-6 flex justify-between items-center border border-gray-200">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} viajes
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <div className="px-4 py-2 bg-primary text-black rounded-lg font-bold">
                Página {currentPage} de {totalPages}
              </div>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {!loading && filteredTrips.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center mt-6">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No se encontraron viajes
            </h3>
            <p className="text-gray-600">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
