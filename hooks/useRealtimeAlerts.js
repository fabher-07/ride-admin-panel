import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getActiveAlerts, generateAlerts } from '../services/alertsService'

export const useRealtimeAlerts = () => {
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const channelRef = useRef(null)
  const generationIntervalRef = useRef(null)

  // Cargar alertas iniciales
  const loadAlerts = async () => {
    const { alerts: alertsData, stats: statsData } = await getActiveAlerts()
    if (alertsData) {
      setAlerts(alertsData)
      setStats(statsData)
      setLastUpdate(new Date())
    }
    setLoading(false)
  }

  // Generar nuevas alertas ejecutando las verificaciones
  const triggerAlertGeneration = async () => {
    await generateAlerts()
    await loadAlerts()
  }

  useEffect(() => {
    // Cargar alertas iniciales
    loadAlerts()

    // Generar alertas cada 2 minutos
    generationIntervalRef.current = setInterval(() => {
      triggerAlertGeneration()
    }, 120000) // 2 minutos

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('realtime-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_alerts'
        },
        (payload) => {
          console.log('🔔 Nueva alerta detectada:', payload.new)
          
          // Agregar nueva alerta al estado
          setAlerts(prev => [payload.new, ...prev])
          
          // Actualizar estadísticas
          setStats(prev => ({
            total: prev.total + 1,
            critical: prev.critical + (payload.new.priority === 'critical' ? 1 : 0),
            high: prev.high + (payload.new.priority === 'high' ? 1 : 0),
            medium: prev.medium + (payload.new.priority === 'medium' ? 1 : 0),
            low: prev.low + (payload.new.priority === 'low' ? 1 : 0)
          }))
          
          setLastUpdate(new Date())
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_alerts'
        },
        (payload) => {
          console.log('📝 Alerta actualizada:', payload.new)
          
          // Actualizar alerta en el estado
          setAlerts(prev => prev.map(alert => 
            alert.id === payload.new.id ? payload.new : alert
          ))
          
          // Si la alerta fue resuelta, removerla de la lista activa
          if (payload.new.status !== 'active') {
            setAlerts(prev => prev.filter(alert => alert.id !== payload.new.id))
            
            // Actualizar estadísticas
            const oldAlert = alerts.find(a => a.id === payload.new.id)
            if (oldAlert) {
              setStats(prev => ({
                total: Math.max(0, prev.total - 1),
                critical: Math.max(0, prev.critical - (oldAlert.priority === 'critical' ? 1 : 0)),
                high: Math.max(0, prev.high - (oldAlert.priority === 'high' ? 1 : 0)),
                medium: Math.max(0, prev.medium - (oldAlert.priority === 'medium' ? 1 : 0)),
                low: Math.max(0, prev.low - (oldAlert.priority === 'low' ? 1 : 0))
              }))
            }
          }
          
          setLastUpdate(new Date())
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      if (generationIntervalRef.current) {
        clearInterval(generationIntervalRef.current)
      }
    }
  }, [])

  const refreshAlerts = async () => {
    setLoading(true)
    await loadAlerts()
  }

  const forceGeneration = async () => {
    setLoading(true)
    await triggerAlertGeneration()
  }

  return {
    alerts,
    stats,
    loading,
    lastUpdate,
    refreshAlerts,
    forceGeneration
  }
}
