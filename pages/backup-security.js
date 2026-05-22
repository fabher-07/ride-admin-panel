import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'

export default function BackupSecurityScreen() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedTab, setSelectedTab] = useState('backups')
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState(null)

  // Backup configuration
  const [backupConfig, setBackupConfig] = useState({
    autoBackupEnabled: true,
    backupTime: '03:00',
    retentionDays: 30,
    includeImages: true,
    includeAuditLogs: true,
  })

  // Mock backup history
  const [backups] = useState([
    {
      id: 1,
      date: '2026-01-23',
      time: '03:00',
      type: 'Automático',
      size: '2.4 GB',
      status: 'Completado',
      duration: '12 min',
      tables: 15,
      records: 1250000,
    },
    {
      id: 2,
      date: '2026-01-22',
      time: '03:00',
      type: 'Automático',
      size: '2.3 GB',
      status: 'Completado',
      duration: '11 min',
      tables: 15,
      records: 1245000,
    },
    {
      id: 3,
      date: '2026-01-21',
      time: '15:30',
      type: 'Manual',
      size: '2.3 GB',
      status: 'Completado',
      duration: '10 min',
      tables: 15,
      records: 1240000,
    },
    {
      id: 4,
      date: '2026-01-21',
      time: '03:00',
      type: 'Automático',
      size: '2.3 GB',
      status: 'Completado',
      duration: '11 min',
      tables: 15,
      records: 1240000,
    },
    {
      id: 5,
      date: '2026-01-20',
      time: '03:00',
      type: 'Automático',
      size: '2.2 GB',
      status: 'Completado',
      duration: '12 min',
      tables: 15,
      records: 1235000,
    },
  ])

  // Mock audit logs
  const [auditLogs] = useState([
    {
      id: 1,
      timestamp: '2026-01-23 07:45',
      user: 'soporte@ride-app-taxi.com',
      action: 'Aprobó conductor',
      details: 'Juan Pérez (ID: 1234)',
      ip: '192.168.1.100',
      category: 'drivers',
    },
    {
      id: 2,
      timestamp: '2026-01-23 07:30',
      user: 'soporte@ride-app-taxi.com',
      action: 'Modificó configuración',
      details: 'Radio de búsqueda: 5km → 7km',
      ip: '192.168.1.100',
      category: 'settings',
    },
    {
      id: 3,
      timestamp: '2026-01-23 07:15',
      user: 'soporte@ride-app-taxi.com',
      action: 'Resolvió ticket',
      details: 'TKT-2026-001',
      ip: '192.168.1.105',
      category: 'support',
    },
    {
      id: 4,
      timestamp: '2026-01-23 07:00',
      user: 'soporte@ride-app-taxi.com',
      action: 'Bloqueó conductor',
      details: 'Carlos López (ID: 5678) - Documento falso',
      ip: '192.168.1.100',
      category: 'drivers',
    },
    {
      id: 5,
      timestamp: '2026-01-23 06:45',
      user: 'soporte@ride-app-taxi.com',
      action: 'Exportó reporte',
      details: 'Reporte financiero enero 2026',
      ip: '192.168.1.110',
      category: 'reports',
    },
    {
      id: 6,
      timestamp: '2026-01-23 06:30',
      user: 'soporte@ride-app-taxi.com',
      action: 'Creó campaña',
      details: 'Promoción Verano 2026',
      ip: '192.168.1.100',
      category: 'marketing',
    },
    {
      id: 7,
      timestamp: '2026-01-23 06:15',
      user: 'soporte@ride-app-taxi.com',
      action: 'Creó ticket',
      details: 'TKT-2026-005',
      ip: '192.168.1.105',
      category: 'support',
    },
    {
      id: 8,
      timestamp: '2026-01-23 06:00',
      user: 'soporte@ride-app-taxi.com',
      action: 'Actualizó tarifas',
      details: 'Tarifa base: $45 → $50',
      ip: '192.168.1.100',
      category: 'pricing',
    },
  ])

  const [auditFilter, setAuditFilter] = useState('all')

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleManualBackup = () => {
    if (confirm('¿Deseas crear una copia de seguridad manual ahora?')) {
      alert('Iniciando backup manual... Esto puede tomar varios minutos.')
      // In a real app, this would trigger the backup process
    }
  }

  const handleExportDatabase = () => {
    if (confirm('¿Deseas exportar la base de datos completa? Esto generará un archivo SQL grande.')) {
      alert('Generando exportación SQL... Se descargará automáticamente cuando esté lista.')
      // In a real app, this would generate and download the SQL file
    }
  }

  const handleRestore = (backup) => {
    setSelectedBackup(backup)
    setShowRestoreModal(true)
  }

  const handleConfirmRestore = () => {
    alert(
      `Restaurando base de datos desde backup del ${selectedBackup.date} ${selectedBackup.time}...\n\nEsto puede tomar varios minutos y la plataforma estará temporalmente no disponible.`
    )
    setShowRestoreModal(false)
    setSelectedBackup(null)
  }

  const handleDownloadBackup = (backup) => {
    alert(`Descargando backup del ${backup.date} ${backup.time}...\nTamaño: ${backup.size}`)
    // In a real app, this would download the backup file
  }

  const filteredAuditLogs =
    auditFilter === 'all' ? auditLogs : auditLogs.filter((log) => log.category === auditFilter)

  const getCategoryConfig = (category) => {
    switch (category) {
      case 'drivers':
        return { label: 'Conductores', color: 'bg-blue-100 text-blue-800', icon: '🚕' }
      case 'settings':
        return { label: 'Configuración', color: 'bg-purple-100 text-purple-800', icon: '⚙️' }
      case 'support':
        return { label: 'Soporte', color: 'bg-green-100 text-green-800', icon: '🎫' }
      case 'reports':
        return { label: 'Reportes', color: 'bg-orange-100 text-orange-800', icon: '📊' }
      case 'marketing':
        return { label: 'Marketing', color: 'bg-pink-100 text-pink-800', icon: '📢' }
      case 'pricing':
        return { label: 'Tarifas', color: 'bg-yellow-100 text-yellow-800', icon: '💰' }
      default:
        return { label: 'Otro', color: 'bg-gray-100 text-gray-800', icon: '📝' }
    }
  }

  return (
    <>
      <Head>
        <title>RIDE Admin - Copias de Seguridad</title>
        <meta name="description" content="Sistema de backup y auditoría" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Copias de Seguridad y Auditoría</h1>
          <p className="text-gray-600 mt-1">Sistema de respaldo automático y logs de auditoría</p>
        </div>

        {/* Status Banner */}
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-green-800">Sistema de Backup Activo</h3>
              <p className="text-sm text-green-700 mt-1">
                Último backup automático: Hoy a las 03:00 AM (2.4 GB) • Próximo backup: Mañana a
                las 03:00 AM
              </p>
            </div>
            <div className="ml-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                🟢 ACTIVO
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={handleManualBackup}
            className="bg-blue-500 text-white p-6 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
          >
            <div className="text-3xl mb-2">💾</div>
            <h3 className="text-lg font-semibold">Backup Manual</h3>
            <p className="text-sm opacity-90 mt-1">Crear copia ahora</p>
          </button>

          <button
            onClick={handleExportDatabase}
            className="bg-purple-500 text-white p-6 rounded-lg hover:bg-purple-600 transition-colors shadow-sm"
          >
            <div className="text-3xl mb-2">📤</div>
            <h3 className="text-lg font-semibold">Exportar BD</h3>
            <p className="text-sm opacity-90 mt-1">Descargar SQL completo</p>
          </button>

          <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="text-lg font-semibold text-gray-900">Estadísticas</h3>
            <p className="text-sm text-gray-600 mt-1">
              {backups.length} backups • {auditLogs.length} logs
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSelectedTab('backups')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                selectedTab === 'backups'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              💾 Historial de Backups
            </button>
            <button
              onClick={() => setSelectedTab('audit')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                selectedTab === 'audit'
                  ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📋 Logs de Auditoría
            </button>
            <button
              onClick={() => setSelectedTab('config')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                selectedTab === 'config'
                  ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ⚙️ Configuración
            </button>
          </div>
        </div>

        {/* Backups Tab */}
        {selectedTab === 'backups' && (
          <div className="space-y-4">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Backup - {backup.date} {backup.time}
                    </h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          backup.type === 'Automático'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {backup.type === 'Automático' ? '🤖' : '👤'} {backup.type}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        ✅ {backup.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{backup.size}</p>
                    <p className="text-xs text-gray-500">Tamaño del archivo</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Duración</p>
                    <p className="text-sm font-semibold text-gray-900">{backup.duration}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Tablas</p>
                    <p className="text-sm font-semibold text-gray-900">{backup.tables}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Registros</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {backup.records.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Estado</p>
                    <p className="text-sm font-semibold text-green-600">{backup.status}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadBackup(backup)}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                  >
                    📥 Descargar
                  </button>
                  <button
                    onClick={() => handleRestore(backup)}
                    className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
                  >
                    🔄 Restaurar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Audit Logs Tab */}
        {selectedTab === 'audit' && (
          <div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Filtrar por Categoría
              </label>
              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas las categorías</option>
                <option value="drivers">🚕 Conductores</option>
                <option value="settings">⚙️ Configuración</option>
                <option value="support">🎫 Soporte</option>
                <option value="reports">📊 Reportes</option>
                <option value="marketing">📢 Marketing</option>
                <option value="pricing">💰 Tarifas</option>
              </select>
            </div>

            <div className="space-y-2">
              {filteredAuditLogs.map((log) => {
                const categoryConfig = getCategoryConfig(log.category)
                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${categoryConfig.color}`}
                          >
                            {categoryConfig.icon} {categoryConfig.label}
                          </span>
                          <span className="text-xs text-gray-500">{log.timestamp}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">{log.action}</p>
                        <p className="text-sm text-gray-600">{log.details}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>👤 {log.user}</span>
                          <span>🌐 {log.ip}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Configuration Tab */}
        {selectedTab === 'config' && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              ⚙️ Configuración de Backups Automáticos
            </h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Backup Automático Diario</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Crear copia de seguridad automáticamente cada día
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backupConfig.autoBackupEnabled}
                    onChange={(e) =>
                      setBackupConfig({ ...backupConfig, autoBackupEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Hora del Backup Diario
                </label>
                <input
                  type="time"
                  value={backupConfig.backupTime}
                  onChange={(e) => setBackupConfig({ ...backupConfig, backupTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Recomendado: Horario de baja actividad (ej: 03:00 AM)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Retención de Backups (días)
                </label>
                <input
                  type="number"
                  value={backupConfig.retentionDays}
                  onChange={(e) =>
                    setBackupConfig({ ...backupConfig, retentionDays: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Los backups más antiguos se eliminarán automáticamente
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={backupConfig.includeImages}
                    onChange={(e) =>
                      setBackupConfig({ ...backupConfig, includeImages: e.target.checked })
                    }
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Incluir Imágenes</p>
                    <p className="text-xs text-gray-600">
                      Fotos de perfil, documentos, imágenes de publicidad
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={backupConfig.includeAuditLogs}
                    onChange={(e) =>
                      setBackupConfig({ ...backupConfig, includeAuditLogs: e.target.checked })
                    }
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Incluir Logs de Auditoría</p>
                    <p className="text-xs text-gray-600">Historial completo de acciones</p>
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">📋 Resumen</h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>
                    • Backup automático:{' '}
                    {backupConfig.autoBackupEnabled ? (
                      <strong className="text-green-600">Activo</strong>
                    ) : (
                      <strong className="text-red-600">Desactivado</strong>
                    )}
                  </li>
                  <li>
                    • Hora programada: <strong>{backupConfig.backupTime}</strong>
                  </li>
                  <li>
                    • Retención: <strong>{backupConfig.retentionDays} días</strong>
                  </li>
                  <li>
                    • Incluye imágenes:{' '}
                    <strong>{backupConfig.includeImages ? 'Sí' : 'No'}</strong>
                  </li>
                  <li>
                    • Incluye logs:{' '}
                    <strong>{backupConfig.includeAuditLogs ? 'Sí' : 'No'}</strong>
                  </li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => alert('Configuración guardada exitosamente')}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  💾 Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Restore Confirmation Modal */}
        {showRestoreModal && selectedBackup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900">⚠️ Confirmar Restauración</h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-300">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">
                    ⚠️ ADVERTENCIA CRÍTICA
                  </h3>
                  <p className="text-sm text-red-700">
                    Esta acción restaurará la base de datos al estado del backup seleccionado.{' '}
                    <strong>TODOS los datos actuales se perderán</strong> y serán reemplazados por
                    los datos del backup.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Backup a Restaurar:
                  </h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>
                      • Fecha: <strong>{selectedBackup.date}</strong>
                    </li>
                    <li>
                      • Hora: <strong>{selectedBackup.time}</strong>
                    </li>
                    <li>
                      • Tipo: <strong>{selectedBackup.type}</strong>
                    </li>
                    <li>
                      • Tamaño: <strong>{selectedBackup.size}</strong>
                    </li>
                    <li>
                      • Registros: <strong>{selectedBackup.records.toLocaleString()}</strong>
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                    Durante la restauración:
                  </h3>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• La plataforma estará temporalmente no disponible</li>
                    <li>• Todos los usuarios serán desconectados</li>
                    <li>• El proceso puede tomar varios minutos</li>
                    <li>• Se perderán todos los cambios desde el backup</li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowRestoreModal(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmRestore}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  🔄 Confirmar Restauración
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
