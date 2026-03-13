import { useState, useEffect } from 'react'
import Head from 'next/head'
import DashboardLayout from '@/components/DashboardLayout'

export default function SystemAlertsScreen() {
  const [mounted, setMounted] = useState(false)
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterType, setFilterType] = useState('all')

  // Mock data - en producción vendría de Supabase
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'long_trip',
      priority: 'high',
      title: 'Viaje largo sin finalizar',
      description: 'ID#789 - 42 minutos sin finalizar',
      details: {
        tripId: '789',
        driver: 'Roberto Mendoza',
        passenger: 'Ana López',
        duration: 42,
        expectedDuration: 25,
        route: 'Centro → Cholula',
        lastUpdate: '4:14 AM',
      },
      timestamp: new Date(Date.now() - 42 * 60000),
      status: 'active',
      contactPhone: '+52 222 123 4567',
    },
    {
      id: 2,
      type: 'pending_payment',
      priority: 'high',
      title: 'Pago pendiente',
      description: 'Viaje #456 - $180 sin cobrar',
      details: {
        tripId: '456',
        driver: 'María Sánchez',
        passenger: 'Carlos Ruiz',
        amount: 180,
        paymentMethod: 'Tarjeta',
        failureReason: 'Tarjeta rechazada',
        completedAt: '3:45 AM',
      },
      timestamp: new Date(Date.now() - 71 * 60000),
      status: 'active',
      contactPhone: '+52 222 234 5678',
    },
    {
      id: 3,
      type: 'service_down',
      priority: 'critical',
      title: 'Servicio caído',
      description: 'API Maps - 5 min sin respuesta',
      details: {
        service: 'Google Maps API',
        downSince: '4:51 AM',
        affectedTrips: 3,
        lastError: 'Connection timeout',
        endpoint: 'maps.googleapis.com',
      },
      timestamp: new Date(Date.now() - 5 * 60000),
      status: 'active',
      contactPhone: null,
    },
    {
      id: 4,
      type: 'long_trip',
      priority: 'medium',
      title: 'Viaje largo sin finalizar',
      description: 'ID#823 - 35 minutos sin finalizar',
      details: {
        tripId: '823',
        driver: 'Pedro García',
        passenger: 'Laura Martínez',
        duration: 35,
        expectedDuration: 22,
        route: 'Angelópolis → CAPU',
        lastUpdate: '4:21 AM',
      },
      timestamp: new Date(Date.now() - 35 * 60000),
      status: 'active',
      contactPhone: '+52 222 345 6789',
    },
    {
      id: 5,
      type: 'pending_payment',
      priority: 'medium',
      title: 'Pago pendiente',
      description: 'Viaje #512 - $95 sin cobrar',
      details: {
        tripId: '512',
        driver: 'Diana Torres',
        passenger: 'Miguel Ángel Castro',
        amount: 95,
        paymentMethod: 'Efectivo',
        failureReason: 'Pasajero sin efectivo',
        completedAt: '4:20 AM',
      },
      timestamp: new Date(Date.now() - 36 * 60000),
      status: 'active',
      contactPhone: '+52 222 456 7890',
    },
    {
      id: 6,
      type: 'driver_offline',
      priority: 'low',
      title: 'Conductor desconectado inesperadamente',
      description: 'Juan Pérez - #1234 - Sin conexión por 8 min',
      details: {
        driver: 'Juan Pérez',
        economico: '1234',
        lastSeen: '4:48 AM',
        location: 'Centro',
        activeTrip: false,
      },
      timestamp: new Date(Date.now() - 8 * 60000),
      status: 'active',
      contactPhone: '+52 222 567 8901',
    },
    {
      id: 7,
      type: 'dispute',
      priority: 'high',
      title: 'Disputa reportada',
      description: 'Viaje #678 - Pasajero reportó problema con tarifa',
      details: {
        tripId: '678',
        driver: 'Carlos López',
        passenger: 'Sofia Hernández',
        reportedAmount: 150,
        expectedAmount: 120,
        reason: 'Ruta más larga de lo esperado',
        reportedAt: '4:30 AM',
      },
      timestamp: new Date(Date.now() - 26 * 60000),
      status: 'active',
      contactPhone: '+52 222 678 9012',
    },
  ])

  const [stats, setStats] = useState({
    total: 7,
    critical: 1,
    high: 3,
    medium: 2,
    low: 1,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const getAlertConfig = (type) => {
    switch (type) {
      case 'long_trip':
        return {
          icon: '⏱️',
          color: 'orange',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800',
          label: 'Viaje Largo',
        }
      case 'pending_payment':
        return {
          icon: '💳',
          color: 'red',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          label: 'Pago Pendiente',
        }
      case 'service_down':
        return {
          icon: '🔴',
          color: 'red',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          label: 'Servicio Caído',
        }
      case 'driver_offline':
        return {
          icon: '📵',
          color: 'gray',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          label: 'Conductor Offline',
        }
      case 'dispute':
        return {
          icon: '⚠️',
          color: 'yellow',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          label: 'Disputa',
        }
      default:
        return {
          icon: '❓',
          color: 'gray',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          label: 'Desconocido',
        }
    }
  }

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'critical':
        return {
          label: 'CRÍTICO',
          color: 'bg-red-600 text-white',
          pulse: true,
        }
      case 'high':
        return {
          label: 'ALTO',
          color: 'bg-red-500 text-white',
          pulse: false,
        }
      case 'medium':
        return {
          label: 'MEDIO',
          color: 'bg-orange-500 text-white',
          pulse: false,
        }
      case 'low':
        return {
          label: 'BAJO',
          color: 'bg-gray-500 text-white',
          pulse: false,
        }
      default:
        return {
          label: 'DESCONOCIDO',
          color: 'bg-gray-400 text-white',
          pulse: false,
        }
    }
  }

  const handleContactDriver = (phone, alertTitle) => {
    if (!phone) {
      alert('No hay número de contacto disponible')
      return
    }
    if (confirm(`¿Llamar a ${phone}?\n\nAlerta: ${alertTitle}`)) {
      window.location.href = `tel:${phone}`
    }
  }

  const handleResolveAlert = (alertId) => {
    if (confirm('¿Marcar esta alerta como resuelta?')) {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: 'resolved' } : a)))
      alert('Alerta marcada como resuelta')
    }
  }

  const handleViewDetails = (alert) => {
    alert(`Detalles de la alerta:\n\n${JSON.stringify(alert.details, null, 2)}`)
  }

  const filteredAlerts = alerts.filter((alert) => {
    const matchesPriority = filterPriority === 'all' || alert.priority === filterPriority
    const matchesType = filterType === 'all' || alert.type === filterType
    const matchesStatus = alert.status === 'active'
    return matchesPriority && matchesType && matchesStatus
  })

  const getTimeAgo = (timestamp) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / 60000)
    if (minutes < 1) return 'Ahora'
    if (minutes === 1) return 'Hace 1 minuto'
    if (minutes < 60) return `Hace ${minutes} minutos`
    const hours = Math.floor(minutes / 60)
    if (hours === 1) return 'Hace 1 hora'
    return `Hace ${hours} horas`
  }

  return (
    <>
      <Head>
        <title>GO!T Admin - Alertas del Sistema</title>
        <meta name="description" content="Alertas y problemas del sistema en tiempo real" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alertas del Sistema</h1>
              {mounted && (
                <p className="text-gray-600 mt-1">
                  Última actualización: {new Date().toLocaleTimeString('es-MX')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">
                {stats.critical + stats.high} alertas críticas
              </span>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setFilterPriority('all')}
            className="bg-white rounded-lg p-4 border-l-4 border-gray-500 text-left hover:shadow-md hover:bg-gray-50 transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600">Total Alertas</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </button>

          <button
            onClick={() => setFilterPriority('critical')}
            className="bg-white rounded-lg p-4 border-l-4 border-red-600 text-left hover:shadow-md hover:bg-red-50 transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600">Críticas</p>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          </button>

          <button
            onClick={() => setFilterPriority('high')}
            className="bg-white rounded-lg p-4 border-l-4 border-red-500 text-left hover:shadow-md hover:bg-red-50 transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600">Altas</p>
            <p className="text-2xl font-bold text-red-500">{stats.high}</p>
          </button>

          <button
            onClick={() => setFilterPriority('medium')}
            className="bg-white rounded-lg p-4 border-l-4 border-orange-500 text-left hover:shadow-md hover:bg-orange-50 transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600">Medias</p>
            <p className="text-2xl font-bold text-orange-500">{stats.medium}</p>
          </button>

          <button
            onClick={() => setFilterPriority('low')}
            className="bg-white rounded-lg p-4 border-l-4 border-gray-400 text-left hover:shadow-md hover:bg-gray-50 transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600">Bajas</p>
            <p className="text-2xl font-bold text-gray-600">{stats.low}</p>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
          <div className="flex gap-4">
            {/* Priority Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Prioridad
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterPriority('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterPriority === 'all'
                      ? 'bg-primary text-black'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterPriority('critical')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterPriority === 'critical'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Críticas
                </button>
                <button
                  onClick={() => setFilterPriority('high')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterPriority === 'high'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Altas
                </button>
                <button
                  onClick={() => setFilterPriority('medium')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterPriority === 'medium'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Medias
                </button>
                <button
                  onClick={() => setFilterPriority('low')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterPriority === 'low'
                      ? 'bg-gray-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bajas
                </button>
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Tipo
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-primary text-black'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterType('long_trip')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'long_trip'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Viajes Largos
                </button>
                <button
                  onClick={() => setFilterType('pending_payment')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'pending_payment'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pagos
                </button>
                <button
                  onClick={() => setFilterType('service_down')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'service_down'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Servicios
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const alertConfig = getAlertConfig(alert.type)
            const priorityConfig = getPriorityConfig(alert.priority)

            return (
              <div
                key={alert.id}
                className={`${alertConfig.bgColor} border-2 ${alertConfig.borderColor} rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow`}
              >
                {/* Alert Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{alertConfig.icon}</div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${priorityConfig.color} ${
                            priorityConfig.pulse ? 'animate-pulse' : ''
                          }`}
                        >
                          {priorityConfig.label}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${alertConfig.textColor} bg-white border ${alertConfig.borderColor}`}>
                          {alertConfig.label}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{alert.title}</h3>
                      <p className="text-lg text-gray-700 mt-1">{alert.description}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-600">{getTimeAgo(alert.timestamp)}</p>
                    {mounted && (
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.timestamp.toLocaleTimeString('es-MX')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Alert Details */}
                <div className="bg-white rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Detalles</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(alert.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="text-sm font-medium text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {alert.contactPhone && (
                    <button
                      onClick={() => handleContactDriver(alert.contactPhone, alert.title)}
                      className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <span>📞</span>
                      <span>Contactar</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleViewDetails(alert)}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                  >
                    Ver Detalles
                  </button>
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
                  >
                    Marcar Resuelta
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filteredAlerts.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay alertas activas
            </h3>
            <p className="text-gray-600">
              {filterPriority !== 'all' || filterType !== 'all'
                ? 'No se encontraron alertas con los filtros aplicados'
                : 'Todo está funcionando correctamente'}
            </p>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
