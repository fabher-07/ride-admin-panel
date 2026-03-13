import { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { supabase } from '../lib/supabase'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, ingreso, egreso
  const [statusFilter, setStatusFilter] = useState('all') // all, stamped, pending, error, cancelled
  const [stats, setStats] = useState({ total: 0, stamped: 0, pending: 0, errors: 0 })
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => {
    fetchInvoices()
  }, [filter, statusFilter, page])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('cfdi_invoices')
        .select('*', { count: 'exact' })
        .order('fecha_emision', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filter !== 'all') {
        query = query.eq('cfdi_type', filter)
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error, count } = await query

      if (error) throw error
      setInvoices(data || [])

      // Fetch stats
      const { data: allInvoices } = await supabase
        .from('cfdi_invoices')
        .select('status')

      if (allInvoices) {
        setStats({
          total: allInvoices.length,
          stamped: allInvoices.filter(i => i.status === 'stamped').length,
          pending: allInvoices.filter(i => i.status === 'pending').length,
          errors: allInvoices.filter(i => i.status === 'error').length,
        })
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      stamped: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }
    const labels = {
      stamped: 'Timbrada',
      pending: 'Pendiente',
      error: 'Error',
      cancelled: 'Cancelada',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getTypeBadge = (type) => {
    if (type === 'ingreso') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Ingreso</span>
    if (type === 'egreso') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Egreso</span>
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{type}</span>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturas CFDI 4.0</h1>
            <p className="text-gray-500 mt-1">Historial de facturas electr&oacute;nicas emitidas</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total emitidas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Timbradas</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.stamped}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Con error</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.errors}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['all', 'ingreso', 'egreso'].map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(0) }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'ingreso' ? 'Ingreso (Pasajero)' : 'Egreso (Conductor)'}
              </button>
            ))}
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['all', 'stamped', 'pending', 'error', 'cancelled'].map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(0) }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s === 'all' ? 'Todos' : s === 'stamped' ? 'Timbradas' : s === 'pending' ? 'Pendientes' : s === 'error' ? 'Error' : 'Canceladas'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Cargando facturas...</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🧾</p>
              <p className="text-gray-500">No hay facturas que mostrar</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">UUID Fiscal</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Receptor</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">IVA</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-gray-700">
                      {inv.uuid_fiscal ? inv.uuid_fiscal.slice(0, 8) + '...' : '-'}
                    </td>
                    <td className="px-6 py-4">{getTypeBadge(inv.cfdi_type)}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{inv.receptor_nombre || '-'}</p>
                      <p className="text-xs text-gray-400">{inv.receptor_rfc || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-700">${parseFloat(inv.subtotal || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-700">${parseFloat(inv.iva_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">${parseFloat(inv.total || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {inv.fecha_emision ? new Date(inv.fecha_emision).toLocaleDateString('es-MX') : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {inv.xml_url && (
                          <a href={inv.xml_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">XML</a>
                        )}
                        {inv.pdf_url && (
                          <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">PDF</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {invoices.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-500">P&aacute;gina {page + 1}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={invoices.length < PAGE_SIZE}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
