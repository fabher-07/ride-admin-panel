import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/DashboardLayout'
import KPICard from '@/components/KPICard'
import UserStatsCard from '@/components/UserStatsCard'
import ActivityChart from '@/components/ActivityChart'
import ZoneDistributionChart from '@/components/ZoneDistributionChart'
import PerformanceMetrics from '@/components/PerformanceMetrics'
import RevenueWidget from '@/components/RevenueWidget'
import GrowthWidget from '@/components/GrowthWidget'
import AlertsWidget from '@/components/AlertsWidget'

export default function Dashboard() {
  const [dateFilter, setDateFilter] = useState('today')
  const [refreshKey, setRefreshKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [kpiData, setKpiData] = useState({
    activeTrips: 0,
    connectedDrivers: 0,
    totalDrivers: 0,
    todayRevenue: 0,
    yesterdayRevenue: 0,
    pendingApprovals: 0,
  })

  const [userStats, setUserStats] = useState({
    totalDrivers: 0,
    totalPassengers: 0,
    driversByPlan: {
      weekly: 0,
      monthly: 0,
      annual: 0,
    },
    passengers: {
      activeToday: 0,
      newToday: 0,
      traveledToday: 0,
    },
  })

  // Fetch dashboard statistics from Supabase
  const fetchDashboardStats = async () => {
    try {
      setLoading(true)

      // Fetch active trips count
      const { count: activeTripsCount } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .in('status', ['requested', 'accepted', 'in_progress'])

      // Fetch driver IDs that still have a user record
      const { data: driverRows } = await supabase.from('drivers').select('id, status')
      const validDriverIds = driverRows
        ?.filter(d => d.id) // keep all; we validate existence via users join below
        .map(d => d.id) || []

      // Validate which driver IDs still exist in users table
      let validDriverStatuses = {}
      if (validDriverIds.length > 0) {
        const { data: userRows } = await supabase
          .from('users')
          .select('id')
          .in('id', validDriverIds)
        const validIds = new Set(userRows?.map(u => u.id) || [])
        validDriverStatuses = driverRows
          ?.filter(d => validIds.has(d.id))
          .reduce((acc, d) => {
            acc.total++
            if (d.status === 'approved') acc.approved++
            if (d.status === 'pending') acc.pending++
            return acc
          }, { total: 0, approved: 0, pending: 0 }) || { total: 0, approved: 0, pending: 0 }
      }

      const totalDriversCount = validDriverStatuses.total
      const connectedDriversCount = validDriverStatuses.approved
      const pendingApprovalsCount = validDriverStatuses.pending

      // Fetch total passengers
      const { count: totalPassengersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'passenger')

      // Fetch today's revenue from completed trips
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data: todayTrips } = await supabase
        .from('trips')
        .select('total_fare')
        .eq('status', 'completed')
        .gte('created_at', today.toISOString())

      const todayRevenue = todayTrips?.reduce((sum, trip) => sum + (trip.total_fare || 0), 0) || 0

      // Fetch yesterday's revenue
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const { data: yesterdayTrips } = await supabase
        .from('trips')
        .select('total_fare')
        .eq('status', 'completed')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())

      const yesterdayRevenue = yesterdayTrips?.reduce((sum, trip) => sum + (trip.total_fare || 0), 0) || 0

      // Fetch new passengers today
      const { count: newPassengersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('user_type', 'passenger')
        .gte('created_at', today.toISOString())

      // Update state
      setKpiData({
        activeTrips: activeTripsCount || 0,
        connectedDrivers: connectedDriversCount || 0,
        totalDrivers: totalDriversCount || 0,
        todayRevenue: todayRevenue,
        yesterdayRevenue: yesterdayRevenue,
        pendingApprovals: pendingApprovalsCount || 0,
      })

      setUserStats({
        totalDrivers: totalDriversCount || 0,
        totalPassengers: totalPassengersCount || 0,
        driversByPlan: {
          weekly: 0,
          monthly: 0,
          annual: 0,
        },
        passengers: {
          activeToday: totalPassengersCount || 0,
          newToday: newPassengersCount || 0,
          traveledToday: todayTrips?.length || 0,
        },
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchDashboardStats()

    // Subscribe to real-time changes
    const tripsSubscription = supabase
      .channel('dashboard_trips_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trips'
      }, () => {
        fetchDashboardStats()
      })
      .subscribe()

    const driversSubscription = supabase
      .channel('dashboard_drivers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drivers'
      }, () => {
        fetchDashboardStats()
      })
      .subscribe()

    const usersSubscription = supabase
      .channel('dashboard_users_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: 'user_type=eq.passenger'
      }, () => {
        fetchDashboardStats()
      })
      .subscribe()

    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1)
      fetchDashboardStats()
    }, 30000)

    return () => {
      tripsSubscription.unsubscribe()
      driversSubscription.unsubscribe()
      usersSubscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const handleDateFilterChange = (filter) => {
    setDateFilter(filter)
    fetchDashboardStats()
  }

  return (
    <>
      <Head>
        <title>RIDE Admin - Tablero General</title>
        <meta name="description" content="Panel de administración RIDE" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <DashboardLayout>
        {/* Header con filtros */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tablero General</h1>
              {mounted && (
                <p className="text-gray-600 mt-1">
                  Última actualización: {new Date().toLocaleTimeString('es-MX')}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleDateFilterChange('today')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'today'
                    ? 'bg-primary text-black'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => handleDateFilterChange('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'week'
                    ? 'bg-primary text-black'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Esta Semana
              </button>
              <button
                onClick={() => handleDateFilterChange('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'month'
                    ? 'bg-primary text-black'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Este Mes
              </button>
            </div>
          </div>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Viajes Activos"
            value={kpiData.activeTrips}
            icon="🚕"
            trend="live"
            color="green"
          />
          <KPICard
            title="Taxis Conectados"
            value={kpiData.connectedDrivers}
            subtitle={`${Math.round((kpiData.connectedDrivers / kpiData.totalDrivers) * 100)}% del total`}
            icon="📡"
            trend="up"
            color="blue"
          />
          <KPICard
            title="Ingresos Hoy"
            value={`$${kpiData.todayRevenue.toLocaleString()}`}
            subtitle={`${kpiData.todayRevenue > kpiData.yesterdayRevenue ? '+' : ''}${Math.round(((kpiData.todayRevenue - kpiData.yesterdayRevenue) / kpiData.yesterdayRevenue) * 100)}% vs ayer`}
            icon="💰"
            trend={kpiData.todayRevenue > kpiData.yesterdayRevenue ? 'up' : 'down'}
            color="yellow"
          />
          <KPICard
            title="Aprobaciones Pendientes"
            value={kpiData.pendingApprovals}
            icon="⏳"
            trend="neutral"
            color="orange"
            actionLabel="Revisar"
          />
        </div>

        {/* Estadísticas de Usuarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <UserStatsCard
            title="Conductores"
            total={userStats.totalDrivers}
            breakdown={[
              { label: 'Plan Semanal', value: userStats.driversByPlan.weekly, color: 'bg-blue-500' },
              { label: 'Plan Mensual', value: userStats.driversByPlan.monthly, color: 'bg-green-500' },
              { label: 'Plan Anual', value: userStats.driversByPlan.annual, color: 'bg-purple-500' },
            ]}
          />
          <UserStatsCard
            title="Pasajeros"
            total={userStats.totalPassengers}
            breakdown={[
              { label: 'Activos hoy', value: userStats.passengers.activeToday, color: 'bg-green-500' },
              { label: 'Nuevos hoy', value: userStats.passengers.newToday, color: 'bg-blue-500' },
              { label: 'Viajaron hoy', value: userStats.passengers.traveledToday, color: 'bg-yellow-500' },
            ]}
          />
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ActivityChart dateFilter={dateFilter} />
          <ZoneDistributionChart />
        </div>

        <div className="mb-8">
          <PerformanceMetrics />
        </div>

        {/* Widgets Extras */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueWidget />
          <GrowthWidget />
        </div>
      </DashboardLayout>
    </>
  )
}
