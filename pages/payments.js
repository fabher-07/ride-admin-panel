import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/DashboardLayout'

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, cash, card
  const [dateRange, setDateRange] = useState('week') // today, week, month, all
  const [stats, setStats] = useState({
    total: 0,
    cashCount: 0,
    cardCount: 0,
    totalFare: 0,
    totalCommission: 0,
  })

  useEffect(() => {
    fetchPayments()
  }, [filter, dateRange])

  const fetchPayments = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('commission_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })

      // Apply date filter
      if (dateRange !== 'all') {
        const now = new Date()
        let startDate = new Date()
        
        if (dateRange === 'today') {
          startDate.setHours(0, 0, 0, 0)
        } else if (dateRange === 'week') {
          startDate.setDate(now.getDate() - 7)
        } else if (dateRange === 'month') {
          startDate.setMonth(now.getMonth() - 1)
        }
        
        query = query.gte('transaction_date', startDate.toISOString())
      }

      // Apply payment method filter
      if (filter !== 'all') {
        query = query.eq('payment_method', filter)
      }

      const { data, error } = await query

      if (error) throw error

      setPayments(data || [])

      // Calculate stats
      const allPayments = data || []
      setStats({
        total: allPayments.length,
        cashCount: allPayments.filter(p => p.payment_method === 'cash').length,
        cardCount: allPayments.filter(p => p.payment_method === 'card').length,
        totalFare: allPayments.reduce((sum, p) => sum + (p.fare_total || 0), 0),
        totalCommission: allPayments.reduce((sum, p) => sum + (p.goit_commission_15_percent || 0), 0),
      })

    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPaymentMethodBadge = (method) => {
    if (method === 'cash') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          💵 Efectivo
        </span>
      )
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
        💳 Tarjeta
      </span>
    )
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(value || 0)
  }

  return (
    <>
      <Head>
        <title>GO!T Admin - Comisiones y Pagos</title>
        <meta name="description" content="Gestión de comisiones y pagos por viaje" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Comisiones y Pagos</h1>
          <p className="text-gray-600 mt-1">
            Comisiones del 15% por viaje, retenciones ISR y IVA
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transacciones</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="text-3xl">�</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Efectivo</p>
                <p className="text-2xl font-bold text-green-600">{stats.cashCount}</p>
              </div>
              <div className="text-3xl">💵</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tarjeta</p>
                <p className="text-2xl font-bold text-blue-600">{stats.cardCount}</p>
              </div>
              <div className="text-3xl">💳</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tarifa Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalFare)}
                </p>
              </div>
              <div className="text-3xl">🚕</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Comisión GO!T</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.totalCommission)}
                </p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            {/* Payment Method Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="today">Hoy</option>
                <option value="week">Última Semana</option>
                <option value="month">Último Mes</option>
                <option value="all">Todo</option>
              </select>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={fetchPayments}
                className="px-4 py-2 bg-primary text-black rounded-lg hover:bg-yellow-500 transition-colors font-medium"
              >
                🔄 Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarifa Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comisión 15%
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ISR 1.25%
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IVA Ret. 8%
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Neto Conductor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-3 text-gray-600">Cargando transacciones...</span>
                      </div>
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No se encontraron transacciones
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payment.transaction_date).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentMethodBadge(payment.payment_method)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(payment.fare_total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                        {formatCurrency(payment.goit_commission_15_percent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatCurrency(payment.isr_retention_1_25_percent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatCurrency(payment.iva_retention_8_percent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                        {formatCurrency(payment.driver_net)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {!loading && payments.length > 0 && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-semibold">{payments.length}</span> transacciones
              {filter !== 'all' && ` de tipo "${filter === 'cash' ? 'efectivo' : 'tarjeta'}"`}
              {dateRange !== 'all' && ` del período "${dateRange}"`}
            </p>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
