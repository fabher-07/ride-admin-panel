import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
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

export default function FinancialReportScreen() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('2026-01')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setMounted(true)
    // Check if already authenticated in session
    const auth = sessionStorage.getItem('financial_report_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

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

  // Mock financial data
  const currentMonthData = {
    income: {
      cashCommissions: 148000, // Comisiones 15% de viajes en efectivo
      cardCommissions: 85000, // Comisiones 15% de viajes con tarjeta
      retentions: 15333, // Retenciones ISR + IVA
      total: 248333,
    },
    expenses: {
      servers: 35000,
      support: 45000,
      marketing: 25000,
      operations: 30000,
      maintenance: 15000,
      salaries: 80000,
      total: 230000,
    },
    profit: 18333,
    profitMargin: 7.4,
  }

  const nextMonthProjection = {
    income: {
      cashCommissions: 160000, // +8.1%
      cardCommissions: 97000, // +14.1%
      retentions: 17667, // +15.2%
      total: 274667,
    },
    expenses: {
      servers: 38000,
      support: 48000,
      marketing: 30000,
      operations: 32000,
      maintenance: 16000,
      salaries: 85000,
      total: 249000,
    },
    profit: 25667,
    profitMargin: 9.3,
    growth: 40.0,
  }

  // Cash flow data (last 6 months)
  const cashFlowData = [
    { month: 'Ago', ingresos: 180000, gastos: 200000, utilidad: -20000 },
    { month: 'Sep', ingresos: 195000, gastos: 205000, utilidad: -10000 },
    { month: 'Oct', ingresos: 210000, gastos: 215000, utilidad: -5000 },
    { month: 'Nov', ingresos: 225000, gastos: 220000, utilidad: 5000 },
    { month: 'Dic', ingresos: 235000, gastos: 225000, utilidad: 10000 },
    { month: 'Ene', ingresos: 248333, gastos: 230000, utilidad: 18333 },
  ]

  // Income breakdown
  const incomeBreakdown = [
    { name: 'Comisiones Efectivo', value: currentMonthData.income.cashCommissions, color: '#10B981' },
    { name: 'Comisiones Tarjeta', value: currentMonthData.income.cardCommissions, color: '#3B82F6' },
    { name: 'Retenciones ISR/IVA', value: currentMonthData.income.retentions, color: '#8B5CF6' },
  ]

  // Expenses breakdown
  const expensesBreakdown = [
    { name: 'Salarios', value: currentMonthData.expenses.salaries, color: '#EF4444' },
    { name: 'Soporte', value: currentMonthData.expenses.support, color: '#F59E0B' },
    { name: 'Servidores', value: currentMonthData.expenses.servers, color: '#10B981' },
    { name: 'Marketing', value: currentMonthData.expenses.marketing, color: '#3B82F6' },
    { name: 'Operaciones', value: currentMonthData.expenses.operations, color: '#8B5CF6' },
    { name: 'Mantenimiento', value: currentMonthData.expenses.maintenance, color: '#6366F1' },
  ]

  // Comparison data
  const comparisonData = [
    {
      category: 'Ingresos',
      actual: currentMonthData.income.total,
      proyectado: nextMonthProjection.income.total,
    },
    {
      category: 'Gastos',
      actual: currentMonthData.expenses.total,
      proyectado: nextMonthProjection.expenses.total,
    },
    {
      category: 'Utilidad',
      actual: currentMonthData.profit,
      proyectado: nextMonthProjection.profit,
    },
  ]

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Show password modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>GO!T Admin - Reporte Financiero</title>
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
        <title>GO!T Admin - Reporte Financiero</title>
        <meta name="description" content="Reporte de ingresos, gastos y proyecciones" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Reporte Financiero</h1>
          <p className="text-gray-600 mt-1">Ingresos, Gastos y Proyecciones</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 border-l-4 border-green-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Ingresos Totales</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(currentMonthData.income.total)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Enero 2026</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-red-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Gastos Totales</p>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(currentMonthData.expenses.total)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Enero 2026</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Utilidad Neta</p>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(currentMonthData.profit)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Margen: {currentMonthData.profitMargin}%
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Proyección Feb</p>
            <p className="text-3xl font-bold text-purple-600">
              {formatCurrency(nextMonthProjection.profit)}
            </p>
            <p className="text-xs text-green-600 mt-2">
              ↑ +{nextMonthProjection.growth}% vs Enero
            </p>
          </div>
        </div>

        {/* Income vs Expenses Comparison */}
        <div className="grid grid-cols-2 gap-6 mb-6">
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
                  {formatCurrency(currentMonthData.income.cashCommissions)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Comisiones Viajes Tarjeta</p>
                  <p className="text-xs text-gray-600">15% comisión sobre tarifa sin IVA</p>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(currentMonthData.income.cardCommissions)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Retenciones ISR (1.25%) + IVA (8%)</p>
                  <p className="text-xs text-gray-600">Retenciones fiscales sobre tarifa total</p>
                </div>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(currentMonthData.income.retentions)}
                </p>
              </div>

              <div className="flex justify-between items-center p-4 bg-green-100 rounded-lg border-2 border-green-500">
                <p className="text-lg font-bold text-gray-900">TOTAL INGRESOS</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(currentMonthData.income.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Expenses Details */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">💸 Gastos Operativos</h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Salarios</p>
                  <p className="text-xs text-gray-600">Equipo completo</p>
                </div>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(currentMonthData.expenses.salaries)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Soporte al Cliente</p>
                  <p className="text-xs text-gray-600">24/7 atención</p>
                </div>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(currentMonthData.expenses.support)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Servidores</p>
                  <p className="text-xs text-gray-600">AWS, hosting, base de datos</p>
                </div>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(currentMonthData.expenses.servers)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Marketing</p>
                  <p className="text-xs text-gray-600">Publicidad y promociones</p>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(currentMonthData.expenses.marketing)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Operaciones</p>
                  <p className="text-xs text-gray-600">Logística y administración</p>
                </div>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(currentMonthData.expenses.operations)}
                </p>
              </div>

              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Mantenimiento</p>
                  <p className="text-xs text-gray-600">Actualizaciones y mejoras</p>
                </div>
                <p className="text-lg font-bold text-indigo-600">
                  {formatCurrency(currentMonthData.expenses.maintenance)}
                </p>
              </div>

              <div className="flex justify-between items-center p-4 bg-red-100 rounded-lg border-2 border-red-500">
                <p className="text-lg font-bold text-gray-900">TOTAL GASTOS</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(currentMonthData.expenses.total)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Projections */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6 shadow-sm border-2 border-purple-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🔮 Proyecciones para Febrero 2026
          </h2>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Ingresos Proyectados</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(nextMonthProjection.income.total)}
              </p>
              <p className="text-xs text-green-600 mt-2">
                ↑ +{formatCurrency(nextMonthProjection.income.total - currentMonthData.income.total)}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-2">Gastos Proyectados</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(nextMonthProjection.expenses.total)}
              </p>
              <p className="text-xs text-orange-600 mt-2">
                ↑ +{formatCurrency(nextMonthProjection.expenses.total - currentMonthData.expenses.total)}
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
              utilidad neta gracias al incremento en viajes con tarjeta y efectivo. El margen
              de utilidad mejorará de <strong>{currentMonthData.profitMargin}%</strong> a{' '}
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
                  <Bar dataKey="actual" fill="#3B82F6" name="Enero (Actual)" />
                  <Bar dataKey="proyectado" fill="#8B5CF6" name="Febrero (Proyectado)" />
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
      </DashboardLayout>
    </>
  )
}
