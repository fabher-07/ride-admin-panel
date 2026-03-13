import { useState, useEffect } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export default function GrowthWidget() {
  const [chartData, setChartData] = useState([])
  const [driverGrowth, setDriverGrowth] = useState('0')
  const [passengerGrowth, setPassengerGrowth] = useState('0')
  const [totals, setTotals] = useState({ driversStart: 0, driversEnd: 0, passengersStart: 0, passengersEnd: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGrowth()
  }, [])

  const fetchGrowth = async () => {
    try {
      setLoading(true)

      // Get cumulative counts for each of the last 7 days
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        d.setHours(23, 59, 59, 999)
        days.push(d)
      }

      const data = []
      for (const day of days) {
        const isoEnd = day.toISOString()
        const dayLabel = DAY_LABELS[day.getDay()]

        const { count: driverCount } = await supabase
          .from('drivers')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', isoEnd)

        const { count: passengerCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('user_type', 'passenger')
          .lte('created_at', isoEnd)

        data.push({
          day: dayLabel,
          drivers: driverCount || 0,
          passengers: passengerCount || 0,
        })
      }

      setChartData(data)

      const first = data[0]
      const last = data[data.length - 1]
      setTotals({
        driversStart: first.drivers,
        driversEnd: last.drivers,
        passengersStart: first.passengers,
        passengersEnd: last.passengers,
      })

      const dg = first.drivers > 0 ? (((last.drivers - first.drivers) / first.drivers) * 100).toFixed(1) : '0'
      const pg = first.passengers > 0 ? (((last.passengers - first.passengers) / first.passengers) * 100).toFixed(1) : '0'
      setDriverGrowth(dg)
      setPassengerGrowth(pg)
    } catch (error) {
      console.error('Error fetching growth:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Crecimiento Últimos 7 Días</h3>
        <div className="h-[200px] flex items-center justify-center text-gray-400">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Crecimiento Últimos 7 Días</h3>
      
      <div className="space-y-6">
        {/* Conductores */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Conductores</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${parseFloat(driverGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {parseFloat(driverGrowth) >= 0 ? '+' : ''}{driverGrowth}%
              </span>
              <span className="text-sm text-gray-500">{parseFloat(driverGrowth) >= 0 ? '📈' : '📉'}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="drivers" stroke="#4CAF50" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{totals.driversStart.toLocaleString()}</span>
            <span>{totals.driversEnd.toLocaleString()}</span>
          </div>
        </div>

        {/* Pasajeros */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Pasajeros</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${parseFloat(passengerGrowth) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {parseFloat(passengerGrowth) >= 0 ? '+' : ''}{passengerGrowth}%
              </span>
              <span className="text-sm text-gray-500">{parseFloat(passengerGrowth) >= 0 ? '📈' : '📉'}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="passengers" stroke="#2196F3" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{totals.passengersStart.toLocaleString()}</span>
            <span>{totals.passengersEnd.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
