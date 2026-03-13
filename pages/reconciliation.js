import { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { supabase } from '../lib/supabase'

export default function ReconciliationPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('week') // week, month, custom
  const [transactions, setTransactions] = useState([])
  const [settlements, setSettlements] = useState([])
  const [summary, setSummary] = useState({
    totalCharges: 0,
    totalTransferred: 0,
    totalPending: 0,
    totalCommission: 0,
    totalRetentions: 0,
    totalStripeFees: 0,
    cardTrips: 0,
    cashTrips: 0,
  })

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const getDateRange = () => {
    const end = new Date()
    const start = new Date()
    if (dateRange === 'week') start.setDate(end.getDate() - 7)
    else if (dateRange === 'month') start.setMonth(end.getMonth() - 1)
    else start.setMonth(end.getMonth() - 3)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()

      // Fetch commission transactions
      const { data: txData, error: txError } = await supabase
        .from('commission_transactions')
        .select('*')
        .gte('transaction_date', start)
        .lte('transaction_date', end)
        .order('transaction_date', { ascending: false })

      if (txError) throw txError

      // Fetch settlements
      const { data: settData, error: settError } = await supabase
        .from('settlement_history')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('settlement_date', { ascending: false })

      if (settError) console.error('Settlement error:', settError)

      // Fetch payment transactions for card/cash breakdown
      const { data: payData } = await supabase
        .from('payment_transactions')
        .select('payment_method, amount, status')
        .gte('created_at', start)
        .lte('created_at', end)

      setTransactions(txData || [])
      setSettlements(settData || [])

      // Calculate summary
      const tx = txData || []
      const pay = payData || []
      const cardPay = pay.filter(p => p.payment_method === 'card' && p.status === 'completed')
      const cashPay = pay.filter(p => p.payment_method === 'cash' && p.status === 'completed')

      const totalCharges = cardPay.reduce((s, p) => s + parseFloat(p.amount || 0), 0)
      const totalCommission = tx.reduce((s, t) => s + parseFloat(t.goit_commission_15_percent || 0), 0)
      const totalIsr = tx.reduce((s, t) => s + parseFloat(t.isr_retention_1_25_percent || 0), 0)
      const totalIva = tx.reduce((s, t) => s + parseFloat(t.iva_retention_8_percent || 0), 0)
      const totalDriverNet = tx.reduce((s, t) => s + parseFloat(t.driver_net || 0), 0)
      const totalSettled = (settData || [])
        .filter(s => s.status === 'completed')
        .reduce((s, t) => s + parseFloat(t.net_amount || 0), 0)

      // Stripe fees estimate: 2.9% + $3 MXN per card transaction
      const stripeFees = cardPay.reduce((s, p) => s + (parseFloat(p.amount || 0) * 0.029 + 3), 0)

      setSummary({
        totalCharges,
        totalTransferred: totalSettled,
        totalPending: totalDriverNet - totalSettled,
        totalCommission,
        totalRetentions: totalIsr + totalIva,
        totalStripeFees: stripeFees,
        cardTrips: cardPay.length,
        cashTrips: cashPay.length,
      })
    } catch (error) {
      console.error('Error fetching reconciliation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMXN = (amount) => `$${parseFloat(amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conciliaci&oacute;n Bancaria</h1>
            <p className="text-gray-500 mt-1">Cargos vs transferencias, comisiones y retenciones</p>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'week', label: '7 d\u00edas' },
              { key: 'month', label: '30 d\u00edas' },
              { key: 'quarter', label: '3 meses' },
            ].map(r => (
              <button
                key={r.key}
                onClick={() => setDateRange(r.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === r.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Cargando datos de conciliaci&oacute;n...</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Cargos con tarjeta</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatMXN(summary.totalCharges)}</p>
                <p className="text-xs text-gray-400 mt-1">{summary.cardTrips} transacciones</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-green-100">
                <p className="text-sm text-gray-500">Transferido a conductores</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatMXN(summary.totalTransferred)}</p>
                <p className="text-xs text-gray-400 mt-1">Liquidaciones completadas</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-yellow-100">
                <p className="text-sm text-gray-500">Pendiente de transferir</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{formatMXN(Math.max(0, summary.totalPending))}</p>
                <p className="text-xs text-gray-400 mt-1">Pr&oacute;xima liquidaci&oacute;n</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
                <p className="text-sm text-gray-500">Comisi&oacute;n GO!T (15%)</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatMXN(summary.totalCommission)}</p>
                <p className="text-xs text-gray-400 mt-1">{summary.cardTrips + summary.cashTrips} viajes</p>
              </div>
            </div>

            {/* Fiscal breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Retenciones ISR + IVA</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatMXN(summary.totalRetentions)}</p>
                <p className="text-xs text-gray-400 mt-1">1.25% ISR + 8% IVA sobre total</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Comisiones Stripe (estimado)</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatMXN(summary.totalStripeFees)}</p>
                <p className="text-xs text-gray-400 mt-1">2.9% + $3 MXN por transacci&oacute;n</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Ingreso neto plataforma</p>
                <p className="text-xl font-bold text-green-600 mt-1">
                  {formatMXN(summary.totalCommission - summary.totalStripeFees)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Comisi&oacute;n - Stripe fees</p>
              </div>
            </div>

            {/* Flow diagram */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Flujo de fondos</h3>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl flex-1 min-w-[140px]">
                  <p className="text-xs text-blue-600 font-medium">Pasajero paga</p>
                  <p className="text-lg font-bold text-blue-800 mt-1">{formatMXN(summary.totalCharges)}</p>
                </div>
                <span className="text-2xl text-gray-300">→</span>
                <div className="text-center p-4 bg-yellow-50 rounded-xl flex-1 min-w-[140px]">
                  <p className="text-xs text-yellow-600 font-medium">GO!T retiene</p>
                  <p className="text-lg font-bold text-yellow-800 mt-1">{formatMXN(summary.totalCommission + summary.totalRetentions)}</p>
                  <p className="text-[10px] text-yellow-600 mt-1">Comisi&oacute;n + ISR + IVA</p>
                </div>
                <span className="text-2xl text-gray-300">→</span>
                <div className="text-center p-4 bg-green-50 rounded-xl flex-1 min-w-[140px]">
                  <p className="text-xs text-green-600 font-medium">Conductor recibe</p>
                  <p className="text-lg font-bold text-green-800 mt-1">{formatMXN(summary.totalTransferred)}</p>
                </div>
                <span className="text-2xl text-gray-300">→</span>
                <div className="text-center p-4 bg-red-50 rounded-xl flex-1 min-w-[140px]">
                  <p className="text-xs text-red-600 font-medium">Stripe cobra</p>
                  <p className="text-lg font-bold text-red-800 mt-1">{formatMXN(summary.totalStripeFees)}</p>
                </div>
              </div>
            </div>

            {/* Recent settlements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Liquidaciones recientes</h3>
              </div>
              {settlements.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No hay liquidaciones en este periodo</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Conductor</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Monto bruto</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Deuda descontada</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Neto</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Viajes</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {settlements.slice(0, 20).map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {s.settlement_date ? new Date(s.settlement_date).toLocaleDateString('es-MX') : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-mono">
                          {s.driver_id ? s.driver_id.slice(0, 8) + '...' : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-700">{formatMXN(s.amount)}</td>
                        <td className="px-6 py-4 text-sm text-right text-red-600">
                          {parseFloat(s.debt_deducted || 0) > 0 ? `-${formatMXN(s.debt_deducted)}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatMXN(s.net_amount)}</td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700">{s.trips_count || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            s.status === 'completed' ? 'bg-green-100 text-green-800' :
                            s.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            s.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {s.status === 'completed' ? 'Completada' :
                             s.status === 'processing' ? 'Procesando' :
                             s.status === 'failed' ? 'Fallida' : s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Recent commission transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Transacciones de comisi&oacute;n recientes</h3>
              </div>
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No hay transacciones en este periodo</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">M&eacute;todo</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tarifa</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Comisi&oacute;n 15%</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">ISR 1.25%</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">IVA 8%</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Neto conductor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.slice(0, 30).map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-700">
                          {t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('es-MX') : '-'}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            t.payment_method === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {t.payment_method === 'card' ? 'Tarjeta' : 'Efectivo'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-gray-900">{formatMXN(t.fare_total)}</td>
                        <td className="px-6 py-3 text-sm text-right text-blue-600">{formatMXN(t.goit_commission_15_percent)}</td>
                        <td className="px-6 py-3 text-sm text-right text-gray-500">{formatMXN(t.isr_retention_1_25_percent)}</td>
                        <td className="px-6 py-3 text-sm text-right text-gray-500">{formatMXN(t.iva_retention_8_percent)}</td>
                        <td className="px-6 py-3 text-sm text-right font-semibold text-green-700">{formatMXN(t.driver_net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
