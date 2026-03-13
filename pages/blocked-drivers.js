import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function BlockedDriversScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [blockedDrivers, setBlockedDrivers] = useState([])

  // Fetch blocked drivers from Supabase
  const fetchBlockedDrivers = async () => {
    try {
      setLoading(true)
      
      const { data: driversData, error } = await supabase
        .from('drivers')
        .select(`
          *,
          user:users(*)
        `)
        .eq('status', 'blocked')
        .order('updated_at', { ascending: false })

      if (error) throw error

      const transformedDrivers = driversData.map(driver => ({
        id: driver.id,
        name: driver.user?.full_name || 'Sin nombre',
        email: driver.user?.email || '',
        phone: driver.user?.phone || '',
        economico: driver.economico,
        photo: '🚕',
        blockDate: new Date(driver.updated_at).toISOString().split('T')[0],
        blockReason: 'admin_action',
        blockReasonText: driver.rejection_reason || 'Bloqueado por administrador',
        blockDetails: driver.rejection_reason || 'Sin detalles adicionales',
        vehicleModel: `${driver.vehicle_brand} ${driver.vehicle_model} ${driver.vehicle_year}`,
        vehiclePlate: driver.vehicle_plates,
        totalTrips: driver.total_trips || 0,
        rating: driver.rating || 5.0,
        evidence: {
          reports: [],
          photos: [],
          chats: [],
        },
        reactivationSteps: [
          'Contactar con soporte de GO!T',
          'Revisar motivo del bloqueo',
          'Completar requisitos solicitados',
          'Esperar aprobación del administrador',
        ],
        reactivationStatus: 'pending',
      }))

      setBlockedDrivers(transformedDrivers)
    } catch (error) {
      console.error('Error fetching blocked drivers:', error)
      alert('Error al cargar conductores bloqueados: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchBlockedDrivers()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('blocked_drivers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drivers',
        filter: 'status=eq.blocked'
      }, () => {
        fetchBlockedDrivers()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const getBlockReasonConfig = (reason) => {
    switch (reason) {
      case 'fake_documents':
        return {
          icon: '📄',
          color: 'bg-red-100 border-red-500',
          badge: 'bg-red-500 text-white',
          severity: 'Grave',
        }
      case 'multiple_reports':
        return {
          icon: '⚠️',
          color: 'bg-orange-100 border-orange-500',
          badge: 'bg-orange-500 text-white',
          severity: 'Moderado',
        }
      case 'safety_violation':
        return {
          icon: '🚨',
          color: 'bg-red-100 border-red-600',
          badge: 'bg-red-600 text-white',
          severity: 'Crítico',
        }
      default:
        return {
          icon: '❌',
          color: 'bg-gray-100 border-gray-500',
          badge: 'bg-gray-500 text-white',
          severity: 'Desconocido',
        }
    }
  }

  const getReactivationStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pendiente',
          color: 'bg-yellow-100 text-yellow-800',
          icon: '⏳',
        }
      case 'in_progress':
        return {
          label: 'En Proceso',
          color: 'bg-blue-100 text-blue-800',
          icon: '🔄',
        }
      case 'rejected':
        return {
          label: 'Rechazado',
          color: 'bg-red-100 text-red-800',
          icon: '❌',
        }
      default:
        return {
          label: 'Sin proceso',
          color: 'bg-gray-100 text-gray-800',
          icon: '➖',
        }
    }
  }

  const handleViewDetails = (driver) => {
    setSelectedDriver(driver)
    setShowDetailsModal(true)
  }

  const handleUnblock = async (driver) => {
    if (
      !confirm(
        `¿Desbloquear a ${driver.name}?\n\n¿Ha completado todos los pasos de reactivación?`
      )
    ) return

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

      alert(`${driver.name} ha sido desbloqueado exitosamente.`)
      fetchBlockedDrivers()
    } catch (error) {
      console.error('Error unblocking driver:', error)
      alert('Error al desbloquear conductor: ' + error.message)
    }
  }

  const handleRejectReactivation = async (driver) => {
    const reason = prompt(
      `¿Por qué rechazas la reactivación de ${driver.name}?\n\nEscribe la razón:`
    )
    if (!reason) return

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ 
          rejection_reason: `Reactivación rechazada: ${reason}`
        })
        .eq('id', driver.id)

      if (error) throw error

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'Rechazó reactivación de conductor',
        details: `${driver.name} (${driver.economico}) - Razón: ${reason}`,
        category: 'drivers',
        ip_address: 'N/A',
      })

      alert(`Reactivación rechazada. Se notificará a ${driver.name}.`)
      fetchBlockedDrivers()
    } catch (error) {
      console.error('Error rejecting reactivation:', error)
      alert('Error al rechazar reactivación: ' + error.message)
    }
  }

  const stats = {
    total: blockedDrivers.length,
    fakeDocuments: blockedDrivers.filter((d) => d.blockReason === 'fake_documents').length,
    multipleReports: blockedDrivers.filter((d) => d.blockReason === 'multiple_reports').length,
    safetyViolations: blockedDrivers.filter((d) => d.blockReason === 'safety_violation').length,
  }

  return (
    <>
      <Head>
        <title>GO!T Admin - Conductores Bloqueados</title>
        <meta name="description" content="Gestión de conductores bloqueados" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Conductores Bloqueados</h1>
          {mounted && (
            <p className="text-gray-600 mt-1">
              {blockedDrivers.length} conductor{blockedDrivers.length !== 1 ? 'es' : ''}{' '}
              bloqueado{blockedDrivers.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-gray-500">
            <p className="text-sm text-gray-600">Total Bloqueados</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Documentos Falsos</p>
            <p className="text-2xl font-bold text-red-600">{stats.fakeDocuments}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Múltiples Reportes</p>
            <p className="text-2xl font-bold text-orange-600">{stats.multipleReports}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-red-600">
            <p className="text-sm text-gray-600">Violaciones de Seguridad</p>
            <p className="text-2xl font-bold text-red-600">{stats.safetyViolations}</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary mb-4"></div>
            <p className="text-gray-600">Cargando conductores bloqueados...</p>
          </div>
        )}

        {/* Blocked Drivers List */}
        {!loading && (
        <div className="space-y-4">
          {blockedDrivers.map((driver) => {
            const reasonConfig = getBlockReasonConfig(driver.blockReason)
            const statusConfig = getReactivationStatusConfig(driver.reactivationStatus)

            return (
              <div
                key={driver.id}
                className={`${reasonConfig.color} border-l-4 rounded-lg p-6 shadow-sm`}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{driver.photo}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{driver.name}</h3>
                      <p className="text-sm text-gray-600">
                        Económico: #{driver.economico} • {driver.vehicleModel}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${reasonConfig.badge}`}>
                      {reasonConfig.icon} {reasonConfig.severity}
                    </span>
                    <p className="text-sm text-gray-600 mt-2">
                      Bloqueado: {driver.blockDate}
                    </p>
                  </div>
                </div>

                {/* Block Reason */}
                <div className="bg-white rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Motivo del Bloqueo
                  </h4>
                  <p className="text-lg font-bold text-red-700 mb-2">
                    {driver.blockReasonText}
                  </p>
                  <p className="text-sm text-gray-700">{driver.blockDetails}</p>
                </div>

                {/* Evidence Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Reportes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {driver.evidence.reports.length}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Evidencia Fotográfica</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {driver.evidence.photos.length}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Conversaciones</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {driver.evidence.chats.length}
                    </p>
                  </div>
                </div>

                {/* Reactivation Status */}
                <div className="bg-white rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Estado de Reactivación
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                      {statusConfig.icon} {statusConfig.label}
                    </span>
                  </div>

                  {driver.reactivationStatus === 'in_progress' && driver.reactivationProgress && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progreso</span>
                        <span>
                          {driver.reactivationProgress} de {driver.reactivationSteps.length} pasos
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${(driver.reactivationProgress / driver.reactivationSteps.length) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-700 mb-2">
                    Pasos para reactivación ({driver.reactivationSteps.length} pasos):
                  </p>
                  <ul className="space-y-1">
                    {driver.reactivationSteps.slice(0, 3).map((step, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">
                          {driver.reactivationProgress && idx < driver.reactivationProgress
                            ? '✅'
                            : '○'}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                    {driver.reactivationSteps.length > 3 && (
                      <li className="text-xs text-gray-500 ml-5">
                        ... y {driver.reactivationSteps.length - 3} pasos más
                      </li>
                    )}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleViewDetails(driver)}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    📋 Ver Detalles Completos
                  </button>
                  {driver.reactivationStatus !== 'rejected' && (
                    <>
                      <button
                        onClick={() => handleUnblock(driver)}
                        className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
                      >
                        ✅ Desbloquear
                      </button>
                      <button
                        onClick={() => handleRejectReactivation(driver)}
                        className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
                      >
                        ❌ Rechazar Reactivación
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )}

        {!loading && blockedDrivers.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay conductores bloqueados
            </h3>
            <p className="text-gray-600">Todos los conductores están activos</p>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedDriver && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Detalles Completos - {selectedDriver.name}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Reports */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    📝 Reportes ({selectedDriver.evidence.reports.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedDriver.evidence.reports.map((report) => (
                      <div key={report.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-gray-900">{report.reason}</p>
                          <p className="text-xs text-gray-600">{report.date}</p>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{report.description}</p>
                        <p className="text-xs text-gray-600">
                          Reportado por: {report.passenger || report.reporter}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photos */}
                {selectedDriver.evidence.photos.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      📷 Evidencia Fotográfica ({selectedDriver.evidence.photos.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedDriver.evidence.photos.map((photo) => (
                        <div key={photo.id} className="bg-gray-100 rounded-lg p-4 text-center">
                          <div className="text-4xl mb-2">📄</div>
                          <p className="text-xs text-gray-700">{photo.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chats */}
                {selectedDriver.evidence.chats.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      💬 Conversaciones ({selectedDriver.evidence.chats.length})
                    </h3>
                    {selectedDriver.evidence.chats.map((chat) => (
                      <div key={chat.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-3">
                        <p className="text-xs text-gray-600 mb-3">
                          {chat.date} - {chat.passenger}
                        </p>
                        <div className="space-y-2">
                          {chat.messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg text-sm ${
                                msg.from === 'passenger'
                                  ? 'bg-blue-100 text-blue-900 ml-8'
                                  : 'bg-gray-200 text-gray-900 mr-8'
                              }`}
                            >
                              <p className="text-xs font-semibold mb-1">
                                {msg.from === 'passenger' ? 'Pasajero' : 'Conductor'}
                              </p>
                              <p>{msg.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reactivation Steps */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    🔄 Proceso de Reactivación ({selectedDriver.reactivationSteps.length} pasos)
                  </h3>
                  <ol className="space-y-2">
                    {selectedDriver.reactivationSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-gray-700 pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
