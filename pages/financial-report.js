import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const DEFAULT_EXPENSES = {
  servers: 35000,
  support: 45000,
  marketing: 25000,
  operations: 30000,
  maintenance: 15000,
  salaries: 80000,
}

export default function FinancialReportScreen() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingExpenses, setSavingExpenses] = useState(false)
  const [showExpensesModal, setShowExpensesModal] = useState(false)

  // Real financial data from database
  const [income, setIncome] = useState({
    cashCommissions: 0,
    cardCommissions: 0,
    retentions: 0,
    total: 0,
  })
  const [expenses, setExpenses] = useState({ ...DEFAULT_EXPENSES, total: 0 })
  const [cashFlowData, setCashFlowData] = useState([])
  const [verifiedDebtPayments, setVerifiedDebtPayments] = useState(0)
  const [tripStats, setTripStats] = useState({ cash: 0, card: 0, total: 0 })

  // Expenses form state
  const [expenseForm, setExpenseForm] = useState({ ...DEFAULT_EXPENSES })

  useEffect(() => {
    setMounted(true)
    const auth = sessionStorage.getItem('financial_report_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadFinancialData()
    }
  }, [isAuthenticated, selectedMonth])

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (password === 'Ainhara06') {
      setIsAuthenticated(true)
      sessionStorage.setItem('financial_report_auth', 'true')
      setError('')
    } else {
      setError('Contraseña incorrecta')
      setPassword('')
    }
  }

  const getMonthBounds = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  const loadFinancialData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadIncomeData(),
        loadExpensesData(),
        loadCashFlowData(),
        loadDebtPayments(),
        loadTripStats(),
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadIncomeData = async () => {
    const { start, end } = getMonthBounds(selectedMonth)

    // Fetch commission_transactions grouped by payment_method
    const { data: commissions, error } = await supabase
      .from('commission_transactions')
      .select('payment_method, ride_commission_15_percent, isr_retention_1_25_percent, iva_retention_8_percent')
      .gte('created_at', start)
      .lt('created_at', end)

    if (error) {
      console.error('Error loading commissions:', error)
      return
    }

    let cashCommissions = 0
    let cardCommissions = 0
    let retentions = 0

    commissions?.forEach((row) => {
      const commission = parseFloat(row.ride_commission_15_percent || 0)
      const isr = parseFloat(row.isr_retention_1_25_percent || 0)
      const iva = parseFloat(row.iva_retention_8_percent || 0)

      if (row.payment_method === 'cash') {
        cashCommissions += commission
      } else if (row.payment_method === 'card') {
        cardCommissions += commission
      }
      retentions += isr + iva
    })

    setIncome({
      cashCommissions,
      cardCommissions,
      retentions,
      total: cashCommissions + cardCommissions + retentions,
    })
  }

  const loadExpensesData = async () => {
    // Try to load from platform_config first
    const { data, error } = await supabase
      .from('platform_config')
      .select('config_value')
      .eq('config_key', 'operating_expenses')
      .single()

    let expenseData = { ...DEFAULT_EXPENSES }

    if (!error && data?.config_value) {
      const stored = data.config_value
      expenseData = {
        servers: stored.servers ?? DEFAULT_EXPENSES.servers,
        support: stored.support ?? DEFAULT_EXPENSES.support,
        marketing: stored.marketing ?? DEFAULT_EXPENSES.marketing,
        operations: stored.operations ?? DEFAULT_EXPENSES.operations,
        maintenance: stored.maintenance ?? DEFAULT_EXPENSES.maintenance,
        salaries: stored.salaries ?? DEFAULT_EXPENSES.salaries,
      }
    }

    const total = Object.values(expenseData).reduce((a, b) => a + b, 0)
    setExpenses({ ...expenseData, total })
    setExpenseForm(expenseData)
  }

  const saveExpenses = async () => {
    setSavingExpenses(true)
    try {
      const total = Object.values(expenseForm).reduce((a, b) => a + b, 0)
      const payload = {
        config_key: 'operating_expenses',
        config_value: expenseForm,
        description: 'Gastos operativos mensuales del admin',
      }

      const { error } = await supabase
        .from('platform_config')
        .upsert(payload, { onConflict: 'config_key' })

      if (error) throw error

      setExpenses({ ...expenseForm, total })
      setShowExpensesModal(false)
    } catch (e) {
      console.error('Error saving expenses:', e)
      alert('Error al guardar gastos: ' + e.message)
    } finally {
      setSavingExpenses(false)
    }
  }

  const loadCashFlowData = async () => {
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleString('es-MX', { month: 'short' }).replace('.', '')
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ label, key })
    }

    const flow = []
    for (const { label, key } of months) {
      const { start, end } = getMonthBounds(key)

      const [{ data: commissions }, { data: expConfig }] = await Promise.all([
        supabase
          .from('commission_transactions')
          .select('ride_commission_15_percent, isr_retention_1_25_percent, iva_retention_8_percent')
          .gte('created_at', start)
          .lt('created_at', end),
        supabase
          .from('platform_config')
          .select('config_value')
          .eq('config_key', 'operating_expenses')
          .single(),
      ])

      const ingresos = commissions?.reduce((sum, row) => {
        return sum +
          parseFloat(row.ride_commission_15_percent || 0) +
          parseFloat(row.isr_retention_1_25_percent || 0) +
          parseFloat(row.iva_retention_8_percent || 0)
      }, 0) || 0

      const storedExpenses = expConfig?.config_value || DEFAULT_EXPENSES
      const gastos = Object.values(storedExpenses).reduce((a, b) => a + b, 0)

      flow.push({
        month: label.charAt(0).toUpperCase() + label.slice(1),
        ingresos,
        gastos,
        utilidad: ingresos - gastos,
      })
    }

    setCashFlowData(flow)
  }

  const loadDebtPayments = async () => {
    const { start, end } = getMonthBounds(selectedMonth)
    const { data, error } = await supabase
      .from('driver_debt_payments')
      .select('amount')
      .eq('status', 'verified')
      .gte('verified_at', start)
      .lt('verified_at', end)

    if (error) {
      console.error('Error loading debt payments:', error)
      return
    }

    const total = data?.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0) || 0
    setVerifiedDebtPayments(total)
  }

  const loadTripStats = async () => {
    const { start, end } = getMonthBounds(selectedMonth)
    const { data, error } = await supabase
      .from('trips')
      .select('payment_method')
      .eq('status', 'completed')
      .gte('completed_at', start)
      .lt('completed_at', end)

    if (error) {
      console.error('Error loading trip stats:', error)
      return
    }

    let cash = 0
    let card = 0
    data?.forEach((t) => {
      if (t.payment_method === 'cash') cash++
      else if (t.payment_method === 'card') card++
    })

    setTripStats({ cash, card, total: cash + card })
  }

  const profit = income.total - expenses.total
  const profitMargin = income.total > 0 ? ((profit / income.total) * 100).toFixed(1) : 0

  const nextMonthProjection = {
    income: {
      total: Math.round(income.total * 1.1),
    },
    expenses: {
      total: Math.round(expenses.total * 1.05),
    },
    profit: Math.round((income.total * 1.1) - (expenses.total * 1.05)),
    profitMargin: income.total > 0 ? ((((income.total * 1.1) - (expenses.total * 1.05)) / (income.total * 1.1)) * 100).toFixed(1) : 0,
    growth: profit > 0 ? Math.round((((income.total * 1.1) - (expenses.total * 1.05) - profit) / profit) * 100) : 0,
  }

  const incomeBreakdown = [
    { name: 'Comisiones Efectivo', value: income.cashCommissions, color: '#10B981' },
    { name: 'Comisiones Tarjeta', value: income.cardCommissions, color: '#3B82F6' },
    { name: 'Retenciones ISR/IVA', value: income.retentions, color: '#8B5CF6' },
  ]

  const expensesBreakdown = [
    { name: 'Salarios', value: expenses.salaries, color: '#EF4444' },
    { name: 'Soporte', value: expenses.support, color: '#F59E0B' },
    { name: 'Servidores', value: expenses.servers, color: '#10B981' },
    { name: 'Marketing', value: expenses.marketing, color: '#3B82F6' },
    { name: 'Operaciones', value: expenses.operations, color: '#8B5CF6' },
    { name: 'Mantenimiento', value: expenses.maintenance, color: '#6366F1' },
  ]

  const comparisonData = [
    {
      category: 'Ingresos',
      actual: income.total,
      proyectado: nextMonthProjection.income.total,
    },
    {
      category: 'Gastos',
      actual: expenses.total,
      proyectado: nextMonthProjection.expenses.total,
    },
    {
      category: 'Utilidad',
      actual: profit,
      proyectado: nextMonthProjection.profit,
    },
  ]

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const monthLabel = (monthStr) => {
    const [y, m] = monthStr.split('-').map(Number)
    const d = new Date(y, m - 1)
    return d.toLocaleString('es-MX', { month: 'long', year: 'numeric' })
  }

  // Show password modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>RIDE Admin - Reporte Financiero</title>
          <meta name="description" content="Reporte de ingresos, gastos y proyecciones" />
        </Head>

        <DashboardLayout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">🔒</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Acceso Restringido</h2>
                <p className="text-gray-600 mt-2">Ingresa la contraseña para ver el reporte financiero</p>
              </div>

              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Ingresa la contraseña"
                    autoFocus
                  />
                  {error && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <span>❌</span>
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
                >
                  Acceder
                </button>
              </form>

              <button
                onClick={() => router.push('/')}
                className="w-full mt-4 text-gray-600 hover:text-gray-800 text-sm"
              >
                ← Volver al tablero
              </button>
            </div>
          </div>
        </DashboardLayout>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>RIDE Admin - Reporte Financiero</title>
        <meta name="description" content="Reporte de ingresos, gastos y proyecciones" />
      </Head>

      <DashboardLayout>
        {/* Header with month selector */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reporte Financiero</h1>
            <p className="text-gray-600 mt-1">Ingresos, Gastos y Proyecciones</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
            {loading && (
              <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Viajes Efectivo</p>
            <p className="text-2xl font-bold text-green-600">{tripStats.cash}</p>
            <p className="text-xs text-gray-400">completados</p>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Viajes Tarjeta</p>
            <p className="text-2xl font-bold text-blue-600">{tripStats.card}</p>
            <p className="text-xs text-gray-400">completados</p>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Pagos Verificados</p>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(verifiedDebtPayments)}</p>
            <p className="text-xs text-gray-400">deudas cobradas</p>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Viajes Totales</p>
            <p className="text-2xl font-bold text-purple-600">{tripStats.total}</p>
            <p className="text-xs text-gray-400">en el periodo</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 border-l-4 border-green-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Ingresos Totales</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(income.total)}
            </p>
            <p className="text-xs text-gray-500 mt-2">{monthLabel(selectedMonth)}</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-red-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Gastos Totales</p>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(expenses.total)}
            </p>
            <p className="text-xs text-gray-500 mt-2">{monthLabel(selectedMonth)}</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Utilidad Neta</p>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(profit)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Margen: {profitMargin}%
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Proyección Próx. Mes</p>
            <p className="text-3xl font-bold text-purple-600">
              {formatCurrency(nextMonthProjection.profit)}
            </p>
            <p className="text-xs text-green-600 mt-2">
              ↑ +{nextMonthProjection.growth}% vs actual
            </p>
          </div>
        </div>

        {/* Income vs Expenses Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Income Details */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              💰 Ingresos por Comisiones (15%)
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Comisiones Viajes Efectivo</p>
                  <p className="text-xs text-gray-600">15% comisión sobre tarifa sin IVA</p>
                </div>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(income.cashCommissions)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Comisiones Viajes Tarjeta</p>
                  <p className="text-xs text-gray-600">15% comisión sobre tarifa sin IVA</p>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(income.cardCommissions)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Retenciones ISR (1.25%) + IVA (8%)</p>
                  <p className="text-xs text-gray-600">Retenciones fiscales sobre tarifa total</p>
                </div>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(income.retentions)}
                </p>
              </div>

              <div className="flex justify-between items-center p-4 bg-green-100 rounded-lg border-2 border-green-500">
                <p className="text-lg font-bold text-gray-900">TOTAL INGRESOS</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(income.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Expenses Details */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">💸 Gastos Operativos</h2>
              <button
                onClick={() => setShowExpensesModal(true)}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                ✏️ Editar
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Salarios</p>
                  <p className="text-xs text-gray-600">Equipo completo</p>
                </div>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(expenses.salaries)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Soporte al Cliente</p>
                  <p className="text-xs text-gray-600">24/7 atención</p>
                </div>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(expenses.support)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Servidores</p>
                  <p className="text-xs text-gray-600">AWS, hosting, base de datos</p>
                </div>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(expenses.servers)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Marketing</p>
                  <p className="text-xs text-gray-600">Publicidad y promociones</p>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(expenses.marketing)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Operaciones</p>
                  <p className="text-xs text-gray-600">Logística y administración</p>
                </div>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(expenses.operations)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Mantenimiento</p>
                  <p className="text-xs text-gray-600">Actualizaciones y mejoras</p>
                </div>
                <p className="text-lg font-bold text-indigo-600">
                  {formatCurrency(expenses.maintenance)}
                </p>
              </div>

              <div className="flex justify-between items-center p-4 bg-red-100 rounded-lg border-2 border-red-500">
                <p className="text-lg font-bold text-gray-900">TOTAL GASTOS</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(expenses.total)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Projections */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6 shadow-sm border-2 border-purple-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🔮 Proyecciones Próximo Mes
          </h2>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Ingresos Proyectados</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(nextMonthProjection.income.total)}
              </p>
              <p className="text-xs text-green-600 mt-2">
                ↑ +{formatCurrency(nextMonthProjection.income.total - income.total)}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Gastos Proyectados</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(nextMonthProjection.expenses.total)}
              </p>
              <p className="text-xs text-orange-600 mt-2">
                ↑ +{formatCurrency(nextMonthProjection.expenses.total - expenses.total)}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Utilidad Proyectada</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(nextMonthProjection.profit)}
              </p>
              <p className="text-xs text-green-600 mt-2">
                ↑ +{nextMonthProjection.growth}% crecimiento
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-white rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Análisis:</strong> Se espera un crecimiento del{' '}
              <strong className="text-green-600">{nextMonthProjection.growth}%</strong> en la
              utilidad neta. El margen de utilidad mejorará de{' '}
              <strong>{profitMargin}%</strong> a{' '}
              <strong className="text-blue-600">{nextMonthProjection.profitMargin}%</strong>.
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Cash Flow Chart */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📈 Flujo de Efectivo (Últimos 6 Meses)
            </h2>
            {mounted && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Ingresos"
                  />
                  <Line
                    type="monotone"
                    dataKey="gastos"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Gastos"
                  />
                  <Line
                    type="monotone"
                    dataKey="utilidad"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    name="Utilidad"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Comparison Chart */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📊 Comparación: Actual vs Proyectado
            </h2>
            {mounted && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="actual" fill="#3B82F6" name="Actual" />
                  <Bar dataKey="proyectado" fill="#8B5CF6" name="Proyectado" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Breakdown Charts */}
        <div className="grid grid-cols-2 gap-6">
          {/* Income Breakdown */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🥧 Distribución de Ingresos
            </h2>
            {mounted && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incomeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Expenses Breakdown */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🥧 Distribución de Gastos
            </h2>
            {mounted && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Edit Expenses Modal */}
        {showExpensesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Editar Gastos Operativos</h3>
                <button
                  onClick={() => setShowExpensesModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(expenseForm).map(([key, value]) => {
                  const labels = {
                    servers: 'Servidores',
                    support: 'Soporte al Cliente',
                    marketing: 'Marketing',
                    operations: 'Operaciones',
                    maintenance: 'Mantenimiento',
                    salaries: 'Salarios',
                  }
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {labels[key] || key}
                      </label>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            [key]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowExpensesModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveExpenses}
                  disabled={savingExpenses}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
                >
                  {savingExpenses ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
