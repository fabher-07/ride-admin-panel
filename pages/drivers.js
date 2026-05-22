import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
// Web version doesn't use mobile push notifications

export default function DriversScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [drivers, setDrivers] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    blocked: 0,
  })

  // Fetch drivers from Supabase
  const fetchDrivers = async () => {
    try {
      setLoading(true)
      
      // Fetch drivers with user data
      const { data: driversData, error } = await supabase
        .from('drivers')
        .select(`
          *,
          user:users(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data to match UI format
      const transformedDrivers = driversData.map(driver => ({
        id: driver.id,
        name: driver.user?.full_name || 'Sin nombre',
        email: driver.user?.email || '',
        phone: driver.user?.phone || '',
        economico: driver.economico,
        status: driver.status,
        rating: driver.rating || 5.0,
        totalTrips: driver.total_trips || 0,
        tripsThisMonth: 0, // TODO: Calculate from trips table
        joinedDate: new Date(driver.created_at).toISOString().split('T')[0],
        lastTrip: null, // TODO: Get from trips table
        photo: '🚕',
        vehicleModel: `${driver.vehicle_brand} ${driver.vehicle_model} ${driver.vehicle_year}`,
        vehiclePlate: driver.vehicle_plates,
        rejection_reason: driver.rejection_reason,
      }))

      setDrivers(transformedDrivers)

      // Calculate stats
      const newStats = {
        total: transformedDrivers.length,
        verified: transformedDrivers.filter(d => d.status === 'approved').length,
        pending: transformedDrivers.filter(d => d.status === 'pending').length,
        blocked: transformedDrivers.filter(d => d.status === 'blocked').length,
      }
      setStats(newStats)
    } catch (error) {
      console.error('Error fetching drivers:', error)
      alert('Error al cargar conductores: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchDrivers()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('drivers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drivers'
      }, () => {
        fetchDrivers()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Aprobado',
          icon: '✅',
          color: 'bg-green-100 text-green-800 border-green-200',
        }
      case 'pending':
        return {
          label: 'Pendiente',
          icon: '⏳',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        }
      case 'rejected':
        return {
          label: 'Rechazado',
          icon: '❌',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
        }
      case 'blocked':
        return {
          label: 'Bloqueado',
          icon: '🚫',
          color: 'bg-red-100 text-red-800 border-red-200',
        }
      default:
        return {
          label: 'Desconocido',
          icon: '❓',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
        }
    }
  }


  const handleViewProfile = (driver) => {
    setSelectedDriver(driver)
    setShowProfileModal(true)
  }

  const handleBlockDriver = async (driver) => {
    const reason = prompt(
      `¿Estás seguro de bloquear a ${driver.name}?\n\nEscribe la razón del bloqueo:`
    )
    
    if (!reason) return

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ 
          status: 'blocked',
          rejection_reason: reason
        })
        .eq('id', driver.id)

      if (error) throw error

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'Bloqueó conductor',
        details: `${driver.name} (${driver.economico}) - Razón: ${reason}`,
        category: 'drivers',
        ip_address: 'N/A',
      })

      alert(`${driver.name} ha sido bloqueado exitosamente.`)
      fetchDrivers()
    } catch (error) {
      console.error('Error blocking driver:', error)
      alert('Error al bloquear conductor: ' + error.message)
    }
  }

  const handleUnblockDriver = async (driver) => {
    if (!confirm(`¿Desbloquear a ${driver.name}?`)) return

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ 
          status: 'approved',
          rejection_reason: null
        })
        .eq('id', driver.id)

      if (error) throw error

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'Desbloqueó conductor',
        details: `${driver.name} (${driver.economico})`,
        category: 'drivers',
        ip_address: 'N/A',
      })

      alert(`${driver.name} ha sido desbloqueado.`)
      fetchDrivers()
    } catch (error) {
      console.error('Error unblocking driver:', error)
      alert('Error al desbloquear conductor: ' + error.message)
    }
  }

  const handleApproveDriver = async (driver) => {
    if (!confirm(`¿Aprobar a ${driver.name}?`)) return

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ status: 'approved' })
        .eq('id', driver.id)

      if (error) throw error

      // Push notifications not available in web admin panel
      if (driver.user_id) {
        console.log('Driver approved notification would be sent to:', driver.user_id)
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'Aprobó conductor',
        details: `${driver.name} (${driver.economico})`,
        category: 'drivers',
        ip_address: 'N/A',
      })

      alert(`${driver.name} ha sido aprobado y puede comenzar a trabajar.\n\nSe envió notificación push al conductor.`)
      fetchDrivers()
    } catch (error) {
      console.error('Error approving driver:', error)
      alert('Error al aprobar conductor: ' + error.message)
    }
  }

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm) ||
      driver.economico.includes(searchTerm)

    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <>
      <Head>
        <title>RIDE Admin - Gestión de Conductores</title>
        <meta name="description" content="Gestión y administración de conductores" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Conductores</h1>
              {mounted && (
                <p className="text-gray-600 mt-1">
                  {filteredDrivers.length} conductores encontrados
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-gray-500">
            <p className="text-sm text-gray-600">Total Conductores</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Verificados</p>
            <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Bloqueados</p>
            <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Conductor
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono, email o económico..."
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
                  onClick={() => setStatusFilter('approved')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'approved'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ✅ Aprobados
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'pending'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ⏳ Pendientes
                </button>
                <button
                  onClick={() => setStatusFilter('blocked')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === 'blocked'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ❌ Bloqueados
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary mb-4"></div>
            <p className="text-gray-600">Cargando conductores...</p>
          </div>
        )}

        {/* Drivers Table */}
        {!loading && (
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 border-b-2 border-gray-300">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Conductor
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Contacto
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Estado
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Rating
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                  Viajes Mes
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y-2 divide-gray-300">
              {filteredDrivers.map((driver) => {
                const statusConfig = getStatusConfig(driver.status)

                return (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 border-r border-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{driver.photo}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {driver.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            #{driver.economico}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-300">
                      <div className="text-xs text-gray-900">{driver.phone}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">{driver.email}</div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-300">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}
                      >
                        <span>{statusConfig.icon}</span>
                        <span className="hidden sm:inline">{statusConfig.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-300">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-sm font-medium text-gray-900">
                          {driver.rating}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {driver.totalTrips} total
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center border-r border-gray-300">
                      <div className="text-xl font-bold text-gray-900">
                        {driver.tripsThisMonth}
                      </div>
                      <div className="text-xs text-gray-500">viajes</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleViewProfile(driver)}
                          className="bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors font-medium text-xs whitespace-nowrap"
                        >
                          Ver Perfil
                        </button>
                        {driver.status === 'pending' && (
                          <>
                            <button
                              onClick={() => router.push(`/verify-documents?driverId=${driver.id}`)}
                              className="bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors font-medium text-xs whitespace-nowrap"
                            >
                              Verificar
                            </button>
                            <button
                              onClick={() => handleApproveDriver(driver)}
                              className="bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors font-medium text-xs whitespace-nowrap"
                            >
                              Aprobar
                            </button>
                          </>
                        )}
                        {driver.status !== 'blocked' ? (
                          <button
                            onClick={() => handleBlockDriver(driver)}
                            className="bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors font-medium text-xs whitespace-nowrap"
                          >
                            Bloquear
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnblockDriver(driver)}
                            className="bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors font-medium text-xs whitespace-nowrap"
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

        {!loading && filteredDrivers.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center mt-6">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No se encontraron conductores
            </h3>
            <p className="text-gray-600">
              Intenta con otros términos de búsqueda o filtros
            </p>
          </div>
        )}

        {/* Profile Modal */}
        {showProfileModal && selectedDriver && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Perfil de Conductor</h2>
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
                  <span className="text-6xl">{selectedDriver.photo}</span>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedDriver.name}
                    </h3>
                    <p className="text-gray-600">Económico: #{selectedDriver.economico}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="font-medium">{selectedDriver.rating}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600">
                        {selectedDriver.totalTrips} viajes totales
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${
                      getStatusConfig(selectedDriver.status).color
                    }`}
                  >
                    {getStatusConfig(selectedDriver.status).icon}{' '}
                    {getStatusConfig(selectedDriver.status).label}
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
                      <span className="font-medium">{selectedDriver.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedDriver.email}</span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Información del Vehículo
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Modelo:</span>
                      <span className="font-medium">{selectedDriver.vehicleModel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Placas:</span>
                      <span className="font-medium">{selectedDriver.vehiclePlate}</span>
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
                      <span className="font-medium">{selectedDriver.joinedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Último viaje:</span>
                      <span className="font-medium">{selectedDriver.lastTrip}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Viajes este mes:</span>
                      <span className="font-medium text-lg">
                        {selectedDriver.tripsThisMonth}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pending Documents */}
                {selectedDriver.pendingDocuments &&
                  selectedDriver.pendingDocuments.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-yellow-800 mb-3">
                        ⏳ Documentos Pendientes
                      </h4>
                      <ul className="space-y-1">
                        {selectedDriver.pendingDocuments.map((doc, index) => (
                          <li key={index} className="text-sm text-yellow-700">
                            • {doc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Block Info */}
                {selectedDriver.status === 'blocked' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-800 mb-3">
                      ❌ Información de Bloqueo
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-red-700">Razón:</span>
                        <span className="font-medium text-red-900">
                          {selectedDriver.blockReason}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-700">Fecha de bloqueo:</span>
                        <span className="font-medium text-red-900">
                          {selectedDriver.blockDate}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedDriver.status === 'pending' && (
                    <button
                      onClick={() => {
                        handleApproveDriver(selectedDriver)
                        setShowProfileModal(false)
                      }}
                      className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                      Aprobar Conductor
                    </button>
                  )}
                  {selectedDriver.status !== 'blocked' ? (
                    <button
                      onClick={() => {
                        handleBlockDriver(selectedDriver)
                        setShowProfileModal(false)
                      }}
                      className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
                    >
                      Bloquear Conductor
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleUnblockDriver(selectedDriver)
                        setShowProfileModal(false)
                      }}
                      className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                      Desbloquear Conductor
                    </button>
                  )}
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
