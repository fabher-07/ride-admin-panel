import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
// Web version doesn't use mobile push notifications

export default function VerifyDocumentsScreen() {
  const router = useRouter()
  const { driverId } = router.query
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [comparisonMode, setComparisonMode] = useState(false)

  const [driver, setDriver] = useState(null)
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (driverId && mounted) {
      fetchDriverData()
    }
  }, [driverId, mounted])

  const fetchDriverData = async () => {
    try {
      setLoading(true)

      const { data: driverData, error } = await supabase
        .from('drivers')
        .select(`
          *,
          user:users(*)
        `)
        .eq('id', driverId)
        .single()

      if (error) throw error

      if (!driverData) {
        alert('Conductor no encontrado')
        router.push('/pending-approvals')
        return
      }

      setDriver(driverData)

      // Extract documents from the JSONB column
      const docs = buildDocumentList(driverData)
      setDocuments(docs)
    } catch (error) {
      console.error('Error fetching driver:', error)
      alert('Error al cargar datos del conductor: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const isWebUrl = (uri) => uri && typeof uri === 'string' && uri.startsWith('http')

  const collectPhotos = (obj, keys) => {
    const urls = []
    for (const key of keys) {
      const val = obj?.[key]
      if (val && typeof val === 'string' && val.length > 5) {
        urls.push({ key, url: val, isWeb: isWebUrl(val) })
      }
    }
    return urls
  }

  const buildDocumentList = (driverData) => {
    const docsJson = driverData.documents || {}
    const hasDocuments = Object.keys(docsJson).length > 0
    const step1 = docsJson.step1 || {}
    const step2 = docsJson.step2 || {}
    const step3 = docsJson.step3 || {}

    // Fallback: if no documents JSONB, try to extract name/email/phone from users relation
    const user = driverData.user || {}
    const driverName = user.full_name || (step1.nombres
      ? `${step1.nombres || ''} ${step1.apellidoPaterno || ''} ${step1.apellidoMaterno || ''}`.trim()
      : 'Conductor')
    const driverEmail = user.email || step1.email || '-'
    const driverPhone = user.phone || step1.phoneNumber || '-'

    const docList = []

    // Personal info from step1 — photos at TOP LEVEL (ineFront, ineBack, facePhoto) or nested in .photos
    const step1TopPhotos = collectPhotos(step1, ['ineFront', 'ineBack', 'facePhoto'])
    const step1NestedPhotos = collectPhotos(step1.photos, ['ineFront', 'ineBack', 'selfie', 'facePhoto'])
    const step1Photos = [...step1TopPhotos, ...step1NestedPhotos]
    // Also show personal info if users table has data but no photos were uploaded
    if (step1.nombres || step1.apellidoPaterno || step1Photos.length > 0 || !hasDocuments) {
      docList.push({
        id: 'personal_info',
        type: 'personal',
        name: 'Datos Personales (INE / Selfie)',
        status: 'pending',
        uploadDate: driverData.created_at ? new Date(driverData.created_at).toLocaleDateString('es-MX') : '-',
        data: {
          'Nombre': driverName,
          'Email': driverEmail,
          'Teléfono': driverPhone,
          'CURP': step1.curp || driverData.license_number || 'No proporcionado',
        },
        imageUrls: step1Photos,
      })
    }

    // Vehicle info from step2 — photos at top level (exteriorFront, exteriorSide, interiorFront, interiorBack)
    const vehiclePhotoKeys = ['exteriorFront', 'exteriorSide', 'interiorFront', 'interiorBack', 'front', 'back', 'left', 'right']
    const step2TopPhotos = collectPhotos(step2, vehiclePhotoKeys)
    const step2NestedPhotos = collectPhotos(step2.photos, step2.photos ? Object.keys(step2.photos) : [])
    const allVehiclePhotos = [...step2TopPhotos, ...step2NestedPhotos]
    if (step2.marca || step2.modelo || step2.placas || allVehiclePhotos.length > 0 || !hasDocuments) {
      docList.push({
        id: 'vehicle_info',
        type: 'vehicle',
        name: 'Fotos del Vehículo',
        status: 'pending',
        uploadDate: driverData.created_at ? new Date(driverData.created_at).toLocaleDateString('es-MX') : '-',
        data: {
          'Marca': step2.marca || driverData.vehicle_brand || '-',
          'Modelo': step2.modelo || driverData.vehicle_model || '-',
          'Año': step2.año || driverData.vehicle_year || '-',
          'Color': step2.color || driverData.vehicle_color || '-',
          'Placas': step2.placas || driverData.vehicle_plates || '-',
          'No. Económico': step2.numeroEconomico || driverData.economico || '-',
        },
        imageUrls: allVehiclePhotos,
      })
    }

    // License from step3
    const licUri = step3.licenciaConducir || step3.documents?.licenciaConducir
    if (licUri) {
      docList.push({
        id: 'license',
        type: 'license',
        name: 'Licencia de Conducir',
        status: 'pending',
        uploadDate: driverData.created_at ? new Date(driverData.created_at).toLocaleDateString('es-MX') : '-',
        data: {
          'No. Licencia': driverData.license_number || '-',
          'Vencimiento': driverData.license_expiry || '-',
        },
        imageUrls: [{ key: 'licenciaConducir', url: licUri, isWeb: isWebUrl(licUri) }],
      })
    }

    // Tarjeta de circulación from step3
    const tcUri = step3.tarjetaCirculacion || step3.documents?.tarjetaCirculacion
    if (tcUri) {
      docList.push({
        id: 'registration',
        type: 'registration',
        name: 'Tarjeta de Circulación',
        status: 'pending',
        uploadDate: driverData.created_at ? new Date(driverData.created_at).toLocaleDateString('es-MX') : '-',
        data: {
          'Placas': driverData.vehicle_plates || '-',
          'Vehículo': `${driverData.vehicle_brand || ''} ${driverData.vehicle_model || ''} ${driverData.vehicle_year || ''}`.trim() || '-',
        },
        imageUrls: [{ key: 'tarjetaCirculacion', url: tcUri, isWeb: isWebUrl(tcUri) }],
      })
    }

    // Permiso de taxi from step3
    const ptUri = step3.permisoTaxi || step3.documents?.permisoTaxi
    if (ptUri) {
      docList.push({
        id: 'taxi_permit',
        type: 'taxi_permit',
        name: 'Permiso de Taxi / Concesión',
        status: 'pending',
        uploadDate: driverData.created_at ? new Date(driverData.created_at).toLocaleDateString('es-MX') : '-',
        data: {
          'No. Económico': driverData.economico || '-',
        },
        imageUrls: [{ key: 'permisoTaxi', url: ptUri, isWeb: isWebUrl(ptUri) }],
      })
    }

    return docList
  }

  const handleApproveAll = async () => {
    if (!confirm('¿Aprobar TODOS los documentos y activar al conductor?')) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('drivers')
        .update({
          status: 'approved',
          is_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', driverId)

      if (error) throw error

      // Enviar notificación push de aprobación al conductor
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: driverId,
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
        user_id: user?.id,
        user_email: user?.email,
        action: 'Aprobar conductor',
        details: `Conductor ${driver?.user?.full_name || driverId} aprobado - todos los documentos verificados`,
        category: 'drivers',
        ip_address: 'N/A',
      }).then()

      alert('Conductor aprobado y activado exitosamente.\n\nSe envió notificación push al conductor.')
      router.push('/pending-approvals')
    } catch (error) {
      console.error('Error approving driver:', error)
      alert('Error al aprobar conductor: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRejectDriver = async () => {
    const reason = prompt('¿Por qué rechazas a este conductor?\n\nEscribe la razón:')
    if (!reason) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('drivers')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', driverId)

      if (error) throw error

      // Enviar notificación push de rechazo al conductor
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: driverId,
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
        user_id: user?.id,
        user_email: user?.email,
        action: 'Rechazar conductor',
        details: `Conductor ${driver?.user?.full_name || driverId} rechazado. Razón: ${reason}`,
        category: 'drivers',
        ip_address: 'N/A',
      }).then()

      alert('Conductor rechazado. Se le notificó la razón y podrá corregir sus documentos.')
      router.push('/pending-approvals')
    } catch (error) {
      console.error('Error rejecting driver:', error)
      alert('Error al rechazar conductor: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return { label: 'Aprobado', color: 'bg-green-100 text-green-800 border-green-200', icon: '✅' }
      case 'pending':
        return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⏳' }
      case 'rejected':
        return { label: 'Rechazado', color: 'bg-red-100 text-red-800 border-red-200', icon: '❌' }
      default:
        return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⏳' }
    }
  }

  // Fallback name from documents.step1 if users.full_name is empty
  const driverName = driver?.user?.full_name
    || (driver?.documents?.step1
      ? `${driver.documents.step1.nombres || ''} ${driver.documents.step1.apellidoPaterno || ''} ${driver.documents.step1.apellidoMaterno || ''}`.trim()
      : '')
    || 'Conductor'
  const driverEmail = driver?.user?.email || driver?.documents?.step1?.email || '-'
  const driverPhone = driver?.user?.phone || driver?.documents?.step1?.phoneNumber || '-'
  const driverStatus = driver?.status || 'pending'
  const statusBadge = getStatusBadge(driverStatus)

  if (!mounted) return null

  return (
    <>
      <Head>
        <title>RIDE Admin - Verificar Documentos</title>
        <meta name="description" content="Verificación de documentos de conductor" />
      </Head>

      <DashboardLayout>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">🔄</div>
              <p className="text-gray-600">Cargando datos del conductor...</p>
            </div>
          </div>
        ) : !driver ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-xl text-gray-600 mb-4">Conductor no encontrado</p>
              <button
                onClick={() => router.push('/pending-approvals')}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg"
              >
                Volver
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <button
                    onClick={() => router.back()}
                    className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2"
                  >
                    ← Volver
                  </button>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Verificación de Documentos
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Conductor: <span className="font-semibold">{driverName}</span>
                    {driver.economico && ` (#${driver.economico})`}
                  </p>
                </div>

                <div className="text-right">
                  <span className={`px-4 py-2 rounded-lg font-semibold text-sm border ${statusBadge.color}`}>
                    {statusBadge.icon} {statusBadge.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Driver Summary Card */}
            <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Resumen del Conductor</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nombre</p>
                  <p className="font-semibold text-gray-900">{driverName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold text-gray-900">{driverEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="font-semibold text-gray-900">{driverPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">No. Económico</p>
                  <p className="font-semibold text-gray-900">{driver.economico || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vehículo</p>
                  <p className="font-semibold text-gray-900">
                    {`${driver.vehicle_brand || ''} ${driver.vehicle_model || ''} ${driver.vehicle_year || ''}`.trim() || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Color</p>
                  <p className="font-semibold text-gray-900">{driver.vehicle_color || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Placas</p>
                  <p className="font-semibold text-gray-900">{driver.vehicle_plates || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Licencia</p>
                  <p className="font-semibold text-gray-900">{driver.license_number || '-'}</p>
                </div>
              </div>
            </div>

            {/* Documents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Document Header */}
                  <div className="bg-gray-50 p-4 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-gray-900">{doc.name}</h3>
                      <span className="text-xs text-gray-500">
                        Subido: {doc.uploadDate}
                      </span>
                    </div>
                  </div>

                  {/* Document Content */}
                  <div className="p-4">
                    {/* Photo display */}
                    {doc.imageUrls && doc.imageUrls.length > 0 ? (
                      <div className="space-y-3 mb-4">
                        {doc.imageUrls.map((img) => (
                          <div key={img.key} className="rounded-lg overflow-hidden border border-gray-200">
                            <div className="bg-gray-50 px-3 py-1 text-xs text-gray-500 font-medium border-b">
                              {img.key}
                            </div>
                            {img.isWeb ? (
                              <div>
                                <a href={img.url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={img.url}
                                    alt={img.key}
                                    className="w-full h-48 object-contain bg-gray-100 cursor-pointer hover:opacity-90"
                                    style={{ display: 'block' }}
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                      const errDiv = e.target.parentElement.nextSibling
                                      if (errDiv) errDiv.style.display = 'flex'
                                    }}
                                    onLoad={(e) => {
                                      e.target.style.display = 'block'
                                      const errDiv = e.target.parentElement.nextSibling
                                      if (errDiv) errDiv.style.display = 'none'
                                    }}
                                  />
                                </a>
                                <div className="items-center justify-center flex-col h-48 bg-gray-50 text-gray-400 text-sm" style={{ display: 'none' }}>
                                  <p className="mb-2">⚠️ Error al cargar imagen</p>
                                  <a href={img.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline break-all px-4 text-center">
                                    Abrir URL directamente
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-32 bg-orange-50 border border-orange-200 rounded-b-lg">
                                <div className="text-center px-4">
                                  <div className="text-2xl mb-1">⚠️</div>
                                  <p className="text-xs font-semibold text-orange-700">Foto no subida al servidor</p>
                                  <p className="text-xs text-orange-600 mt-1">
                                    Guardada localmente en el dispositivo. Pide al conductor que reenvíe sus documentos.
                                  </p>
                                  <p className="text-xs text-orange-400 mt-1 break-all">{img.url.substring(0, 50)}...</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-lg p-4 mb-4 text-center">
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-sm text-gray-500">Sin foto adjunta</p>
                      </div>
                    )}

                    {/* Extracted Data */}
                    {doc.data && Object.keys(doc.data).length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Datos del Registro
                        </h4>
                        <div className="space-y-2 text-sm">
                          {Object.entries(doc.data).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600">{key}:</span>
                              <span className="font-medium text-gray-900">{value || '-'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Raw JSONB viewer */}
            {driver.documents && (
              <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
                <button
                  onClick={() => setComparisonMode(!comparisonMode)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {comparisonMode ? '▼' : '▶'} Ver datos crudos del registro (JSON)
                </button>
                {comparisonMode && (
                  <pre className="mt-4 bg-gray-50 rounded-lg p-4 text-xs overflow-auto max-h-96 text-gray-700">
                    {JSON.stringify(driver.documents, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {driverStatus === 'pending' && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRejectDriver}
                  disabled={saving}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold disabled:bg-gray-400"
                >
                  ❌ Rechazar Conductor
                </button>
                <button
                  onClick={handleApproveAll}
                  disabled={saving}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:bg-gray-400"
                >
                  {saving ? '⏳ Guardando...' : '✅ Aprobar y Activar Conductor'}
                </button>
              </div>
            )}

            {driverStatus === 'approved' && (
              <div className="text-center py-4">
                <span className="px-6 py-3 bg-green-100 text-green-800 rounded-lg font-semibold text-lg">
                  ✅ Este conductor ya fue aprobado
                </span>
              </div>
            )}

            {driverStatus === 'rejected' && (
              <div className="text-center py-4 space-y-3">
                <span className="px-6 py-3 bg-red-100 text-red-800 rounded-lg font-semibold text-lg">
                  ❌ Este conductor fue rechazado
                </span>
                {driver.rejection_reason && (
                  <p className="text-sm text-gray-600">Razón: {driver.rejection_reason}</p>
                )}
              </div>
            )}
          </>
        )}
      </DashboardLayout>
    </>
  )
}
