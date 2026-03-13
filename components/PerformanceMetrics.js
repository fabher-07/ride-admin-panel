import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function PerformanceMetrics() {
  const [data, setData] = useState([])
  const [avgRating, setAvgRating] = useState(0)
  const [avgWait, setAvgWait] = useState(0)
  const [cancelRate, setCancelRate] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: trips } = await supabase
        .from('trips')
        .select('created_at, status, driver_rating, duration_minutes, accepted_at')
        .gte('created_at', sevenDaysAgo.toISOString())

      const allTrips = trips || []
      const completed = allTrips.filter(t => t.status === 'completed')
      const cancelled = allTrips.filter(t => t.status === 'cancelled')

      // Overall metrics
      const ratings = completed.filter(t => t.driver_rating).map(t => t.driver_rating)
      const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0
      setAvgRating(avg.toFixed(1))

      const waits = completed.filter(t => t.accepted_at && t.created_at).map(t => {
        return (new Date(t.accepted_at) - new Date(t.created_at)) / 60000
      })
      const avgW = waits.length > 0 ? (waits.reduce((a, b) => a + b, 0) / waits.length) : 0
      setAvgWait(avgW.toFixed(1))

      const rate = allTrips.length > 0 ? ((cancelled.length / allTrips.length) * 100) : 0
      setCancelRate(rate.toFixed(1))

      // Group by day of week
      const dayBuckets = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayName = DAY_NAMES[d.getDay()]
        dayBuckets[dayName] = { day: dayName, viajes: 0, cancelaciones: 0 }
      }

      allTrips.forEach(trip => {
        const d = new Date(trip.created_at)
        const dayName = DAY_NAMES[d.getDay()]
        if (dayBuckets[dayName]) {
          dayBuckets[dayName].viajes += 1
          if (trip.status === 'cancelled') dayBuckets[dayName].cancelaciones += 1
        }
      })

      setData(Object.values(dayBuckets))
    } catch (error) {
      console.error('Error fetching performance metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Rendimiento</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Satisfacción Promedio</p>
          <p className="text-2xl font-bold text-green-600">{loading ? '...' : `${avgRating} ⭐`}</p>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Tiempo Espera Promedio</p>
          <p className="text-2xl font-bold text-blue-600">{loading ? '...' : `${avgWait} min`}</p>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Tasa de Cancelación</p>
          <p className="text-2xl font-bold text-orange-600">{loading ? '...' : `${cancelRate}%`}</p>
        </div>
      </div>

      {loading ? (
        <div className="h-[250px] flex items-center justify-center text-gray-400">Cargando...</div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e0e0e0',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="viajes" 
              stroke="#4CAF50" 
              strokeWidth={2}
              name="Viajes"
              dot={{ fill: '#4CAF50', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="cancelaciones" 
              stroke="#FF9800" 
              strokeWidth={2}
              name="Cancelaciones"
              dot={{ fill: '#FF9800', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
