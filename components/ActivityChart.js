import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'

export default function ActivityChart({ dateFilter }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivityData()
  }, [dateFilter])

  const fetchActivityData = async () => {
    try {
      setLoading(true)

      const now = new Date()
      let startDate = new Date()
      if (dateFilter === 'today') {
        startDate.setHours(0, 0, 0, 0)
      } else if (dateFilter === 'week') {
        startDate.setDate(now.getDate() - 7)
      } else {
        startDate.setMonth(now.getMonth() - 1)
      }

      const { data: trips } = await supabase
        .from('trips')
        .select('created_at, status')
        .gte('created_at', startDate.toISOString())

      // Group by 3-hour blocks
      const hourBuckets = {}
      for (let h = 0; h < 24; h += 3) {
        const label = `${String(h).padStart(2, '0')}:00`
        hourBuckets[label] = { hour: label, viajes: 0 }
      }

      ;(trips || []).forEach(trip => {
        const hour = new Date(trip.created_at).getHours()
        const bucket = Math.floor(hour / 3) * 3
        const label = `${String(bucket).padStart(2, '0')}:00`
        if (hourBuckets[label]) {
          hourBuckets[label].viajes += 1
        }
      })

      setData(Object.values(hourBuckets))
    } catch (error) {
      console.error('Error fetching activity data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad por Hora</h3>
      
      {loading ? (
        <div className="h-[300px] flex items-center justify-center text-gray-400">Cargando...</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hour" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e0e0e0',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="viajes" fill="#FFD711" name="Viajes" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
