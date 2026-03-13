import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from '@/lib/supabase'

const COLORS = ['#FFD711', '#000000', '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63']

export default function ZoneDistributionChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchZoneData()
  }, [])

  const fetchZoneData = async () => {
    try {
      setLoading(true)

      const { data: trips } = await supabase
        .from('trips')
        .select('pickup_address')
        .not('pickup_address', 'is', null)

      // Group by address (extract neighborhood/zone from address)
      const zoneCounts = {}
      ;(trips || []).forEach(trip => {
        const addr = trip.pickup_address || 'Desconocido'
        // Use last part of address as zone approximation
        const parts = addr.split(',').map(s => s.trim())
        const zone = parts.length > 1 ? parts[parts.length - 2] : parts[0]
        const shortZone = zone.length > 25 ? zone.substring(0, 25) + '...' : zone
        zoneCounts[shortZone] = (zoneCounts[shortZone] || 0) + 1
      })

      // Sort by count and take top 6
      const sorted = Object.entries(zoneCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value], i) => ({
          name,
          value,
          color: COLORS[i % COLORS.length],
        }))

      setData(sorted.length > 0 ? sorted : [{ name: 'Sin datos', value: 1, color: '#E0E0E0' }])
    } catch (error) {
      console.error('Error fetching zone data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Zonas</h3>
      
      {loading ? (
        <div className="h-[300px] flex items-center justify-center text-gray-400">Cargando...</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {data.map((zone, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: zone.color }}
                ></div>
                <span className="text-sm text-gray-700">
                  {zone.name}: <span className="font-semibold">{zone.value}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
