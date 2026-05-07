function SkeletonBox({ className = '' }) {
  return <div className={`bg-gray-200 animate-pulse rounded-xl ${className}`} />
}

export function RestaurantCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <SkeletonBox className="h-48 rounded-none" />
      <div className="p-4 space-y-3">
        <SkeletonBox className="h-5 w-3/4" />
        <SkeletonBox className="h-4 w-full" />
        <div className="flex gap-4">
          <SkeletonBox className="h-3 w-16" />
          <SkeletonBox className="h-3 w-20" />
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
