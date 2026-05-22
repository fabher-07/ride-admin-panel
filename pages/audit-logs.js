import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAuditLogs,
  getAuditStats,
  exportAuditLogs,
  exportAuditLogsCSV,
  AUDIT_ACTIONS
} from '@/services/auditLogService'

export default function AuditLogsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    dateFrom: '',
    dateTo: ''
  })

  useEffect(() => {
    loadLogs()
    loadStats()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await getAuditLogs(filters, 100)
      if (result.success) {
        setLogs(result.logs)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error('Error al cargar logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await getAuditStats()
      if (result.success) {
        setStats(result.stats)
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value })
  }

  const handleApplyFilters = () => {
    loadLogs()
  }

  const handleClearFilters = () => {
    setFilters({
      action: '',
      entityType: '',
      dateFrom: '',
      dateTo: ''
    })
    setTimeout(() => loadLogs(), 100)
  }

  const handleExportJSON = async () => {
    setExporting(true)
    try {
      const result = await exportAuditLogs(filters)
      if (result.success) {
        alert('✅ Logs exportados exitosamente: ' + result.filename)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error('Error al exportar:', err)
      alert('❌ Error al exportar logs')
    } finally {
      setExporting(false)
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const result = await exportAuditLogsCSV(filters)
      if (result.success) {
        alert('✅ Logs exportados exitosamente: ' + result.filename)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error('Error al exportar:', err)
      alert('❌ Error al exportar logs')
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionLabel = (action) => {
    const labels = {
      update_platform_config: '🔧 Actualizar Config',
      bulk_update_platform_config: '📦 Actualización Masiva',
      create_user: '➕ Crear Usuario',
      update_user: '✏️ Actualizar Usuario',
      delete_user: '🗑️ Eliminar Usuario',
      block_user: '🚫 Bloquear Usuario',
      unblock_user: '✅ Desbloquear Usuario',
      approve_driver: '✅ Aprobar Conductor',
      reject_driver: '❌ Rechazar Conductor',
      suspend_driver: '⏸️ Suspender Conductor',
      activate_driver: '▶️ Activar Conductor',
      cancel_trip: '🚫 Cancelar Viaje',
      refund_trip: '💰 Reembolsar Viaje',
      create_backup: '💾 Crear Backup',
      restore_backup: '♻️ Restaurar Backup',
      delete_backup: '🗑️ Eliminar Backup',
      admin_login: '🔐 Login Admin',
      admin_logout: '🚪 Logout Admin',
      export_data: '📤 Exportar Datos'
    }
    return labels[action] || action
  }

  const getActionColor = (action) => {
    if (action.includes('delete') || action.includes('block') || action.includes('reject')) {
      return 'text-red-600'
    }
    if (action.includes('create') || action.includes('approve') || action.includes('activate')) {
      return 'text-green-600'
    }
    if (action.includes('update')) {
      return 'text-blue-600'
    }
    return 'text-gray-600'
  }

  return (
    <>
      <Head>
        <title>RIDE Admin - Logs de Auditoría</title>
        <meta name="description" content="Historial completo de acciones administrativas" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Logs de Auditoría</h1>
              <p className="text-gray-600 mt-1">
                Registro completo de todas las acciones administrativas
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
              >
                📊 Exportar CSV
              </button>
              <button
                onClick={handleExportJSON}
                disabled={exporting}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
              >
                📥 Exportar JSON
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📊</span>
                <div>
                  <p className="text-sm text-gray-600">Total Acciones</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalActions?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👥</span>
                <div>
                  <p className="text-sm text-gray-600">Usuarios Activos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.keys(stats.actionsByUser || {}).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎯</span>
                <div>
                  <p className="text-sm text-gray-600">Tipos de Acción</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.keys(stats.actionsByType || {}).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📅</span>
                <div>
                  <p className="text-sm text-gray-600">Días con Actividad</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.keys(stats.actionsByDay || {}).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🔍 Filtros</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Acción
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                <option value="update_platform_config">Actualizar Config</option>
                <option value="bulk_update_platform_config">Actualización Masiva</option>
                <option value="create_backup">Crear Backup</option>
                <option value="approve_driver">Aprobar Conductor</option>
                <option value="block_user">Bloquear Usuario</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Entidad
              </label>
              <select
                value={filters.entityType}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                <option value="platform_config">Configuración</option>
                <option value="user">Usuario</option>
                <option value="driver">Conductor</option>
                <option value="trip">Viaje</option>
                <option value="backup">Backup</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Desde
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Registro de Actividad ({logs.length} registros)
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Cargando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <span className="text-4xl mb-2 block">📋</span>
              No hay logs que coincidan con los filtros
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Acción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Entidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Detalles
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.users?.full_name || 'Sistema'}
                          </p>
                          <p className="text-xs text-gray-500">{log.users?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:text-blue-800">
                            Ver detalles
                          </summary>
                          <div className="mt-2 bg-gray-50 p-3 rounded text-xs font-mono max-w-md overflow-auto">
                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div>
              <p className="text-sm font-semibold text-blue-900">Retención de Logs</p>
              <p className="text-sm text-blue-800 mt-1">
                Los logs se mantienen por 90 días. Exporta regularmente para mantener un historial completo.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
