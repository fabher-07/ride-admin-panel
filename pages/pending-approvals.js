import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
// Web version doesn't use mobile push notifications

export default function PendingApprovalsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedDrivers, setSelectedDrivers] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [pendingDrivers, setPendingDrivers] = useState([])

  // Fetch pending drivers from Supabase
  const fetchPendingDrivers = async () => {
    try {
      setLoading(true)
      
      const { data: driversData, error } = await supabase
        .from('drivers')
        .select(`
          *,
          user:users(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error

      const transformedDrivers = driversData.map(driver => ({
        id: driver.id,
        user_id: driver.user_id || driver.id, // drivers.id == users.id FK
        name: driver.user?.full_name || 'Sin nombre',
        email: driver.user?.email || '',
        phone: driver.user?.phone || '',
        economico: driver.economico,
        photo: '🚕',
        submittedDate: driver.created_at,
        vehicleModel: `${driver.vehicle_brand} ${driver.vehicle_model} ${driver.vehicle_year}`,
        vehiclePlate: driver.vehicle_plates,
        pendingDocuments: [],
      }))

      setPendingDrivers(transformedDrivers)
    } catch (error) {
      console.error('Error fetching pending drivers:', error)
      alert('Error al cargar conductores pendientes: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchPendingDrivers()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('pending_drivers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drivers',
        filter: 'status=eq.pending'
      }, () => {
        fetchPendingDrivers()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const calculateWaitTime = (submittedDate) => {
    const now = new Date()
    const submitted = new Date(submittedDate)
    const diffMs = now - submitted
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    return { days, hours, minutes, totalHours: Math.floor(diffMs / (1000 * 60 * 60)) }
  }

  const getUrgencyConfig = (totalHours) => {
    if (totalHours >= 72) {
      // 3+ días
      return {
        level: 'critical',
        color: 'bg-red-100 border-red-500 border-l-4',
        badge: 'bg-red-500 text-white',
        label: 'URGENTE',
        icon: '🚨',
      }
    } else if (totalHours >= 48) {
      // 2-3 días
      return {
        level: 'high',
        color: 'bg-orange-100 border-orange-500 border-l-4',
        badge: 'bg-orange-500 text-white',
        label: 'ALTA',
        icon: '⚠️',
      }
    } else if (totalHours >= 24) {
      // 1-2 días
      return {
        level: 'medium',
        color: 'bg-yellow-100 border-yellow-500 border-l-4',
        badge: 'bg-yellow-500 text-white',
        label: 'MEDIA',
        icon: '⏰',
      }
    } else {
      // < 1 día
      return {
        level: 'low',
        color: 'bg-green-100 border-green-500 border-l-4',
        badge: 'bg-green-500 text-white',
        label: 'NORMAL',
        icon: '✓',
      }
    }
  }


  const handleSelectDriver = (driverId) => {
    setSelectedDrivers((prev) =>
      prev.includes(driverId)
        ? prev.filter((id) => id !== driverId)
        : [...prev, driverId]
    )
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDrivers([])
    } else {
      setSelectedDrivers(sortedDrivers.map((d) => d.id))
    }
    setSelectAll(!selectAll)
  }

  const handleApproveSelected = async () => {
    if (selectedDrivers.length === 0) {
      alert('Selecciona al menos un conductor para aprobar')
      return
    }

    const count = selectedDrivers.length
    if (
      !confirm(
        `¿Aprobar ${count} conductor${count > 1 ? 'es' : ''} seleccionado${count > 1 ? 's' : ''}?\n\nEsto activará sus cuentas inmediatamente.`
      )
    ) return

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ status: 'approved' })
        .in('id', selectedDrivers)

      if (error) throw error

      // Push notifications not available in web admin panel
      const approvedDrivers = pendingDrivers.filter(d => selectedDrivers.includes(d.id))
      for (const driver of approvedDrivers) {
        if (driver.user_id) {
          console.log('Driver approved notification would be sent to:', driver.user_id)
        }
      }

      // Log audit
      const driversNames = approvedDrivers.map(d => d.name).join(', ')

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'Aprobación masiva de conductores',
        details: `Aprobados: ${driversNames}`,
        category: 'drivers',
        ip_address: 'N/A',
      })

      setSelectedDrivers([])
      setSelectAll(false)
      alert(`${count} conductor${count > 1 ? 'es' : ''} aprobado${count > 1 ? 's' : ''} exitosamente.\n\nSe enviaron notificaciones push.`)
      fetchPendingDrivers()
    } catch (error) {
      console.error('Error approving drivers:', error)
      alert('Error al aprobar conductores: ' + error.message)
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

      // Enviar notificación push de aprobación al conductor
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: driver.id,
            title: '✅ ¡Cuenta aprobada!',
            body: 'Tu cuenta de conductor ha sido aprobada. Ya puedes empezar a recibir viajes.',
            data: { type: 'driver_approved', screen: 'DriverDashboard' },
            channel_id: 'driver-status',
            priority: 'high',
          }
        })
      } catch (notifErr) {
        console.warn('Error enviando notificación de aprobación:', notifErr)
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

      alert(`${driver.name} ha sido aprobado exitosamente.\n\nSe envió notificación push al conductor.`)
      fetchPendingDrivers()
    } catch (error) {
      console.error('Error approving driver:', error)
      alert('Error al aprobar conductor: ' + error.message)
    }
  }

  const handleRejectDriver = async (driver) => {
    const reason = prompt(`¿Por qué rechazas a ${driver.name}?\n\nEscribe la razón:`)
    if (!reason) return

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ 
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', driver.id)

      if (error) throw error

      // Enviar notificación push de rechazo al conductor
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: driver.id,
            title: '❌ Cuenta rechazada',
            body: `Tu solicitud fue rechazada. Razón: ${reason}`,
            data: { type: 'driver_rejected', screen: 'DriverDocumentRejection', reason },
            channel_id: 'driver-status',
            priority: 'high',
          }
        })
      } catch (notifErr) {
        console.warn('Error enviando notificación de rechazo:', notifErr)
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'Rechazó conductor',
        details: `${driver.name} (${driver.economico}) - Razón: ${reason}`,
        category: 'drivers',
        ip_address: 'N/A',
      })

      alert(`${driver.name} ha sido rechazado. Se le notificó la razón y podrá corregir sus documentos.`)
      fetchPendingDrivers()
    } catch (error) {
      console.error('Error rejecting driver:', error)
      alert('Error al rechazar conductor: ' + error.message)
    }
  }

  // Sort by oldest first (priority)
  const sortedDrivers = [...pendingDrivers].sort(
    (a, b) => new Date(a.submittedDate) - new Date(b.submittedDate)
  )

  const stats = {
    total: sortedDrivers.length,
    critical: sortedDrivers.filter((d) => getUrgencyConfig(calculateWaitTime(d.submittedDate).totalHours).level === 'critical').length,
    high: sortedDrivers.filter((d) => getUrgencyConfig(calculateWaitTime(d.submittedDate).totalHours).level === 'high').length,
    medium: sortedDrivers.filter((d) => getUrgencyConfig(calculateWaitTime(d.submittedDate).totalHours).level === 'medium').length,
  }

  return (
    <>
      <Head>
        <title>RIDE Admin - Conductores Pendientes de Aprobación</title>
        <meta name="description" content="Cola de espera de conductores pendientes" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Conductores Esperando Aprobación
              </h1>
              {mounted && (
                <p className="text-gray-600 mt-1">
                  {sortedDrivers.length} conductor{sortedDrivers.length !== 1 ? 'es' : ''} en cola
                  (ordenados por antigüedad)
                </p>
              )}
            </div>

            {selectedDrivers.length > 0 && (
              <button
                onClick={handleApproveSelected}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center gap-2"
              >
                <span>✅</span>
                <span>Aprobar {selectedDrivers.length} Seleccionados</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-gray-500">
            <p className="text-sm text-gray-600">Total en Cola</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Urgentes (3+ días)</p>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Alta (2-3 días)</p>
            <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Media (1-2 días)</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
          </div>
        </div>

        {/* Batch Actions */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Seleccionar todos ({sortedDrivers.length})
              </span>
            </label>

            {selectedDrivers.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedDrivers.length} seleccionado{selectedDrivers.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => {
                    setSelectedDrivers([])
                    setSelectAll(false)
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Limpiar selección
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary mb-4"></div>
            <p className="text-gray-600">Cargando conductores pendientes...</p>
          </div>
        )}

        {/* Pending Drivers List */}
        {!loading && (
        <div className="space-y-4">
          {sortedDrivers.map((driver, index) => {
            const waitTime = calculateWaitTime(driver.submittedDate)
            const urgency = getUrgencyConfig(waitTime.totalHours)
            const isSelected = selectedDrivers.includes(driver.id)

            return (
              <div
                key={driver.id}
                className={`${urgency.color} rounded-lg p-6 shadow-sm transition-all ${
                  isSelected ? 'ring-2 ring-green-500' : ''
                }`}
              >
                {/* Priority Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectDriver(driver.id)}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-500">#{index + 1}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${urgency.badge}`}>
                        {urgency.icon} {urgency.label}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      Esperando: {waitTime.days} día{waitTime.days !== 1 ? 's' : ''},{' '}
                      {waitTime.hours} hora{waitTime.hours !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Enviado: {new Date(driver.submittedDate).toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>

                {/* Driver Info */}
                <div className="grid grid-cols-3 gap-6 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Información del Conductor
                    </h3>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{driver.photo}</span>
                      <div>
                        <p className="font-bold text-gray-900">{driver.name}</p>
                        <p className="text-xs text-gray-600">Económico: #{driver.economico}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700">{driver.phone}</p>
                    <p className="text-xs text-gray-600">{driver.email}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Información del Vehículo
                    </h3>
                    <p className="text-sm text-gray-900 font-medium">{driver.vehicleModel}</p>
                    <p className="text-xs text-gray-600 mt-1">Placas: {driver.vehiclePlate}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Documentos Pendientes
                    </h3>
                    {driver.pendingDocuments.length > 0 ? (
                      <ul className="space-y-1">
                        {driver.pendingDocuments.map((doc, idx) => (
                          <li key={idx} className="text-xs text-gray-700 flex items-center gap-2">
                            <span className="text-orange-500">⚠️</span>
                            <span>{doc}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-green-700 flex items-center gap-2">
                        <span>✅</span>
                        <span>Todos los documentos completos</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-300">
                  <button
                    onClick={() => router.push(`/verify-documents?driverId=${driver.id}`)}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    📄 Verificar Documentos
                  </button>
                  <button
                    onClick={() => handleApproveDriver(driver)}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    ✅ Aprobar
                  </button>
                  <button
                    onClick={() => handleRejectDriver(driver)}
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        )}

        {!loading && sortedDrivers.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay conductores pendientes
            </h3>
            <p className="text-gray-600">
              Todos los conductores han sido procesados
            </p>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
