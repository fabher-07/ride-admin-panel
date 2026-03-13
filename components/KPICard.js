export default function KPICard({ title, value, subtitle, icon, trend, color, actionLabel }) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    orange: 'bg-orange-50 border-orange-200',
    red: 'bg-red-50 border-red-200',
  }

  const trendIcons = {
    up: '📈',
    down: '📉',
    neutral: '➖',
    live: '🔴',
  }

  return (
    <div className={`${colorClasses[color]} border-2 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>

      {subtitle && (
        <div className="flex items-center gap-2 text-sm">
          <span>{trendIcons[trend]}</span>
          <span className={`font-medium ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 
            trend === 'live' ? 'text-green-600' :
            'text-gray-600'
          }`}>
            {subtitle}
          </span>
        </div>
      )}

      {trend === 'live' && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-600 font-medium">Actualizando en tiempo real</span>
        </div>
      )}

      {actionLabel && (
        <button className="mt-4 w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
