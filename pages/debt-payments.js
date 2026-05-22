import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/DashboardLayout'

export default function DebtPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending_verification')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [stats, setStats] = useState({
    pending: 0,
    verified: 0,
    rejected: 0,
    pendingAmount: 0,
    verifiedAmount: 0,
  })

  useEffect(() => {
    fetchPayments()
    fetchStats()
  }, [filter])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('driver_debt_payments')
        .select(`
          *,
          driver:drivers!driver_debt_payments_driver_id_fkey (
            id,
            user_id,
            license_plate,
            user:users!drivers_user_id_fkey (
              id,
              full_name,
              email,
              phone
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query
      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching debt payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data } = await supabase
        .from('driver_debt_payments')
        .select('status, amount')

      if (data) {
        setStats({
          pending: data.filter(p => p.status === 'pending_verification').length,
          verified: data.filter(p => p.status === 'verified').length,
          rejected: data.filter(p => p.status === 'rejected').length,
          pendingAmount: data
            .filter(p => p.status === 'pending_verification')
            .reduce((sum, p) => sum + Number(p.amount || 0), 0),
          verifiedAmount: data
            .filter(p => p.status === 'verified')
            .reduce((sum, p) => sum + Number(p.amount || 0), 0),
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleVerify = async (payment) => {
    if (!confirm(`¿Confirmar pago de ${formatCurrency(payment.amount)} de ${payment.driver?.user?.full_name || 'conductor'}?\n\nEsto liberará la deuda del conductor automáticamente.`)) {
      return
    }

    try {
      setActionLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase.rpc('verify_debt_payment', {
        p_payment_id: payment.id,
        p_admin_id: user.id,
        p_notes: null,
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'No se pudo verificar')

      alert('✅ Pago verificado y deuda liberada')
      setShowModal(false)
      setSelectedPayment(null)
      await Promise.all([fetchPayments(), fetchStats()])
    } catch (error) {
      console.error('Verify error:', error)
      alert(`❌ Error: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (payment) => {
    if (!rejectionReason.trim()) {
      alert('Ingresa el motivo del rechazo')
      return
    }

    try {
      setActionLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error } = await supabase
        .from('driver_debt_payments')
        .update({
          status: 'rejected',
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim(),
        })
        .eq('id', payment.id)

      if (error) throw error

      alert('Pago rechazado')
      setShowModal(false)
      setSelectedPayment(null)
      setRejectionReason('')
      setShowRejectInput(false)
      await Promise.all([fetchPayments(), fetchStats()])
    } catch (error) {
      console.error('Reject error:', error)
      alert(`❌ Error: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(Number(value) || 0)
  }

  const formatDate = (date) =>
    new Date(date).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const getStatusBadge = (status) => {
    const map = {
      pending_verification: { label: '⏳ Pendiente', cls: 'bg-yellow-100 text-yellow-800' },
      verified: { label: '✅ Verificado', cls: 'bg-green-100 text-green-800' },
      rejected: { label: '❌ Rechazado', cls: 'bg-red-100 text-red-800' },
    }
    const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
        {s.label}
      </span>
    )
  }

  const openDetail = (payment) => {
    setSelectedPayment(payment)
    setShowModal(true)
    setShowRejectInput(false)
    setRejectionReason('')
  }

  return (
    <>
      <Head>
        <title>RIDE Admin - Verificación de Pagos de Deuda</title>
      </Head>

      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pagos de Deuda (SPEI)</h1>
          <p className="text-gray-600 mt-1">
            Verificación de transferencias de conductores para saldar comisiones de viajes en efectivo
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Por verificar</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <div className="text-3xl">💸</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verificados</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total cobrado</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.verifiedAmount)}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rechazados</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <div className="text-3xl">❌</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="pending_verification">Pendientes ({stats.pending})</option>
                <option value="verified">Verificados</option>
                <option value="rejected">Rechazados</option>
                <option value="all">Todos</option>
              </select>
            </div>
            <button
              onClick={() => { fetchPayments(); fetchStats() }}
              className="px-4 py-2 bg-primary text-black rounded-lg hover:bg-yellow-500 transition-colors font-medium"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conductor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Viajes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-3 text-gray-600">Cargando...</span>
                      </div>
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No hay pagos en este estado
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {p.driver?.user?.full_name || '—'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {p.driver?.license_plate || ''} · {p.driver?.user?.phone || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {p.debt_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-700">
                        {p.reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openDetail(p)}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de detalle */}
        {showModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Detalle del pago</h2>
                <button
                  onClick={() => { setShowModal(false); setSelectedPayment(null) }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Info */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Estado</p>
                    <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Conductor</p>
                    <p className="text-base font-medium text-gray-900">
                      {selectedPayment.driver?.user?.full_name || '—'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedPayment.driver?.user?.email || ''}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedPayment.driver?.user?.phone || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Placa</p>
                    <p className="text-base text-gray-900">{selectedPayment.driver?.license_plate || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Monto transferido</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Viajes en efectivo</p>
                    <p className="text-base text-gray-900">{selectedPayment.debt_count || 0} viajes</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Referencia (debe coincidir en SPEI)</p>
                    <p className="text-base font-mono font-bold text-gray-900 bg-yellow-50 p-2 rounded">
                      {selectedPayment.reference}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Fecha de envío</p>
                    <p className="text-base text-gray-900">{formatDate(selectedPayment.created_at)}</p>
                  </div>
                  {selectedPayment.verified_at && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Procesado el</p>
                      <p className="text-base text-gray-900">{formatDate(selectedPayment.verified_at)}</p>
                    </div>
                  )}
                  {selectedPayment.rejection_reason && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Motivo de rechazo</p>
                      <p className="text-base text-red-600">{selectedPayment.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Comprobante */}
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Comprobante de transferencia</p>
                  {selectedPayment.receipt_url ? (
                    <a href={selectedPayment.receipt_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selectedPayment.receipt_url}
                        alt="Comprobante"
                        className="w-full rounded-lg border border-gray-200 hover:border-primary transition"
                      />
                      <p className="text-xs text-center text-gray-500 mt-2">Click para ver completo</p>
                    </a>
                  ) : (
                    <p className="text-gray-500">Sin comprobante</p>
                  )}
                </div>
              </div>

              {/* Acciones */}
              {selectedPayment.status === 'pending_verification' && (
                <div className="sticky bottom-0 bg-gray-50 border-t p-6 space-y-3">
                  {showRejectInput ? (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Motivo del rechazo (visible para el conductor)
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Ej: La referencia no coincide, monto incorrecto, etc."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setShowRejectInput(false); setRejectionReason('') }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                          disabled={actionLoading}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleReject(selectedPayment)}
                          disabled={actionLoading || !rejectionReason.trim()}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                        >
                          {actionLoading ? 'Procesando...' : 'Confirmar rechazo'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowRejectInput(true)}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium border border-red-300"
                      >
                        ❌ Rechazar
                      </button>
                      <button
                        onClick={() => handleVerify(selectedPayment)}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                      >
                        {actionLoading ? 'Procesando...' : '✅ Verificar y liberar deuda'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
