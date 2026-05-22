import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import {
  createBackup,
  downloadBackup,
  getBackups,
  deleteBackup,
  getDatabaseStats
} from '@/services/backupService'

export default function BackupsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [backups, setBackups] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState(null)

  useEffect(() => {
    loadBackups()
    loadStats()
  }, [])

  const loadBackups = async () => {
    setLoading(true)
    try {
      const result = await getBackups(50)
      if (result.success) {
        setBackups(result.backups)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error('Error al cargar backups:', err)
      setError('Error al cargar la lista de backups')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await getDatabaseStats()
      if (result.success) {
        setStats(result)
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err)
    }
  }

  const handleCreateBackup = async () => {
    if (!user?.id) {
      alert('Error: Usuario no autenticado')
      return
    }

    if (!confirm('¿Crear un backup completo de la base de datos? Esto puede tomar varios minutos.')) {
      return
    }

    setCreating(true)
    setError(null)

    try {
      const result = await createBackup(user.id, 'manual')
      
      if (result.success) {
        alert('✅ Backup creado exitosamente')
        
        // Descargar automáticamente
        downloadBackup(result.data)
        
        // Recargar lista
        await loadBackups()
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error('Error al crear backup:', err)
      setError('Error al crear el backup: ' + err.message)
      alert('❌ Error al crear el backup')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteBackup = async (backupId) => {
    if (!confirm('¿Eliminar este backup? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const result = await deleteBackup(backupId, user.id)
      
      if (result.success) {
        alert('✅ Backup eliminado')
        await loadBackups()
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error('Error al eliminar backup:', err)
      alert('❌ Error al eliminar el backup')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status) => {
    const texts = {
      completed: '✅ Completado',
      in_progress: '⏳ En progreso',
      failed: '❌ Fallido'
    }
    return texts[status] || status
  }

  return (
    <>
      <Head>
        <title>RIDE Admin - Backups y Restauración</title>
        <meta name="description" content="Gestión de backups de la base de datos" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Backups y Restauración</h1>
              <p className="text-gray-600 mt-1">
                Gestiona copias de seguridad de la base de datos
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creando...</span>
                </>
              ) : (
                <>💾 Crear Backup Manual</>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Admin Info */}
        {user && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">👤</span>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Usuario: {user.email || user.full_name}
                </p>
                <p className="text-xs text-blue-700">
                  Todas las operaciones de backup quedarán registradas en el historial
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Database Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📊</span>
                <div>
                  <p className="text-sm text-gray-600">Total Registros</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalRecords?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🗂️</span>
                <div>
                  <p className="text-sm text-gray-600">Tablas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.tablesCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💾</span>
                <div>
                  <p className="text-sm text-gray-600">Backups</p>
                  <p className="text-2xl font-bold text-gray-900">{backups.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <p className="text-sm text-gray-600">Completados</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {backups.filter(b => b.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">Importante</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Los backups se descargan automáticamente al crearlos. Guárdalos en un lugar seguro.
                La restauración de backups es una operación destructiva que reemplazará todos los datos actuales.
              </p>
            </div>
          </div>
        </div>

        {/* Backups List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Historial de Backups</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Cargando backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <span className="text-4xl mb-2 block">📦</span>
              No hay backups disponibles. Crea tu primer backup.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Tamaño
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Registros
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Creado por
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(backup.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          backup.backup_type === 'automatic' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {backup.backup_type === 'automatic' ? '🤖 Automático' : '👤 Manual'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(backup.status)}`}>
                          {getStatusText(backup.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {backup.file_size_bytes ? formatBytes(backup.file_size_bytes) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {backup.records_count?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <p className="font-medium text-gray-900">
                            {backup.users?.full_name || 'Sistema'}
                          </p>
                          <p className="text-xs text-gray-500">{backup.users?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDeleteBackup(backup.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          🗑️ Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-bold text-blue-900 mb-3">📅 Backups Automáticos</h3>
            <p className="text-sm text-blue-800 mb-3">
              Para configurar backups automáticos diarios, necesitas configurar un cron job en el servidor.
            </p>
            <div className="bg-white rounded p-3 font-mono text-xs">
              <p className="text-gray-700">Cron: 0 2 * * *</p>
              <p className="text-gray-700">Hora: 2:00 AM diario</p>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h3 className="text-lg font-bold text-green-900 mb-3">💡 Mejores Prácticas</h3>
            <ul className="text-sm text-green-800 space-y-2">
              <li>✅ Crear backups antes de cambios importantes</li>
              <li>✅ Guardar backups en múltiples ubicaciones</li>
              <li>✅ Probar restauraciones periódicamente</li>
              <li>✅ Mantener al menos 7 días de backups</li>
            </ul>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
