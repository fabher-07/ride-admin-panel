import { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { supabase } from '../lib/supabase'

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchDisputes()
  }, [statusFilter])

  const fetchDisputes = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('payment_disputes')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setDisputes(data || [])
    } catch (error) {
      console.error('Error fetching disputes:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateDispute = async (disputeId, updates) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('payment_disputes')
        .update(updates)
        .eq('id', disputeId)

      if (error) throw error
      fetchDisputes()
      setSelectedDispute(null)
      setAdminNotes('')
    } catch (error) {
      console.error('Error updating dispute:', error)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      open: { bg: 'bg-red-100 text-red-800', label: 'Abierta' },
      under_review: { bg: 'bg-yellow-100 text-yellow-800', label: 'En revisi\u00f3n' },
      won: { bg: 'bg-green-100 text-green-800', label: 'Ganada' },
      lost: { bg: 'bg-gray-100 text-gray-800', label: 'Perdida' },
      needs_response: { bg: 'bg-orange-100 text-orange-800', label: 'Requiere respuesta' },
    }
    const s = map[status] || { bg: 'bg-gray-100 text-gray-600', label: status }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.bg}`}>{s.label}</span>
  }

  const getReasonLabel = (reason) => {
    const map = {
      fraudulent: 'Fraudulento',
      duplicate: 'Duplicado',
      product_not_received: 'Servicio no recibido',
      product_unacceptable: 'Servicio inaceptable',
      subscription_canceled: 'Cancelaci\u00f3n',
      unrecognized: 'No reconocido',
      general: 'General',
    }
    return map[reason] || reason || 'Sin raz\u00f3n'
  }

  const openDisputes = disputes.filter(d => d.status === 'open' || d.status === 'needs_response')
  const totalAmount = disputes.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputas y Contracargos</h1>
          <p className="text-gray-500 mt-1">Gestiona disputas de Stripe y contracargos de pasajeros</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total disputas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{disputes.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-red-100">
            <p className="text-sm text-gray-500">Abiertas / Pendientes</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{openDisputes.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Monto total en disputa</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Tasa de disputas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {disputes.length > 0 ? ((openDisputes.length / disputes.length) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        {/* Urgent alert */}
        {openDisputes.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-800">Disputas requieren atenci&oacute;n</p>
              <p className="text-sm text-red-600 mt-1">
                Tienes {openDisputes.length} disputa(s) abierta(s). Responde antes de la fecha l&iacute;mite para evitar perder el contracargo.
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'open', label: 'Abiertas' },
            { key: 'needs_response', label: 'Requiere respuesta' },
            { key: 'under_review', label: 'En revisi\u00f3n' },
            { key: 'won', label: 'Ganadas' },
            { key: 'lost', label: 'Perdidas' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Cargando disputas...</div>
          ) : disputes.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-gray-500 font-medium">No hay disputas</p>
              <p className="text-gray-400 text-sm mt-1">Las disputas de Stripe aparecer&aacute;n aqu&iacute; autom&aacute;ticamente</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">ID Disputa</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Raz&oacute;n</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha l&iacute;mite</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Creada</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {disputes.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-gray-700">
                      {d.stripe_dispute_id ? d.stripe_dispute_id.slice(0, 16) + '...' : d.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{getReasonLabel(d.reason)}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      ${parseFloat(d.amount || 0).toFixed(2)} {d.currency?.toUpperCase() || 'MXN'}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(d.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {d.evidence_due_by ? (
                        <span className={new Date(d.evidence_due_by) < new Date() ? 'text-red-600 font-medium' : ''}>
                          {new Date(d.evidence_due_by).toLocaleDateString('es-MX')}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString('es-MX') : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => { setSelectedDispute(d); setAdminNotes(d.admin_notes || '') }}
                        className="text-sm px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail modal */}
        {selectedDispute && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Detalle de Disputa</h3>
                  <button onClick={() => setSelectedDispute(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Stripe ID</p>
                    <p className="text-sm font-mono mt-1">{selectedDispute.stripe_dispute_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Monto</p>
                    <p className="text-lg font-bold mt-1">${parseFloat(selectedDispute.amount || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Raz&oacute;n</p>
                    <p className="text-sm mt-1">{getReasonLabel(selectedDispute.reason)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Estado</p>
                    <div className="mt-1">{getStatusBadge(selectedDispute.status)}</div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase block mb-2">Notas del administrador</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Agrega notas sobre esta disputa..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => updateDispute(selectedDispute.id, { admin_notes: adminNotes })}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar notas'}
                  </button>
                  {selectedDispute.status === 'open' && (
                    <button
                      onClick={() => updateDispute(selectedDispute.id, { status: 'under_review', admin_notes: adminNotes })}
                      disabled={saving}
                      className="px-4 py-2.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50"
                    >
                      Marcar en revisi&oacute;n
                    </button>
                  )}
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    Para responder a la disputa en Stripe, ve a{' '}
                    <a href="https://dashboard.stripe.com/test/disputes" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                      Stripe Dashboard → Disputes
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
