export default function Loader({ fullScreen = false, size = 'md' }) {
  const sizeClass = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' }[size]

  const spinner = (
    <div className={`${sizeClass} animate-spin rounded-full border-4 border-brand-200 border-t-brand-500`} />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
        {spinner}
      </div>
    )
  }

  return <div className="flex justify-center py-12">{spinner}</div>
}
