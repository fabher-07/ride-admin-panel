import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { getConfigHistory } from '@/services/platformConfigService'

export default function ConfigHistoryScreen() {
  const router = useRouter()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getConfigHistory(100)
      if (result.success) {
        setHistory(result.history)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error('Error al cargar historial:', err)
      setError('Error al cargar el historial de configuración')
    } finally {
      setLoading(false)
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

  const getActionLabel = (action) => {
    switch (action) {
      case 'update_platform_config':
        return '🔧 Actualización Individual'
      case 'bulk_update_platform_config':
        return '📦 Actualización Masiva'
      default:
        return action
    }
  }

  return (
    <>
      <Head>
        <title>GO!T Admin - Historial de Configuración</title>
        <meta name="description" content="Historial de cambios en la configuración" />
      </Head>

      <DashboardLayout>
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Historial de Configuración</h1>
              <p className="text-gray-600 mt-1">
                Registro de todos los cambios realizados en la configuración de la plataforma
              </p>
            </div>
            <button
              onClick={() => router.push('/platform-configuration')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              ← Volver a Configuración
            </button>
          </div>

          {loading && (
            <div className="mt-4 text-blue-600 flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Cargando historial...</span>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Acción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Detalles
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        No hay cambios registrados
                      </td>
                    </tr>
                  ) : (
                    history.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(entry.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.users?.full_name || 'Usuario desconocido'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.users?.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getActionLabel(entry.action)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {entry.action === 'bulk_update_platform_config' ? (
                            <div>
                              <span className="font-semibold">
                                {entry.details?.count || 0} configuraciones actualizadas
                              </span>
                              <details className="mt-2">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                  Ver detalles
                                </summary>
                                <div className="mt-2 bg-gray-50 p-3 rounded text-xs">
                                  {entry.details?.updates?.map((update, idx) => (
                                    <div key={idx} className="mb-1">
                                      <span className="font-mono">{update.key}</span>
                                      {' → '}
                                      <span className="text-green-600">
                                        {JSON.stringify(update.value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono">{entry.details?.config_key}</span>
                              {' → '}
                              <span className="text-green-600">
                                {JSON.stringify(entry.details?.new_value)}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
