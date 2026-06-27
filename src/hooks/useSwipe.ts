import { useRef, useCallback } from 'react'

interface SwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
  edgeOnly?: boolean
  edgeSize?: number
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 80, edgeOnly = false, edgeSize = 30 }: SwipeOptions) {
  const startX = useRef(0)
  const startY = useRef(0)
  const locked = useRef<'h' | 'v' | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    locked.current = null
    if (edgeOnly && startX.current > edgeSize) {
      locked.current = 'v'
    }
  }, [edgeOnly, edgeSize])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (locked.current === 'v') return
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return
    if (dx > threshold) onSwipeRight?.()
    else if (dx < -threshold) onSwipeLeft?.()
  }, [threshold, onSwipeLeft, onSwipeRight])

  return { onTouchStart, onTouchEnd }
}
