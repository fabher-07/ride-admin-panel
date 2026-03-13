import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function RevenueWidget() {
  const [revenueBreakdown, setRevenueBreakdown] = useState([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRevenue()
  }, [])

  const fetchRevenue = async () => {
    try {
      setLoading(true)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: trips } = await supabase
        .from('trips')
        .select('total_fare, final_price, payment_method')
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString())

      const allTrips = trips || []

      const cashTrips = allTrips.filter(t => t.payment_method === 'cash')
      const cardTrips = allTrips.filter(t => t.payment_method === 'card')
      const transferTrips = allTrips.filter(t => t.payment_method === 'transfer')

      const getFare = (t) => t.final_price || t.total_fare || 0
      const cashRevenue = cashTrips.reduce((sum, t) => sum + (getFare(t) * 0.15), 0)
      const cardRevenue = cardTrips.reduce((sum, t) => sum + (getFare(t) * 0.15), 0)
      const transferRevenue = transferTrips.reduce((sum, t) => sum + (getFare(t) * 0.15), 0)

      const breakdown = [
        { source: 'Comisiones Efectivo', revenue: Math.round(cashRevenue), trips: cashTrips.length, color: 'bg-green-500' },
        { source: 'Comisiones Tarjeta', revenue: Math.round(cardRevenue), trips: cardTrips.length, color: 'bg-blue-500' },
        { source: 'Comisiones Transferencia', revenue: Math.round(transferRevenue), trips: transferTrips.length, color: 'bg-purple-500' },
      ].filter(item => item.trips > 0)

      const total = breakdown.reduce((sum, item) => sum + item.revenue, 0)
      setRevenueBreakdown(breakdown)
      setTotalRevenue(total)
    } catch (error) {
      console.error('Error fetching revenue:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos por Comisiones (15%)</h3>
      
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-1">Total Mensual</p>
        <p className="text-3xl font-bold text-gray-900">
          {loading ? '...' : `$${totalRevenue.toLocaleString()}`}
        </p>
      </div>

      {loading ? (
        <div className="h-[100px] flex items-center justify-center text-gray-400">Cargando...</div>
      ) : revenueBreakdown.length === 0 ? (
        <p className="text-gray-400 text-center py-4">Sin viajes completados este mes</p>
      ) : (
        <div className="space-y-4">
          {revenueBreakdown.map((item, index) => {
            const percentage = totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0
            
            return (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.source}</p>
                    <p className="text-xs text-gray-500">{item.trips} viajes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ${item.revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{percentage}%</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
