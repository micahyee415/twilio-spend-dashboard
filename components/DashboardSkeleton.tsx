export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-7 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-16 mb-6" />
          <div className="h-48 bg-gray-100 rounded" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-3 bg-gray-200 rounded w-28 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-16 mb-6" />
          <div className="h-48 bg-gray-100 rounded-full mx-auto w-48" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-3 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-64 mb-6" />
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex justify-between py-3 border-b border-gray-50">
            <div className="h-3 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-200 rounded w-16" />
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-3 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
