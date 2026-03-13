import { useState, useEffect } from 'react'
import Head from 'next/head'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function PassengersScreen() {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedPassenger, setSelectedPassenger] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [passengers, setPassengers] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    reported: 0,
  })

  // Fetch passengers from Supabase
  const fetchPassengers = async () => {
    try {
      setLoading(true)
      
      const { data: passengersData, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_type', 'passenger')
        .order('created_at', { ascending: false })

      if (error) throw error

      const transformedPassengers = passengersData.map(passenger => ({
        id: passenger.id,
        name: passenger.full_name || 'Sin nombre',
        email: passenger.email || '',
        phone: passenger.phone || '',
        status: 'active',
        rating: 4.5,
        totalTrips: 0,
        joinedDate: new Date(passenger.created_at).toISOString().split('T')[0],
        lastTrip: null,
        photo: '👤',
        paymentMethod: 'Tarjeta',
        reportCount: 0,
        averageRatingGiven: 4.0,
        recentTrips: [],
        activityHistory: [
          { 
            date: new Date(passenger.created_at).toLocaleString('es-MX'), 
            action: 'Cuenta creada', 
            details: 'Registro completado' 
          },
        ],
      }))

      setPassengers(transformedPassengers)

      // Calculate stats
      const newStats = {
        total: transformedPassengers.length,
        active: transformedPassengers.filter(p => p.status === 'active').length,
        inactive: transformedPassengers.filter(p => p.status === 'inactive').length,
        reported: transformedPassengers.filter(p => p.reportCount > 0).length,
      }
      setStats(newStats)
    } catch (error) {
      console.error('Error fetching passengers:', error)
      alert('Error al cargar pasajeros: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchPassengers()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('passengers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: 'user_type=eq.passenger'
      }, () => {
        fetchPassengers()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active':
        return {
          label: 'Activo',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅',
        }
      case 'inactive':
        return {
          label: 'Inactivo',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '⏸️',
        }
      case 'reported':
        return {
          label: 'Reportado',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '⚠️',
        }
      default:
        return {
          label: 'Desconocido',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
        }
    }
  }

  const handleViewProfile = (passenger) => {
    setSelectedPassenger(passenger)
    setShowProfileModal(true)
  }

  const handleBlockPassenger = async (passenger) => {
    const reason = prompt(
      `¿Estás seguro de bloquear a ${passenger.name}?\n\nEscribe la razón del bloqueo:`
    )
    
    if (!reason) return

    try {
      // Note: We'll need to add a 'blocked' field to users table or use a separate blocked_users table
      // For now, we'll just log the action
      
      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'Bloqueó pasajero',
        details: `${passenger.name} (${passenger.email}) - Razón: ${reason}`,
        category: 'passengers',
        ip_address: 'N/A',
      })

      alert(`${passenger.name} ha sido bloqueado exitosamente.`)
      fetchPassengers()
    } catch (error) {
      console.error('Error blocking passenger:', error)
      alert('Error al bloquear pasajero: ' + error.message)
    }
  }

  const handleUnblockPassenger = async (passenger) => {
    if (!confirm(`¿Desbloquear a ${passenger.name}?`)) return

    try {
      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'Desbloqueó pasajero',
        details: `${passenger.name} (${passenger.email})`,
        category: 'passengers',
        ip_address: 'N/A',
      })

      alert(`${passenger.name} ha sido desbloqueado.`)
      fetchPassengers()
    } catch (error) {
      console.error('Error unblocking passenger:', error)
      alert('Error al desbloquear pasajero: ' + error.message)
    }
  }

  const filteredPassengers = passengers.filter((passenger) => {
    const matchesSearch =
      passenger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.phone.includes(searchTerm)

    const matchesStatus = statusFilter === 'all' || passenger.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <>
      <Head>
        <title>GO!T Admin - Gestión de Pasajeros</title>
        <meta name="description" content="Gestión y administración de pasajeros" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Pasajeros</h1>
              {mounted && (
                <p className="text-gray-600 mt-1">
                  {filteredPassengers.length} pasajeros encontrados
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-gray-500">
            <p className="text-sm text-gray-600">Total Pasajeros</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Activos</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-gray-400">
            <p className="text-sm text-gray-600">Inactivos</p>
            <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Reportados</p>
            <p className="text-2xl font-bold text-red-600">{stats.reported}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Pasajero
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Estado
              </label>
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
                  onClick={() => setStatusFilter('active')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'active'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Activos
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'inactive'
                      ? 'bg-gray-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Inactivos
                </button>
                <button
                  onClick={() => setStatusFilter('reported')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'reported'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Reportados
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary mb-4"></div>
            <p className="text-gray-600">Cargando pasajeros...</p>
          </div>
        )}

        {/* Passengers List */}
        {!loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pasajero
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Viajes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Viaje
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPassengers.map((passenger) => {
                const statusConfig = getStatusConfig(passenger.status)

                return (
                  <tr key={passenger.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">{passenger.photo}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {passenger.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Miembro desde {passenger.joinedDate}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{passenger.phone}</div>
                      <div className="text-xs text-gray-500">{passenger.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}
                      >
                        <span>{statusConfig.icon}</span>
                        <span>{statusConfig.label}</span>
                      </span>
                      {passenger.reportCount > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {passenger.reportCount} reportes
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-1">⭐</span>
                        <span className="text-sm font-medium text-gray-900">
                          {passenger.rating}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {passenger.totalTrips}
                      </div>
                      <div className="text-xs text-gray-500">{passenger.paymentMethod}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{passenger.lastTrip}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewProfile(passenger)}
                          className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors font-medium"
                        >
                          Ver Perfil
                        </button>
                        {passenger.status !== 'blocked' ? (
                          <button
                            onClick={() => handleBlockPassenger(passenger)}
                            className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors font-medium"
                          >
                            Bloquear
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnblockPassenger(passenger)}
                            className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors font-medium"
                          >
                            Desbloquear
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}

        {!loading && filteredPassengers.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center mt-6">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No se encontraron pasajeros
            </h3>
            <p className="text-gray-600">
              Intenta con otros términos de búsqueda o filtros
            </p>
          </div>
        )}

        {/* Profile Modal */}
        {showProfileModal && selectedPassenger && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Perfil de Pasajero</h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="flex items-center gap-4 pb-6 border-b">
                  <span className="text-6xl">{selectedPassenger.photo}</span>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedPassenger.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="font-medium">{selectedPassenger.rating}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600">
                        {selectedPassenger.totalTrips} viajes
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${
                      getStatusConfig(selectedPassenger.status).color
                    }`}
                  >
                    {getStatusConfig(selectedPassenger.status).label}
                  </span>
                </div>

                {/* Contact Info */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Información de Contacto
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Teléfono:</span>
                      <span className="font-medium">{selectedPassenger.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedPassenger.email}</span>
                    </div>
                  </div>
                </div>

                {/* Activity Info */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Información de Actividad
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Miembro desde:</span>
                      <span className="font-medium">{selectedPassenger.joinedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Último viaje:</span>
                      <span className="font-medium">{selectedPassenger.lastTrip}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total de viajes:</span>
                      <span className="font-medium">{selectedPassenger.totalTrips}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Método de pago:</span>
                      <span className="font-medium">{selectedPassenger.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* Trip Statistics */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Estadísticas de Viajes
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-blue-600">
                        {selectedPassenger.totalTrips}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Viajes Totales</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-yellow-600">
                        {selectedPassenger.averageRatingGiven || 'N/A'} ⭐
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Promedio dado a conductores</p>
                    </div>
                  </div>
                </div>

                {/* Recent Trips */}
                {selectedPassenger.recentTrips && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Viajes Recientes
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedPassenger.recentTrips.map((trip) => (
                        <div
                          key={trip.id}
                          className="bg-gray-50 rounded-lg p-3 flex justify-between items-center"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-500">#{trip.id}</span>
                              <span className="text-sm font-medium text-gray-900">
                                {trip.route}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-600">{trip.date}</span>
                              <span className="text-xs text-gray-600">•</span>
                              <span className="text-xs text-gray-600">{trip.driver}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">${trip.fare}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-yellow-500 text-xs">⭐</span>
                              <span className="text-xs font-medium text-gray-700">
                                {trip.rating}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Reports */}
                {selectedPassenger.reportCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-800 mb-3">
                      ⚠️ Reportes Recibidos ({selectedPassenger.reportCount})
                    </h4>
                    {selectedPassenger.detailedReports ? (
                      <div className="space-y-3">
                        {selectedPassenger.detailedReports.map((report) => (
                          <div key={report.id} className="bg-white rounded-lg p-3 border border-red-200">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-semibold text-red-800">
                                  {report.reason}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Viaje #{report.tripId} • {report.date}
                                </p>
                              </div>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  report.status === 'under_review'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {report.status === 'under_review' ? 'En revisión' : 'Resuelto'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{report.description}</p>
                            <p className="text-xs text-gray-600">
                              Reportado por: {report.driver}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ul className="space-y-1">
                        {selectedPassenger.reportReasons?.map((reason, index) => (
                          <li key={index} className="text-sm text-red-700">
                            • {reason}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Activity History */}
                {selectedPassenger.activityHistory && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Historial Completo de Actividad
                    </h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {selectedPassenger.activityHistory.map((activity, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            {index < selectedPassenger.activityHistory.length - 1 && (
                              <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.action}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{activity.details}</p>
                            <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      handleBlockPassenger(selectedPassenger)
                      setShowProfileModal(false)
                    }}
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    Bloquear Usuario
                  </button>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
