export default function UserStatsCard({ title, total, breakdown }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{total.toLocaleString()}</p>
      </div>

      <div className="space-y-4">
        {breakdown.map((item, index) => {
          const percentage = Math.round((item.value / total) * 100)
          
          return (
            <div key={index}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <span className="text-sm font-bold text-gray-900">
                  {item.value.toLocaleString()} ({percentage}%)
                </span>
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
    </div>
  )
}
