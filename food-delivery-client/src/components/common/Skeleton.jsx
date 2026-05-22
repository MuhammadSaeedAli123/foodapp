function SkeletonBox({ className = '' }) {
  return <div className={`bg-gray-200 animate-pulse rounded-xl ${className}`} />
}

export function RestaurantCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
      <SkeletonBox className="h-52 rounded-none" />
      <div className="p-4 space-y-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <SkeletonBox className="h-5 w-3/4" />
          <SkeletonBox className="h-5 w-10 rounded-lg" />
        </div>
        <SkeletonBox className="h-3 w-full" />
        <div className="flex gap-3 pt-3 border-t border-gray-50">
          <SkeletonBox className="h-3 w-16" />
          <SkeletonBox className="h-3 w-24" />
        </div>
      </div>
    </div>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex justify-between">
        <SkeletonBox className="h-5 w-32" />
        <SkeletonBox className="h-5 w-16" />
      </div>
      <SkeletonBox className="h-4 w-48" />
      <SkeletonBox className="h-4 w-full" />
    </div>
  )
}

export function FoodItemSkeleton() {
  return (
    <div className="card p-4 flex gap-4">
      <div className="flex-1 space-y-2">
        <SkeletonBox className="h-5 w-2/3" />
        <SkeletonBox className="h-4 w-full" />
        <SkeletonBox className="h-4 w-1/2" />
      </div>
      <SkeletonBox className="w-24 h-24 shrink-0" />
    </div>
  )
}
